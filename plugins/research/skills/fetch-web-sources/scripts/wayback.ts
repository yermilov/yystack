#!/usr/bin/env bun
/**
 * wayback — an archived copy of a page the live web will not serve you (fetch-web-sources §1.4).
 *
 *   bun run "SKILLDIR/scripts/wayback.ts" '<page url>' --out <file.html> [--timestamp YYYYMMDD[hhmmss]]
 *   bun run "SKILLDIR/scripts/wayback.ts" '<page url>' --list
 *
 * Default mode: asks the Wayback availability API for the capture closest to --timestamp (default:
 * the newest), and, when that lookup errors or times out, falls back to the CDX capture index. Then
 * downloads the PLAIN capture (the page inside the archive's toolbar: the raw `id_/` form has
 * answered HTTP 429 to the same request, measured 2026-11-14) into --out and prints one JSON line:
 *   {"timestamp", "capture_url", "http", "bytes", "lookup": "available" | "cdx"}
 * --list prints the newest 300 200-status captures, oldest of them first, one
 * `<timestamp> <original url>` per line — for when the closest capture turns out to be a block,
 * login or paywall page, not the article. For an older one, use --timestamp.
 *
 * Read the saved file before you quote it (html-to-text.ts turns it into text): an archived copy
 * can itself be the block page, and it is a different document from the live page, dated by its
 * timestamp.
 *
 * The page URL is parsed and must be http(s); the archive is sent the URL rebuilt from its parsed
 * parts, never the raw argument.
 *
 * Exit 0 = capture written (or listed), 4 = no capture of this URL exists (the lookup and the index
 * both answered cleanly with nothing — try the site's own index for another slug), 1 = a lookup or
 * download FAILED (timeout, 429, 5xx, not JSON: retry later — never read it as "no capture"),
 * 2 = bad arguments.
 */

const args = process.argv.slice(2)
if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  console.log(
    (await Bun.file(import.meta.path).text()).replace(/^#!.*\n/, '').split('*/')[0].replace(/^\/\*\*?|^ \* ?/gm, ''),
  )
  process.exit(args.length === 0 ? 2 : 0)
}
function usage(msg: string): never {
  console.error(`wayback: ${msg} (see --help)`)
  process.exit(2)
}
function failed(msg: string): never {
  console.error(`wayback: ${msg} — a failed lookup, not "no capture": retry later`)
  process.exit(1)
}

const VALUE_FLAGS = new Set(['--out', '--timestamp'])
const BOOL_FLAGS = new Set(['--list'])
const values = new Map<string, string>()
const bools = new Set<string>()
const positionals: string[] = []
for (let i = 0; i < args.length; i++) {
  const a = args[i]
  if (VALUE_FLAGS.has(a)) {
    const v = args[++i]
    if (v === undefined || v.startsWith('--')) usage(`${a} needs a value`)
    if (values.has(a)) usage(`${a} given twice`)
    values.set(a, v)
  } else if (BOOL_FLAGS.has(a)) {
    if (bools.has(a)) usage(`${a} given twice`)
    bools.add(a)
  } else if (a.startsWith('-')) usage(`unknown flag ${a}`)
  else positionals.push(a)
}
if (positionals.length !== 1) usage(`expected one page URL, got ${positionals.length}`)
const list = bools.has('--list')
const out = values.get('--out')
const ts = values.get('--timestamp')
if (list && (out || ts)) usage('--list takes no --out or --timestamp')
if (!list && !out) usage('give --out <file> for the capture, or --list')
if (ts !== undefined && !/^\d{4,14}$/.test(ts)) usage('--timestamp is YYYY[MM[DD[hh[mm[ss]]]]], digits only')

let page: URL
try {
  page = new URL(positionals[0])
} catch {
  usage(`not a URL: ${positionals[0]}`)
}
if (page.protocol !== 'https:' && page.protocol !== 'http:') usage(`only http(s) pages: ${positionals[0]}`)
if (page.username || page.password) usage('a URL with credentials in it is not archived as such')
page.hash = ''
const target = page.href

const UA = 'Mozilla/5.0 (compatible; wayback-script)'
const LIST_LIMIT = 300
// Throws on a failed request; the caller decides whether that is fatal (the capture index) or a
// reason to fall back (the availability lookup).
async function getJson(url: URL): Promise<unknown> {
  let res: Response
  try {
    res = await fetch(url, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(30_000) })
  } catch (e) {
    throw new Error(`${url.host} did not answer (${(e as Error).message})`)
  }
  const body = await res.text()
  if (!res.ok) throw new Error(`${url.host} answered HTTP ${res.status}: ${body.slice(0, 200).replace(/\s+/g, ' ')}`)
  try {
    return JSON.parse(body)
  } catch {
    throw new Error(`${url.host} answered 200 but not JSON (likely a proxy or bot page): ${body.slice(0, 200).replace(/\s+/g, ' ')}`)
  }
}

