#!/usr/bin/env bun
/**
 * check-links — the fast, read-only first pass over a batch of URLs.
 *
 *   bun run "SKILLDIR/scripts/check-links.ts" <url> [<url> …] [--file urls.txt]
 *        [--dead '<regex>'] [--alive '<regex>'] [--site <host>] [--timeout 20] [--json]
 *   (URLs may also come on stdin, one per line; blank lines and lines starting with # are skipped)
 *
 * For each URL it fetches the page with a browser user-agent (following redirects), and once per site
 * it also fetches the site's homepage as a CONTROL: if the homepage is refused too, a 4xx on the link
 * says "this shell is blocked", not "the link is dead". Each URL gets one state:
 *
 *   DEAD            404/410 while the homepage answers, or the --dead regex matched the page
 *   ALIVE           the --alive regex matched the page (and --dead did not)
 *   REDIRECTED      ended on another site, or on a shallower page of this one (often a category or
 *                   search page) — check it
 *   BLOCKED         401/403/429/451/503, or a 404/410 while the homepage is refused too — open it in
 *                   a browser
 *   NEEDS-BROWSER   200 but a bot-check page or a near-empty shell (under 100 characters of visible
 *                   text once scripts and tags are stripped) — open it in a browser
 *   CHECK           200 with content but no marker given or matched — read it and classify
 *   DEAD            also: the link's domain does not resolve while a control domain does
 *   UNKNOWN         network error, timeout, another 5xx, or not an http(s) link
 *
 * Only DEAD and ALIVE are verdicts, and only because a status or a marker you supplied said so; every
 * other state is a pointer to the next step. Both regexes are case-insensitive and never read on a
 * bot-check page. --dead is matched against the title and the visible text; --alive against the
 * <title> ONLY — the place a page names its own item, where a "related items" block cannot reach.
 * ALIVE prints the title: still compare it with the item the link should be. Markers belong to
 * ONE site: with several sites in the batch, --site <host> says whose they are, and links on other
 * hosts are checked without them. It only reads; it never posts or logs in.
 *
 * The same URL twice (ignoring a #fragment) is fetched once and reported on every line it appears.
 *
 * Exit 0 = the pass ran (whatever it found), 2 = bad arguments or no URLs.
 */
import { readFileSync } from 'node:fs'
import { lookup } from 'node:dns/promises'

const args = process.argv.slice(2)
if (args.includes('--help') || args.includes('-h')) {
  console.log(readFileSync(import.meta.path, 'utf8').split('*/')[0].replace(/^#!.*\n/, '').replace(/^\/\*\*?|^ \* ?/gm, ''))
  process.exit(0)
}
const opt = (n: string) => {
  const i = args.indexOf(n)
  return i >= 0 ? args[i + 1] : undefined
}
const VALUED = ['--file', '--dead', '--alive', '--site', '--timeout']
// A valued flag with nothing after it would otherwise read as "not given" and be silently ignored.
for (const n of VALUED) {
  const i = args.indexOf(n)
  if (i >= 0 && (i + 1 >= args.length || args[i + 1].startsWith('--'))) { console.error(`check-links: ${n} needs a value`); process.exit(2) }
}
const urls: string[] = []
for (let i = 0; i < args.length; i++) {
  if (VALUED.includes(args[i])) { i++; continue }
  if (args[i].startsWith('--')) continue
  urls.push(args[i])
}
const fromLines = (t: string) => t.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))
const file = opt('--file')
if (file) {
  try { urls.push(...fromLines(readFileSync(file, 'utf8'))) }
  catch (e) { console.error(`check-links: cannot read --file ${file} (${(e as NodeJS.ErrnoException).code ?? (e as Error).message})`); process.exit(2) }
}
if (!urls.length && !process.stdin.isTTY) urls.push(...fromLines(await Bun.stdin.text()))
if (!urls.length) { console.error('check-links: no URLs (pass them as arguments, --file, or on stdin)'); process.exit(2) }

