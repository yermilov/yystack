#!/usr/bin/env bun
/**
 * gh-repos — "what has anybody BUILT with <product>": GitHub repository search ranked by stars,
 * unauthenticated. Candidate discovery, not a census — read and classify every row you cite.
 *
 *   bun run "SKILLDIR/scripts/gh-repos.ts" '<query>' [--sort stars|updated] [--per-page 30]
 *
 * A query that itself starts with `--` goes in `--term '<value>'`.
 * Prints `total_count` (a tokenised AND over name/description/topics — an order of magnitude, quote it
 * with its date), then one row per repo: stars, full_name, last push date, description.
 * If GITHUB_TOKEN is set it is sent (higher rate limit); it is never printed.
 *
 * Exit 0 = a complete page, 1 = GitHub flagged `incomplete_results` (it timed out internally and the
 * page is partial — narrow the query and re-run; do not cite it) or answered non-200 (a 403 here is
 * usually the 10-requests-per-minute unauthenticated limit, or a sandbox egress proxy — read the body
 * it prints), 2 = bad arguments.
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
const { term, values } = parse(args, ['--sort', '--per-page'])
const sort = values['--sort'] ?? 'stars'
const perPage = values['--per-page'] ?? '30'
if (!['stars', 'updated'].includes(sort)) { console.log('--sort must be stars or updated'); process.exit(2) }
if (!/^[1-9]\d*$/.test(perPage) || Number(perPage) > 100) { console.log('--per-page must be 1–100'); process.exit(2) }
const url = new URL('https://api.github.com/search/repositories')
url.searchParams.set('q', term)
url.searchParams.set('sort', sort)
url.searchParams.set('order', 'desc')
url.searchParams.set('per_page', perPage)
const headers: Record<string, string> = { Accept: 'application/vnd.github+json', 'User-Agent': 'gh-repos-script' }
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`

const res = await fetch(url, { headers, signal: AbortSignal.timeout(30_000) }).catch((e) => {
  console.log(`request failed: ${(e as Error).message}`)
  process.exit(1)
})
const body = await res.text()
if (res.status !== 200) {
  console.log(`HTTP ${res.status} — not a result. Body: ${body.slice(0, 300)}`)
  process.exit(1)
}
const d = JSON.parse(body)
if (d.incomplete_results) {
  console.log('INCOMPLETE: GitHub timed out internally; this page is partial. Narrow the query and re-run; do not cite it.')
  process.exit(1)
}
console.log(`total_count ${d.total_count} (as of ${new Date().toISOString().slice(0, 10)})`)
for (const r of d.items) {
  console.log(`${String(r.stargazers_count).padStart(6)}  ${r.full_name}  ${(r.pushed_at ?? '?').slice(0, 10)}  ${(r.description ?? '').slice(0, 120)}`)
}
