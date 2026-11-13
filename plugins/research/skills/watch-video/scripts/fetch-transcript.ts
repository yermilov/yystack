#!/usr/bin/env bun
/**
 * fetch-transcript — fetch and clean a YouTube transcript with yt-dlp.
 *
 *   bun run "SKILLDIR/scripts/fetch-transcript.ts" <url> [--with-timestamps] [--output FILE]
 *                                                  [--sub-lang 'en.*,en'] [--keep-workdir]
 *   bun run "SKILLDIR/scripts/fetch-transcript.ts" --vtt <captions.vtt> [--with-timestamps]
 *     (offline: clean a VTT you already have — no yt-dlp, no network; prints {transcript, word_count})
 *
 * YouTube auto-captions ship as VTT cues with a rolling display window: each cue repeats most of the
 * previous one as new words slide in, so naive concatenation duplicates every phrase 2-3x. This:
 *   1. runs yt-dlp for metadata + auto-subs (no video download),
 *   2. parses the VTT cues with timing,
 *   3. merges the rolling-window overlap into clean prose,
 *   4. optionally inserts [MM:SS] markers every ~30 s so answers can cite timestamps.
 *
 * Entities: numeric ones and the common named ones are decoded; a rarer named entity (e.g. &eacute;)
 * is left literal — auto-captions practically never carry one, and a literal is safer than a guess.
 *
 * Output: JSON with id, title, channel, duration_seconds, duration_string, url, language,
 * caption_source, transcript, word_count — to stdout, or to --output.
 * --sub-lang is passed to yt-dlp as-is (e.g. 'de.*,de' for German).
 *
 * Exit 0 = transcript written, 2 = the video has NO auto-captions (fall back to local transcription or
 * to Gemini alone), 1 = yt-dlp missing or failed (its stderr is printed), 3 = bad arguments.
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
const subLang = opt('--sub-lang', 'en.*,en')

function findYtDlp(): string {
  for (const c of ['yt-dlp', join(homedir(), '.local/bin/yt-dlp')]) {
    if (Bun.which(c) || existsSync(c)) return c
  }
  console.error('fetch-transcript: yt-dlp not found on PATH or in ~/.local/bin — install it (e.g. `pipx install yt-dlp` or `brew install yt-dlp`) and re-run.')
  process.exit(1)
}

type Cue = [start: number, end: number, text: string]
const TIMING = /(\d+):(\d+):(\d+)\.(\d+)\s*-->\s*(\d+):(\d+):(\d+)\.(\d+)/
const secs = (h: string, m: string, s: string, ms: string) => +h * 3600 + +m * 60 + +s + +ms / 1000
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
  for (const block of content.split(/\n\n+/)) {
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

/** For each cue, append only what extends past the longest suffix/prefix overlap with the previous
 *  merged text — cut on a word boundary on both sides, never mid-word. */
function mergeRollingOverlap(cues: Cue[]): Cue[] {
  if (!cues.length) return []
  const merged: Cue[] = [cues[0]]
  const alnum = /[\p{L}\p{N}]/u
  for (const [start, end, text] of cues.slice(1)) {
    const [ps, , pt] = merged[merged.length - 1]
    if (text === pt) { merged[merged.length - 1] = [ps, end, pt]; continue }
    let overlap = 0
    for (let k = Math.min(pt.length, text.length); k > 0; k--) {
      if (!pt.endsWith(text.slice(0, k))) continue
      if (k < text.length && alnum.test(text[k - 1]) && alnum.test(text[k])) continue
      overlap = k
      break
    }
    if (overlap > 0) merged[merged.length - 1] = [ps, end, pt + text.slice(overlap)]
    else merged.push([start, end, text])
  }
  return merged
}

const stamp = (s: number) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = Math.floor(s % 60)
  const p = (n: number) => String(n).padStart(2, '0')
  return h ? `${h}:${p(m)}:${p(x)}` : `${p(m)}:${p(x)}`
}

function assemble(segs: Cue[]): string {
  if (!withTimestamps) return segs.map((s) => s[2]).join(' ')
  const out: string[] = []
  let last = -1e9
  for (const [start, , text] of segs) {
    if (start - last >= 30) { out.push(`[${stamp(start)}] ${text}`); last = start } else out.push(text)
  }
  return out.join(' ')
}

if (vttFile) {
  const body = assemble(mergeRollingOverlap(parseVtt(readFileSync(vttFile, 'utf8'))))
  console.log(JSON.stringify({ transcript: body, word_count: body.split(/\s+/).filter(Boolean).length }))
  process.exit(0)
}
function run(work: string): number {
  const r = Bun.spawnSync([ytDlp, '--skip-download', '--write-auto-sub', '--sub-lang', subLang, '--sub-format', 'vtt',
    '--write-info-json', '--no-playlist', '--no-warnings', '-o', '%(id)s.%(ext)s', url!], { cwd: work })
  if (r.exitCode !== 0) { console.error(`fetch-transcript: yt-dlp failed: ${r.stderr.toString().trim()}`); return 1 }
  const files = readdirSync(work)
  const info = files.find((f) => f.endsWith('.info.json'))
  if (!info) { console.error('fetch-transcript: yt-dlp produced no info.json'); return 1 }
  const meta = JSON.parse(readFileSync(join(work, info), 'utf8'))
  const vtt = files.filter((f) => f.endsWith('.vtt')).sort()[0]
  if (!vtt) {
    console.error('fetch-transcript: no auto-captions for this video — fall back to local transcription or Gemini alone.')
    return 2
  }
  const body = assemble(mergeRollingOverlap(parseVtt(readFileSync(join(work, vtt), 'utf8'))))
  const parts = vtt.split('.')
  const out = {
    id: meta.id, title: meta.title, channel: meta.uploader ?? meta.channel,
    duration_seconds: meta.duration, duration_string: meta.duration_string,
    url: meta.webpage_url ?? url,
    language: meta.language ?? (parts.length >= 3 ? parts[parts.length - 2] : undefined) ?? 'en',
    caption_source: vtt, transcript: body, word_count: body.split(/\s+/).filter(Boolean).length,
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
}
process.exit(code)
