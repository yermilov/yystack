#!/usr/bin/env bun
/**
 * sg-search — literal code search across public repositories via Sourcegraph's streaming API,
 * with no token. Refuses to report anything unless the stream finished.
 *
 *   bun run "SKILLDIR/scripts/sg-search.ts" '<literal string>' [--count 20] [--filters 'repo:… lang:…']
 *
 * Prints one `<repository> <path>` line per matching FILE, then `matchCount: N` (Sourcegraph counts
 * matching LINES, so it can exceed the file lines) and every `skipped:` reason. When the result
 * limit was hit it prints `matchCount: >=N (a FLOOR …)` — capped by --count, never a total.
 * `repository-fork` / `excluded-archive` mean forks and archived repos were not searched; add
 * `fork:yes` / `archived:yes` to --filters if they matter.
 * A term that itself starts with `--` goes in `--term '<value>'`.
 *
 * Exit 0 = the stream finished (even with zero matches — then "nowhere" is a real answer),
 * 1 = the stream did NOT finish (HTTP error, bot check, timeout) — that is NOT a zero-result answer,
 * 2 = bad arguments.
 */
const args = process.argv.slice(2)
const usage = await Bun.file(import.meta.path).text().then((t) => t.replace(/^#!.*\n/, '').split('*/')[0].replace(/^\/\*\*?|^ \* ?/gm, ''))
if (args.length === 0) { console.log(usage); process.exit(2) }
// Flags take a value; anything else is the one positional. A term that itself starts with `--` goes
// in `--term <value>`, whose value is taken verbatim (`bun run` swallows a leading `--` separator, so
// that cannot be the way).
const parse = (argv: string[], valued: string[]) => {
  const values: Record<string, string> = {}
  const positional: string[] = []
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--') { positional.push(...argv.slice(i + 1)); break }
    if (a === '--help' || a === '-h') { console.log(usage); process.exit(0) }
    if (a === '--term') {
      if (argv[i + 1] === undefined) { console.log('--term needs a value'); process.exit(2) }
      positional.push(argv[++i])
      continue
    }
    if (a.startsWith('--')) {
      if (!valued.includes(a)) { console.log(`unknown flag: ${a}`); process.exit(2) }
      const v = argv[i + 1]
      if (v === undefined || v.startsWith('--')) { console.log(`${a} needs a value`); process.exit(2) }
      values[a] = v
      i++
    } else positional.push(a)
  }
  if (positional.length !== 1) {
    console.log(`give exactly one search term (got ${positional.length}); quote a multi-word one`)
    process.exit(2)
  }
  return { term: positional[0], values }
}
const { term: literal, values } = parse(args, ['--count', '--filters'])
const count = values['--count'] ?? '20'
if (!/^[1-9]\d*$/.test(count)) { console.log('--count must be a positive whole number'); process.exit(2) }
const filters = values['--filters'] ?? ''
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
const skipped: { reason: string; title: string }[] = final.skipped ?? []
const capped = skipped.some((s) => s.reason === 'shard-match-limit' || /result limit/i.test(s.title ?? ''))
console.log(capped
  ? `matchCount: >=${final.matchCount} (a FLOOR: the result limit was hit; raise --count for more, never quote it as a total)`
  : `matchCount: ${final.matchCount} (complete for what was searched)`)
for (const s of skipped) console.log(`  skipped: ${s.reason} | ${s.title}`)
