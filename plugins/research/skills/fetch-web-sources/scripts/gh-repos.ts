#!/usr/bin/env bun
/**
 * gh-repos — "what has anybody BUILT with <product>": GitHub repository search ranked by stars,
 * unauthenticated. Candidate discovery, not a census — read and classify every row you cite.
 *
 *   bun run "SKILLDIR/scripts/gh-repos.ts" '<query>' [--sort stars|updated] [--per-page 30]
 *
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
if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  console.log(await Bun.file(import.meta.path).text().then((t) => t.replace(/^#!.*\n/, '').split('*/')[0].replace(/^\/\*\*?|^ \* ?/gm, '')))
  process.exit(args.length === 0 ? 2 : 0)
}
const opt = (name: string, dflt: string) => {
  const i = args.indexOf(name)
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : dflt
}
const url = new URL('https://api.github.com/search/repositories')
url.searchParams.set('q', args[0])
url.searchParams.set('sort', opt('--sort', 'stars'))
url.searchParams.set('order', 'desc')
url.searchParams.set('per_page', opt('--per-page', '30'))
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