function regex(name: string): RegExp | undefined {
  const v = opt(name)
  if (v === undefined) return undefined
  try { return new RegExp(v, 'i') } catch { console.error(`check-links: ${name} is not a valid regex`); process.exit(2) }
}
const deadRe = regex('--dead')
const aliveRe = regex('--alive')
// One notion of "the same site" everywhere: the host, ignoring case, the scheme and a leading "www.".
const normHost = (h: string) => h.toLowerCase().replace(/^www\./, '')
// --site accepts a bare host or a full URL ("https://example.com/x" → example.com).
const siteArg = opt('--site')
let site: string | undefined
if (siteArg !== undefined) {
  // A bare host goes through URL too, so "not a host" fails here instead of matching nothing later.
  try { site = normHost(new URL(siteArg.includes('://') ? siteArg : `http://${siteArg}`).hostname) }
  catch { site = '' }
  if (!site || !/^[a-z0-9.-]+$/i.test(site) || !site.includes('.')) {
    console.error(`check-links: --site '${siteArg}' is neither a host nor a URL`)
    process.exit(2)
  }
}
const hostOf = (u: string) => { try { return normHost(new URL(u).hostname) } catch { return '' } }
if ((deadRe || aliveRe) && !site && new Set(urls.map(hostOf).filter(Boolean)).size > 1) {
  console.error('check-links: --dead/--alive are one site\'s markers, and this batch spans several sites — add --site <host>')
  process.exit(2)
}
// Exact host, as everywhere else here: docs.example.com is not www.example.com's site, and its
// pages would match another site's markers (a false DEAD).
const markersApply = (u: string) => !site || hostOf(u) === site
if (site && (deadRe || aliveRe) && !urls.some((u) => hostOf(u) === site)) {
  const hosts = [...new Set(urls.map(hostOf).filter(Boolean))].join(', ')
  console.error(`check-links: --site ${site} matches no link, so the markers apply to none — hosts in this batch: ${hosts}`)
  process.exit(2)
}
const timeoutMs = Number(opt('--timeout') ?? 20) * 1000
if (!(timeoutMs > 0)) { console.error('check-links: --timeout must be a positive number of seconds'); process.exit(2) }

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'
const BOT_CHECK = /just a moment|cf-chl|captcha|robot check|are you a robot|verify you are human|enable javascript to continue|access denied/i
const BLOCK_STATUS = new Set([401, 403, 429, 451, 503])

type Got = { status: number; finalUrl: string; title: string; text: string; visible: number } | { error: string }

async function get(url: string): Promise<Got> {
  try {
    const r = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(timeoutMs),
      headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml', 'accept-language': 'en,*;q=0.5' },
    })
    const html = await r.text()
    const title = (html.match(/<title[^>]*>([^<]*)/i)?.[1] ?? '').replace(/\s+/g, ' ').trim()
    const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    return { status: r.status, finalUrl: r.url, title, text: `${title} ${text}`, visible: text.length }
  } catch (e) {
    return { error: (e as Error).name === 'TimeoutError' ? `timeout after ${timeoutMs / 1000}s` : (e as Error).message }
  }
}

const roots = new Map<string, Promise<Got>>()
const rootOf = (u: URL) => {
  if (!roots.has(u.origin)) roots.set(u.origin, get(`${u.origin}/`))
  return roots.get(u.origin)!
}
// Visible text, not bytes: a small static page (example.com: 171 chars) is real content, while a
// client-rendered shell carries almost none (26 chars measured on one, 2026-11).
const challenged = (g: Got) => !('error' in g) && (BOT_CHECK.test(g.text) || g.visible < 100)
// A homepage "answers" only with real content: a 200 bot check or an empty shell is a refusal too.
const refused = (g: Got) => 'error' in g || g.status >= 400 || challenged(g)

// A lapsed domain is the commonest rot for old citations, and fetch reports it as a bare network
// error. Resolve the host: NXDOMAIN while a control domain resolves is a verdict; when the control
// fails too, this shell has no DNS and nothing can be said.
const CONTROL_HOST = 'example.com'
let controlDns: Promise<boolean> | undefined
const resolves = (h: string) => lookup(h).then(() => true, (e) => (e?.code === 'ENOTFOUND' ? false : true))
async function domainGone(host: string): Promise<boolean> {
  if (await resolves(host)) return false
  controlDns ??= resolves(CONTROL_HOST)
  return controlDns
}

