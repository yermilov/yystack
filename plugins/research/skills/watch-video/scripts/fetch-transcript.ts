#!/usr/bin/env bun
/**
 * fetch-transcript — fetch and clean a YouTube transcript with yt-dlp.
 *
 *   bun run "SKILLDIR/scripts/fetch-transcript.ts" <url> [--with-timestamps] [--output FILE]
 *                                                  [--sub-lang 'de'] [--keep-workdir]
 *   bun run "SKILLDIR/scripts/fetch-transcript.ts" --vtt <captions.vtt> [--with-timestamps] [--output FILE]
 *     (offline: clean a VTT you already have — whisper's --output-vtt, or captions saved earlier; no
 *     yt-dlp, no network; writes {transcript, word_count} to stdout or --output. CRLF line ends, cue
 *     times without hours, and comma milliseconds are accepted)
 *
 * YouTube auto-captions ship as VTT cues with a rolling display window: each cue repeats most of the
 * previous one as new words slide in, so naive concatenation duplicates every phrase 2-3x. This:
 *   1. reads the video's metadata with yt-dlp (no video download) and picks ONE caption track:
 *      human captions first, then the auto-captions' original (never a machine translation when the
 *      original exists), in the video's own language, else English;
 *   2. downloads only that track, parses its cues with timing,
 *   3. merges the rolling-window overlap into clean prose,
 *   4. optionally inserts [MM:SS] markers every ~30 s so answers can cite timestamps.
 *
 * Entities: numeric ones and the common named ones are decoded; a rarer named entity (e.g. &eacute;)
 * is left literal — auto-captions practically never carry one, and a literal is safer than a guess.
 *
 * Output: JSON with id, title, channel, duration_seconds, duration_string, url, language,
 * caption_source ("manual:<lang>" or "auto:<lang>"), transcript, word_count — to stdout, or to --output.
 * --sub-lang replaces the language order: comma-separated regexes tried in turn (e.g. 'de' or 'pt.*,en').
 *
 * Exit 0 = transcript written, 2 = no captions in the wanted language(s) (fall back to local
 * transcription or to Gemini alone), 1 = yt-dlp missing or failed (its stderr is printed), 3 = bad
 * arguments, 4 = a --vtt file with text but no cue it could read (never reported as an empty transcript).
 */
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'

