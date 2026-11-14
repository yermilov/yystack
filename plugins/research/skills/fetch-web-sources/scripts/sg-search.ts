#!/usr/bin/env bun
/**
 * sg-search — literal code search across public repositories via Sourcegraph's streaming API,
 * with no token. Refuses to report anything unless the stream finished.
 *
 *   bun run "SKILLDIR/scripts/sg-search.ts" '<literal string>' [--count 20] [--filters 'repo:… lang:…']
 *
 * Prints one `<repository> <path>` line per matching FILE, then `matchCount: N` (Sourcegraph counts
 * matching LINES, so it can exceed the file lines) and every `skipped:` reason.
 * A `skipped: shard-match-limit` / "result limit hit" line means matchCount is a FLOOR ("at least N"),
 * capped by --count — never quote it as a total. `repository-fork` / `excluded-archive` mean forks and
 * archived repos were not searched; add `fork:yes` / `archived:yes` to --filters if they matter.
 *
 * Exit 0 = the stream finished (even with zero matches — then "nowhere" is a real answer),
 * 1 = the stream did NOT finish (HTTP error, bot check, timeout) — that is NOT a zero-result answer,
 * 2 = bad arguments.
 */
const args = process.argv.slice(2)
if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  console.log(await Bun.file(import.meta.path).text().then((t) => t.replace(/^#!.*\n/, '').split('*/')[0].replace(/^\/\*\*?|^ \* ?/gm, '')))
  process.exit(args.length === 0 ? 2 : 0)
}
const literal = args[0]
const opt = (name: string, dflt: string) => {
  const i = args.indexOf(name)
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : dflt
}
const count = opt('--count', '20')
const filters = opt('--filters', '')
const q = `context:global content:${JSON.stringify(literal)} ${filters} count:${count}`.replace(/\s+/g, ' ')
const url = new URL('https://sourcegraph.com/.api/search/stream')
url.searchParams.set('q', q)
url.searchParams.set('v', 'V3')
url.searchParams.set('t', 'literal')

let res: Response
try {
  res = await fetch(url, { headers: { Accept: 'text/event-stream' }, signal: AbortSignal.timeout(45_000) })
} catch (e) {
  console.log(`INCOMPLETE — request failed (${(e as Error).message}). This is NOT a zero-result answer.`)
  process.exit(1)
}
const raw = await res.text().catch(() => '')
if (res.status !== 200) {
  console.log(`INCOMPLETE — HTTP ${res.status} (a bot check or rate limit reads like zero matches). This is NOT a zero-result answer.`)
  process.exit(1)
}
const frames: [string, any][] = []
for (const m of raw.matchAll(/event: (\w+)\ndata: (.*)/g)) {
  try { frames.push([m[1], JSON.parse(m[2])]) } catch { /* a truncated stream ends in half a JSON object */ }
}
const final = frames.find(([e, d]) => e === 'progress' && d?.done)?.[1]
if (!final) {
  console.log('INCOMPLETE STREAM — no done:true frame. The search did not finish; this is NOT a zero-result answer.')
  process.exit(1)
}
for (const [e, d] of frames) if (e === 'matches') for (const m of d) console.log(`${m.repository} ${m.path}`)
console.log(`matchCount: ${final.matchCount}`)
for (const s of final.skipped ?? []) console.log(`  skipped: ${s.reason} | ${s.title}`)