type Row = { url: string; state: string; why: string; finalUrl?: string; title?: string; status?: number }

async function check(raw: string): Promise<Row> {
  let u: URL
  try { u = new URL(raw) } catch { return { url: raw, state: 'UNKNOWN', why: 'not a URL (a relative link? resolve it against its page first)' } }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return { url: raw, state: 'UNKNOWN', why: `not an http(s) link (${u.protocol})` }
  const [g, root] = await Promise.all([get(raw), rootOf(u)])
  if ('error' in g) {
    if (await domainGone(u.hostname)) return { url: raw, state: 'DEAD', why: `domain ${u.hostname} does not resolve (control ${CONTROL_HOST} does)` }
    return { url: raw, state: 'UNKNOWN', why: g.error }
  }
  const base = { url: raw, finalUrl: g.finalUrl, title: g.title, status: g.status }
  // Ending on another site: whatever status or page came back is THAT site's, never this link's verdict.
  const from = new URL(raw), to = new URL(g.finalUrl)
  const depth = (p: string) => p.split('/').filter(Boolean).length
  if (normHost(to.hostname) !== normHost(from.hostname)) return { ...base, state: 'REDIRECTED', why: `ended on ${g.finalUrl} (HTTP ${g.status})` }
  const rootNote = refused(root)
    ? `; homepage also refused (${'error' in root ? root.error : challenged(root) ? `${root.status}, bot check or empty` : root.status})`
    : ''
  if (g.status === 404 || g.status === 410) {
    return refused(root)
      ? { ...base, state: 'BLOCKED', why: `HTTP ${g.status}${rootNote} — the shell may be blocked` }
      : { ...base, state: 'DEAD', why: `HTTP ${g.status}, homepage answers` }
  }
  if (BLOCK_STATUS.has(g.status)) return { ...base, state: 'BLOCKED', why: `HTTP ${g.status}${rootNote}` }
  if (g.status >= 400) return { ...base, state: 'UNKNOWN', why: `HTTP ${g.status}` }
  // A challenge page can contain any words ("not found", the item's title), so no marker is read on one.
  if (challenged(g)) {
    return { ...base, state: 'NEEDS-BROWSER', why: BOT_CHECK.test(g.text) ? 'bot-check page' : `near-empty page (${g.visible} chars of text)` }
  }
  if (to.href !== from.href && depth(to.pathname) < depth(from.pathname)) {
    return { ...base, state: 'REDIRECTED', why: `ended on ${g.finalUrl}` }
  }
  // Markers are read only on the intended site: both where the link points and where it ended up.
  const scoped = markersApply(raw) && markersApply(g.finalUrl)
  if (scoped && deadRe?.test(g.text)) return { ...base, state: 'DEAD', why: `dead marker matched (HTTP ${g.status})` }
  if (scoped && aliveRe?.test(g.title)) {
    return { ...base, state: 'ALIVE', why: `alive marker matched${g.title ? `: ${g.title.slice(0, 80)}` : ''}` }
  }
  return { ...base, state: 'CHECK', why: `HTTP ${g.status}${g.title ? `, title "${g.title.slice(0, 80)}"` : ', no title'}` }
}

// A few at a time: a batch from one site fired all at once is what gets a shell rate-limited.
const keyOf = (u: string) => u.replace(/#.*$/, '')
const unique = [...new Set(urls.map(keyOf))]
const byKey = new Map<string, Row>()
let next = 0
await Promise.all(Array.from({ length: Math.min(4, unique.length) }, async () => {
  while (next < unique.length) {
    const k = unique[next++]
    byKey.set(k, await check(k))
  }
}))
const rows: Row[] = urls.map((u) => ({ ...byKey.get(keyOf(u))!, url: u }))

if (args.includes('--json')) console.log(JSON.stringify(rows, null, 2))
else rows.forEach((r, i) => console.log(`${i + 1}. ${r.url} — ${r.state} (${r.why})`))