const args = process.argv.slice(2)
if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  console.log(readFileSync(import.meta.path, 'utf8').replace(/^#!.*\n/, '').split('*/')[0].replace(/^\/\*\*?|^ \* ?/gm, ''))
  process.exit(args.length === 0 ? 3 : 0)
}
const flag = (n: string) => args.includes(n)
const opt = (n: string, d: string) => {
  const i = args.indexOf(n)
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : d
}
const url = args.find((a, i) => !a.startsWith('--') && !['--output', '--sub-lang', '--vtt'].includes(args[i - 1] ?? ''))
const vttFile = opt('--vtt', '')
if (!url && !vttFile) { console.error('fetch-transcript: give a YouTube URL or video id'); process.exit(3) }
const withTimestamps = flag('--with-timestamps')
const output = opt('--output', '-')
const subLang = opt('--sub-lang', '')
// Validate the user's patterns before any network call, so a typo is exit 3 whatever yt-dlp would say.
for (const p of subLang.split(',').map((x) => x.trim()).filter(Boolean)) {
  try { new RegExp(p) } catch { console.error(`fetch-transcript: --sub-lang entry '${p}' is not a valid regex`); process.exit(3) }
}

function findYtDlp(): string {
  for (const c of ['yt-dlp', join(homedir(), '.local/bin/yt-dlp')]) {
    if (Bun.which(c) || existsSync(c)) return c
  }
  console.error('fetch-transcript: yt-dlp not found on PATH or in ~/.local/bin — install it (e.g. `pipx install yt-dlp` or `brew install yt-dlp`) and re-run.')
  process.exit(1)
}

type Cue = [start: number, end: number, text: string]
// WebVTT allows the hours to be omitted (mm:ss.ttt); a comma before the milliseconds is SRT style,
// common in files saved as .vtt anyway. Both are read rather than silently yielding no cues.
const TIMING = /(?:(\d+):)?(\d+):(\d+)[.,](\d+)\s*-->\s*(?:(\d+):)?(\d+):(\d+)[.,](\d+)/
const secs = (h: string | undefined, m: string, s: string, ms: string) =>
  +(h ?? 0) * 3600 + +m * 60 + +s + +`0.${ms}`
// Decodes every NUMERIC entity (decimal and hex) and the common NAMED ones auto-captions actually emit.
// This is NOT a full HTML5 decoder (unlike Python's html.unescape): an unlisted named entity such as
// &eacute; is left as literal text rather than guessed. &amp; goes last so "&amp;lt;" stays "&lt;".
const NAMED: Record<string, string> = { lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0', hellip: '…', mdash: '—', ndash: '–', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”' }
// An out-of-range or surrogate code point becomes U+FFFD (as Python does) instead of throwing — one
// malformed cue must not lose the whole transcript.
const cp = (n: number) => (Number.isInteger(n) && n > 0 && n <= 0x10ffff && !(n >= 0xd800 && n <= 0xdfff) ? String.fromCodePoint(n) : '\ufffd')
const unescape = (t: string) =>
  t.replace(/&#x([0-9a-f]+);/gi, (_, h) => cp(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => cp(+d))
    .replace(/&([a-z]+);/gi, (m, n) => (n.toLowerCase() === 'amp' ? m : NAMED[n.toLowerCase()] ?? m))
    .replace(/&amp;/gi, '&')

function parseVtt(content: string): Cue[] {
  const cues: Cue[] = []
  for (const block of content.replace(/\r\n?/g, '\n').split(/\n\n+/)) {
    const m = block.match(TIMING)
    if (!m) continue
    const lines = block.split('\n')
    const at = lines.findIndex((l) => TIMING.test(l))
    let text = lines.slice(at + 1).join(' ')
    text = unescape(text.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim()
    if (text) cues.push([secs(m[1], m[2], m[3], m[4]), secs(m[5], m[6], m[7], m[8]), text])
  }
  return cues
}

/** Merge the rolling caption window into prose. For each cue, keep only what extends past the
 *  longest suffix/prefix overlap with the text so far — cut on a word boundary on both sides, never
 *  mid-word. Each appended chunk keeps ITS OWN cue start, so [MM:SS] markers can land anywhere in a
 *  long run of overlapping cues (YouTube auto-captions are one unbroken run for the whole video). */
type Piece = [start: number, text: string]
function mergeRollingOverlap(cues: Cue[]): Piece[] {
  const pieces: Piece[] = []
  const alnum = /[\p{L}\p{N}]/u
  let tail = ''
  for (const [start, , text] of cues) {
    let overlap = 0
    for (let k = Math.min(tail.length, text.length); k > 0; k--) {
      if (!tail.endsWith(text.slice(0, k))) continue
      if (k < text.length && alnum.test(text[k - 1]) && alnum.test(text[k])) continue
      overlap = k
      break
    }
    // No overlap starts a new sentence run, so it needs a separator; an overlapping cue continues
    // the run and its remainder already carries whatever separator the captions had.
    const added = overlap > 0 ? text.slice(overlap) : (tail ? ' ' : '') + text
    if (!added.trim()) continue
    pieces.push([start, added])
    tail = overlap > 0 ? tail + added : text
  }
  return pieces
}

/** Only YouTube's rolling auto-captions repeat the previous cue's words; their raw VTT carries inline
 *  word timings (`<00:00:01.000>`) — a `<c>` span alone is styling any caption file may use. Human captions and whisper output do not overlap,
 *  so the merge would delete words that really are repeated across a cue boundary ("…I said yes" +
 *  "yes is the only answer"). Those cues are joined as they are. */
const isRolling = (raw: string) => /<\d{2}:\d{2}:\d{2}\.\d{3}>/.test(raw)
// 'auto' / 'manual' come from the chosen YouTube track; 'detect' is a --vtt file of unknown origin.
function toPieces(raw: string, kind: 'auto' | 'manual' | 'detect'): Piece[] {
  const cues = parseVtt(raw)
  if (kind === 'auto' || (kind === 'detect' && isRolling(raw))) return mergeRollingOverlap(cues)
  return cues.map(([start, , text], i) => [start, (i ? ' ' : '') + text] as Piece)
}

const stamp = (s: number) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = Math.floor(s % 60)
  const p = (n: number) => String(n).padStart(2, '0')
  return h ? `${h}:${p(m)}:${p(x)}` : `${p(m)}:${p(x)}`
}

function assemble(pieces: Piece[]): string {
  let out = ''
  let last = -1e9
  for (const [start, text] of pieces) {
    if (withTimestamps && start - last >= 30) {
      out += `${out ? ' ' : ''}[${stamp(start)}] ${text.trimStart()}`
      last = start
    } else out += text
  }
  return out.replace(/\s+/g, ' ').trim()
}

if (vttFile) {
  if (!existsSync(vttFile)) { console.error(`fetch-transcript: VTT not found: ${vttFile}`); process.exit(3) }
  const raw = readFileSync(vttFile, 'utf8')
  if (parseVtt(raw).length === 0 && raw.replace(/^\uFEFF?WEBVTT[^\n]*/, '').trim()) {
    console.error(`fetch-transcript: no cue in ${vttFile} could be read (expected "00:00:01.000 --> 00:00:02.000" timing lines) — it is not an empty transcript`)
    process.exit(4)
  }
  const body = assemble(toPieces(raw, 'detect'))
  const res = { transcript: body, word_count: body.split(/\s+/).filter(Boolean).length }
  if (output === '-') console.log(JSON.stringify(res))
  else writeFileSync(output, JSON.stringify(res, null, 2))
  process.exit(0)
}
type Track = { kind: 'manual' | 'auto'; key: string }

/** Pick ONE caption track, so yt-dlp downloads one file instead of every matching language (each extra
 *  track is a request, and a 429 on any of them fails the whole run). Human captions beat auto ones;
 *  among auto ones the ASR original (`<lang>-orig`, or the bare `<lang>` when the video's language is
 *  known) beats a machine translation. --sub-lang overrides the language order with yt-dlp-style
 *  regexes, comma-separated, tried in order. */
function pickTrack(meta: Record<string, any>): Track | undefined {
  const manual = Object.keys(meta.subtitles ?? {}).filter((k) => k !== 'live_chat')
  const auto = Object.keys(meta.automatic_captions ?? {})
  const orig: string | undefined = meta.language ?? auto.find((k) => k.endsWith('-orig'))?.slice(0, -5)
  // Metadata is matched literally (it is data, not a pattern); only --sub-lang entries are regexes.
  const lit = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const wanted = subLang
    ? subLang.split(',').map((p) => p.trim()).filter(Boolean)
    : ([orig, 'en'].filter(Boolean) as string[]).map(lit)
  for (const p of wanted) {
    const re = new RegExp(`^(?:${p})$`) // user patterns were validated at startup; metadata is escaped
    const m = manual.filter((k) => re.test(k)).sort((a, b) => a.length - b.length)[0]
    if (m) return { kind: 'manual', key: m }
    const asr = auto.find((k) => k.endsWith('-orig') && re.test(k.slice(0, -5)))
    if (asr) return { kind: 'auto', key: asr }
    // A bare key is the original only when it IS the video's language; otherwise it is a translation,
    // still better than nothing when the user asked for that language.
    const bare = auto.filter((k) => re.test(k)).sort((a, b) => a.length - b.length)[0]
    if (bare) return { kind: 'auto', key: bare }
  }
  return undefined
}

function run(work: string): number {
  // 1. Metadata only — one request, which also lists every caption track.
  const info = Bun.spawnSync([ytDlp, '--skip-download', '--write-info-json', '--no-playlist', '--no-warnings',
    '-o', '%(id)s.%(ext)s', url!], { cwd: work })
  const infoFile = readdirSync(work).find((f) => f.endsWith('.info.json'))
  if (info.exitCode !== 0 || !infoFile) {
    console.error(`fetch-transcript: yt-dlp failed: ${info.stderr.toString().trim() || 'no info.json'}`)
    return 1
  }
  const meta = JSON.parse(readFileSync(join(work, infoFile), 'utf8'))
  const track = pickTrack(meta)
  if (!track) {
    const have = [...Object.keys(meta.subtitles ?? {}), ...Object.keys(meta.automatic_captions ?? {})]
    console.error(`fetch-transcript: no captions in ${subLang || 'the video\'s language or English'} for this video` +
      (have.length ? ` (it has ${have.length} other track(s) — try --sub-lang)` : '') +
      ' — fall back to local transcription or Gemini alone.')
    return 2
  }
  // 2. Exactly that one track, reusing the metadata instead of fetching the page again.
  const esc = track.key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const dl = Bun.spawnSync([ytDlp, '--load-info-json', infoFile, '--skip-download',
    track.kind === 'manual' ? '--write-sub' : '--write-auto-sub', '--sub-lang', `^${esc}$`, '--sub-format', 'vtt',
    '--no-warnings', '-o', '%(id)s.%(ext)s'], { cwd: work })
  const vtt = readdirSync(work).find((f) => f.endsWith('.vtt'))
  if (!vtt) {
    console.error(`fetch-transcript: yt-dlp could not fetch the ${track.kind} track '${track.key}': ${dl.stderr.toString().trim()}`)
    return 1
  }
  const body = assemble(toPieces(readFileSync(join(work, vtt), 'utf8'), track.kind))
  const out = {
    id: meta.id, title: meta.title, channel: meta.uploader ?? meta.channel,
    duration_seconds: meta.duration, duration_string: meta.duration_string,
    url: meta.webpage_url ?? url,
    language: track.key.replace(/-orig$/, ''),
    caption_source: `${track.kind}:${track.key}`, transcript: body, word_count: body.split(/\s+/).filter(Boolean).length,
  }
  if (output === '-') console.log(JSON.stringify(out))
  else writeFileSync(output, JSON.stringify(out, null, 2))
  return 0
}

// process.exit inside a try skips its finally under Bun, so run() returns a code and cleanup happens here.
const ytDlp = findYtDlp()
const work = mkdtempSync(join(tmpdir(), 'fetch_transcript_'))
let code = 1
try {
  code = run(work)
} finally {
  if (!flag('--keep-workdir')) rmSync(work, { recursive: true, force: true })
  else console.error(`fetch-transcript: kept the work directory: ${work}`)
}
process.exit(code)
