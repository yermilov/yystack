#!/usr/bin/env bun
/**
 * frames — the mechanical half of watching a local video file: is there anything to transcribe, and
 * a frame sweep scaled to the clip's length.
 *
 *   bun run "SKILLDIR/scripts/frames.ts" <clip> [--out DIR] [--frames N] [--audio-only]
 *   bun run "SKILLDIR/scripts/frames.ts" <clip> --at <seconds> [--out DIR]   (one full-size frame)
 *
 * 1. Audio verdict, from ffprobe + ffmpeg's volumedetect on the first audio stream:
 *      none     — no audio stream: skip transcription
 *      silent   — max_volume at or below -80 dB: digital silence, or audio too quiet to measure (an AAC
 *                 track of true silence and one of speech attenuated past the encoder's floor both
 *                 read about -91 dB). If whisper is installed, transcribe with the level raised (-af volume=80dB): quiet
 *                 speech comes back intact, true silence yields a lone filler word
 *      faint    — max_volume below -30 dB (a hum, faint background): transcribe, but read the result
 *                 with suspicion — whisper can invent text on it
 *      speech?  — louder: transcribe (speech usually peaks within a few dB of 0)
 * 2. Frames: about N (default 40) evenly spaced frames, 600 px tall, written as g_001.jpg … and tiled
 *    five to a strip as st_1.jpg … so a strip can be read at once. Over 20 minutes it extracts no
 *    sweep and says so: read the transcript, then pull single frames with --at.
 *
 * Writes into --out (default: the current directory), which must not already hold a sweep's g_/st_ files.
 * max_volume_db / mean_volume_db are null for pure digital zero (-inf dB).
 * Prints one JSON line: {duration_seconds,
 * audio: {verdict, max_volume_db, mean_volume_db}, frames, strips, note}.
 *
 * Exit 0 = done, 1 = ffmpeg/ffprobe missing or failed (its stderr is printed), 3 = bad arguments.
 */
import { mkdirSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

const args = process.argv.slice(2)
if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  console.log(
    (await Bun.file(import.meta.path).text()).replace(/^#!.*\n/, '').split('*/')[0].replace(/^\/\*\*?|^ \* ?/gm, ''),
  )
  process.exit(args.length === 0 ? 3 : 0)
}
const VALUE_FLAGS = ['--out', '--frames', '--at']
const opt = (n: string): string | undefined => {
  const i = args.indexOf(n)
  if (i < 0) return undefined
  const v = args[i + 1]
  if (v === undefined || v.startsWith('--')) fail(3, `${n} needs a value`)
  return v
}
function fail(code: number, msg: string): never {
  console.error(`frames: ${msg}`)
  process.exit(code)
}
const clip = args.find((a, i) => !a.startsWith('--') && !VALUE_FLAGS.includes(args[i - 1] ?? ''))
if (!clip) fail(3, 'give a video file')
if (!(await Bun.file(clip).exists())) fail(3, `no such file: ${clip}`)
const out = resolve(opt('--out') ?? '.')
const wanted = Number(opt('--frames') ?? 40)
if (!Number.isInteger(wanted) || wanted < 1) fail(3, '--frames must be a positive integer')
const at = opt('--at')
if (at !== undefined && !(Number(at) >= 0)) fail(3, '--at must be a time in seconds')
mkdirSync(out, { recursive: true })
// Frames are listed back from the directory, so a previous sweep's files would be counted as this one's.
if (at === undefined && !args.includes('--audio-only') && readdirSync(out).some((f) => /^(g_\d{3}|st_\d+)\.jpg$/.test(f)))
  fail(3, `${out} already holds g_*.jpg / st_*.jpg from an earlier sweep — use a fresh --out`)

for (const tool of ['ffmpeg', 'ffprobe']) if (!Bun.which(tool)) fail(1, `${tool} is not installed (it ships with ffmpeg)`)

function run(cmd: string[]): { ok: boolean; stdout: string; stderr: string } {
  const p = Bun.spawnSync(cmd, { stdout: 'pipe', stderr: 'pipe' })
  return { ok: p.exitCode === 0, stdout: p.stdout.toString(), stderr: p.stderr.toString() }
}
function must(cmd: string[]): { stdout: string; stderr: string } {
  const r = run(cmd)
  if (!r.ok) fail(1, `${cmd[0]} failed:\n${r.stderr.trim().split('\n').slice(-5).join('\n')}`)
  return r
}

if (at !== undefined) {
  const file = join(out, `detail_${String(at).replace('.', '_')}s.jpg`)
  must(['ffmpeg', '-v', 'error', '-y', '-ss', at, '-i', clip, '-frames:v', '1', '-q:v', '2', file])
  console.log(JSON.stringify({ frame: file }))
  process.exit(0)
}

const duration = Number(must(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', clip]).stdout.trim())
if (!(duration > 0)) fail(1, `ffprobe reported no duration for ${clip}`)

// 1. Audio verdict
const hasAudio = must(['ffprobe', '-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=index', '-of', 'csv=p=0', clip]).stdout.trim() !== ''
let audio: { verdict: string; max_volume_db: number | null; mean_volume_db: number | null } = { verdict: 'none', max_volume_db: null, mean_volume_db: null }
if (hasAudio) {
  const vd = must(['ffmpeg', '-nostats', '-i', clip, '-map', '0:a:0', '-af', 'volumedetect', '-f', 'null', '-']).stderr
  const num = (k: string) => {
    const m = vd.match(new RegExp(`${k}:\\s*(-?[\\d.]+|-inf) dB`))
    return m ? (m[1] === '-inf' ? -Infinity : Number(m[1])) : null
  }
  const max = num('max_volume')
  const mean = num('mean_volume')
  if (max === null) fail(1, 'volumedetect printed no max_volume')
  // -inf dB (pure digital zero) is reported as null: JSON has no infinity.
  const finite = (v: number | null) => (v !== null && Number.isFinite(v) ? v : null)
  audio = { verdict: max <= -80 ? 'silent' : 'speech?', max_volume_db: finite(max), mean_volume_db: finite(mean) }
}
if (audio.verdict === 'speech?' && audio.max_volume_db !== null && audio.max_volume_db < -30)
  audio.verdict = 'faint'
if (args.includes('--audio-only')) {
  console.log(JSON.stringify({ duration_seconds: duration, audio }))
  process.exit(0)
}

// 2. Frames
let frames: string[] = []
let strips: string[] = []
let note = ''
if (duration > 20 * 60) {
  note = 'over 20 minutes: no sweep — read the transcript, then pull single frames with --at <seconds>'
} else {
  const fps = (wanted / Math.max(duration, 1)).toFixed(4)
  must(['ffmpeg', '-v', 'error', '-y', '-i', clip, '-vf', `fps=${fps},scale=-1:600`, '-q:v', '2', join(out, 'g_%03d.jpg')])
  frames = readdirSync(out).filter((f) => /^g_\d{3}\.jpg$/.test(f)).sort().map((f) => join(out, f))
  if (frames.length === 0) fail(1, 'ffmpeg wrote no frames')
  must(['ffmpeg', '-v', 'error', '-y', '-i', join(out, 'g_%03d.jpg'), '-vf', 'tile=5x1', '-q:v', '2', join(out, 'st_%d.jpg')])
  strips = readdirSync(out).filter((f) => /^st_\d+\.jpg$/.test(f)).sort((a, b) => Number(a.slice(3, -4)) - Number(b.slice(3, -4))).map((f) => join(out, f))
}
console.log(JSON.stringify({ duration_seconds: duration, audio, frames: frames.length, strips, note }))