type Capture = { timestamp: string; original: string }
// The full index of a popular page runs to tens of MB, so ask only for what is needed: the captures
// closest to a moment, or the newest few hundred.
async function cdx(opts: { closest?: string; limit: number }): Promise<Capture[]> {
  const u = new URL('https://web.archive.org/cdx/search/cdx')
  u.searchParams.set('url', target)
  u.searchParams.set('output', 'json')
  u.searchParams.set('filter', 'statuscode:200')
  if (opts.closest) {
    u.searchParams.set('sort', 'closest')
    u.searchParams.set('closest', opts.closest)
  }
  u.searchParams.set('limit', String(opts.limit))
  const rows = await getJson(u).catch((e) => failed((e as Error).message))
  if (!Array.isArray(rows)) failed('the CDX index answered with something other than a list')
  if (rows.length === 0) return []
  const head = rows[0] as string[]
  const ti = head.indexOf('timestamp')
  const oi = head.indexOf('original')
  if (ti < 0 || oi < 0) failed('the CDX header row lacks timestamp/original')
  return (rows.slice(1) as string[][]).map((r) => ({ timestamp: r[ti], original: r[oi] }))
}

if (list) {
  const caps = await cdx({ limit: -LIST_LIMIT })
  if (caps.length === 0) {
    console.error(`wayback: no 200 capture of ${target} in the index`)
    process.exit(4)
  }
  for (const c of caps) console.log(`${c.timestamp} ${c.original}`)
  process.exit(0)
}

// 1. The availability API; its answer is only "no capture" when it carries no `error` key.
let chosen: string | undefined
let lookup: 'available' | 'cdx' = 'available'
let lookupFailed = false
// A Wayback timestamp (YYYY[MM[DD[hh[mm[ss]]]]]) as epoch milliseconds, missing parts at their start.
function epoch(t: string): number {
  const n = (i: number, len: number, d: number) => (t.length >= i + len ? Number(t.slice(i, i + len)) : d)
  return Date.UTC(n(0, 4, 1970), n(4, 2, 1) - 1, n(6, 2, 1), n(8, 2, 0), n(10, 2, 0), n(12, 2, 0))
}
{
  const u = new URL('https://archive.org/wayback/available')
  u.searchParams.set('url', target)
  // The same padded moment the index fallback uses, so both paths mean one thing by `--timestamp 2020`.
  if (ts) u.searchParams.set('timestamp', ts.padEnd(14, '0').replace(/^(\d{4})00/, '$101').replace(/^(\d{6})00/, '$101'))
  let lookupError = ''
  const j = (await getJson(u).catch((e) => {
    lookupError = (e as Error).message
    return undefined
  })) as
    | { archived_snapshots?: { closest?: { timestamp?: string; available?: boolean } }; error?: unknown }
    | undefined
  const closest = j?.archived_snapshots?.closest
  if (j && j.error === undefined && closest?.available && closest.timestamp) chosen = closest.timestamp
  else if (lookupError || j?.error !== undefined)
    console.error(`wayback: availability lookup failed (${lookupError || JSON.stringify(j?.error)}); trying the capture index`)
  if (lookupError || j?.error !== undefined) lookupFailed = true
}
// 2. The CDX index: the fallback when the lookup errored, and the confirmation when it was empty.
if (!chosen) {
  lookup = 'cdx'
  const want = ts ? ts.padEnd(14, '0').replace(/^(\d{4})00/, '$101').replace(/^(\d{6})00/, '$101') : new Date().toISOString().replace(/\D/g, '').slice(0, 14)
  const caps = await cdx({ closest: want, limit: 5 })
  if (caps.length === 0) {
    if (lookupFailed) failed(`the capture index lists no capture of ${target}, but the availability lookup failed`)
    console.error(`wayback: no capture of ${target} — the availability lookup and the CDX index agree`)
    process.exit(4)
  }
  const wantMs = epoch(want)
  caps.sort((a, b) => Math.abs(epoch(a.timestamp) - wantMs) - Math.abs(epoch(b.timestamp) - wantMs))
  chosen = caps[0].timestamp
}

// 3. The plain capture.
const captureUrl = `https://web.archive.org/web/${chosen}/${target}`
let res: Response
try {
  res = await fetch(captureUrl, { headers: { 'user-agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(60_000) })
} catch (e) {
  failed(`the capture did not download (${(e as Error).message})`)
}
const html = await res.text()
if (!res.ok) failed(`the capture answered HTTP ${res.status}: ${html.slice(0, 200).replace(/\s+/g, ' ')}`)
await Bun.write(out!, html)
console.log(JSON.stringify({ timestamp: chosen, capture_url: res.url || captureUrl, http: res.status, bytes: html.length, lookup }))
