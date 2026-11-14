#!/usr/bin/env bun
/**
 * html-to-text — turn a SAVED HTML page into readable text, and optionally list its outbound links.
 * Run it on a file you fetched with `curl -sSL --fail-with-body -o <file>` and whose exit status
 * you checked: it reads whatever is in the file, an error page included.
 *
 *   bun run "SKILLDIR/scripts/html-to-text.ts" <file.html> [--links] [--base <page url>] [--grep <regex>]
 *
 * Drops <script>, <style>, <svg>, <noscript>, <template> and comments; turns block ends (p, h1–h6,
 * li, div, tr, br, section, article, nav, main, figure, …) into newlines and table cells into
 * ` | `-separated columns; strips the remaining tags; decodes named and numeric entities; collapses
 * blank runs. Prints the text, then a final
 * `chars: N` line.
 *   --links        after the text, print every unique outbound <a href> (resolved against --base
 *                  when given), one per line under a `links:` header — a page's citations live there.
 *   --grep <re>    print only the text lines matching <re> (case-insensitive), each with its line
 *                  number — for a big document (a filing, a long article), find the section first.
 *
 * Exit 0 = text extracted, 1 = no readable text (a client-rendered shell, or not HTML: read the file
 * before you conclude the page is empty), 2 = bad arguments or unreadable file.
 */
const args = process.argv.slice(2)
if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  console.log(await Bun.file(import.meta.path).text().then((t) => t.replace(/^#!.*\n/, '').split('*/')[0].replace(/^\/\*\*?|^ \* ?/gm, '')))
  process.exit(args.length === 0 ? 2 : 0)
}
const valueOf = (name: string): string | undefined => {
  const i = args.indexOf(name)
  if (i < 0) return undefined
  const v = args[i + 1]
  if (v === undefined || v.startsWith('--')) {
    console.log(`${name} needs a value`)
    process.exit(2)
  }
  return v
}
const known = new Set(['--links', '--base', '--grep'])
const flagValues = new Set([valueOf('--base'), valueOf('--grep')].filter((v) => v !== undefined))
const positional = args.filter((a, i) => !a.startsWith('--') && !(flagValues.has(a) && known.has(args[i - 1])))
const unknown = args.filter((a) => a.startsWith('--') && !known.has(a))
if (unknown.length || positional.length !== 1) {
  console.log(unknown.length ? `unknown flag: ${unknown.join(' ')}` : 'give exactly one HTML file')
  process.exit(2)
}
const base = valueOf('--base')
let grepRe: RegExp | undefined
try {
  const g = valueOf('--grep')
  if (g !== undefined) grepRe = new RegExp(g, 'i')
} catch (e) {
  console.log(`bad --grep regex: ${(e as Error).message}`)
  process.exit(2)
}
const file = Bun.file(positional[0])
if (!(await file.exists())) {
  console.log(`no such file: ${positional[0]}`)
  process.exit(2)
}
const html = await file.text()

const named: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', laquo: '«', raquo: '»', middot: '·', bull: '•',
  copy: '©', reg: '®', trade: '™', times: '×', deg: '°', euro: '€', pound: '£', shy: '',
}
const decode = (s: string) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)
      return Number.isFinite(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : m
    }
    return named[e.toLowerCase()] ?? m
  })

const text = decode(
  html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|svg|noscript|template)\b[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(td|th)\s*>/gi, '\t')
    .replace(/<\/(p|h[1-6]|li|div|tr|section|article|pre|blockquote|header|footer|table|ul|ol|dd|dt|nav|main|aside|figure|figcaption|caption|dl|form|details|summary)\s*>/gi, '\n')
    .replace(/<(img|input|hr)\b(?:"[^"]*"|'[^']*'|[^'">])*>/gi, ' ')
    .replace(/<(?:"[^"]*"|'[^']*'|[^'">])+>/g, ''), // quote-aware: a '>' inside title="1 > 0" is not the tag's end
)
  .split('\n')
  .map((l) => {
    // a table row: every </td> left a tab, so the last cell is the trailing empty one — drop only that,
    // and keep empty cells in the middle so a value stays under its own heading
    const cells = l.split('\t').map((c) => c.replace(/[ \u00a0]+/g, ' ').trim())
    if (cells.length > 1 && cells[cells.length - 1] === '') cells.pop()
    return cells.join(' | ')
  })
  .join('\n')
  .replace(/\n{3,}/g, '\n\n')
  .trim()

if (grepRe) {
  text.split('\n').forEach((l, i) => grepRe!.test(l) && console.log(`${i + 1}: ${l}`))
} else {
  console.log(text)
}
console.log(`chars: ${text.length}`)

if (args.includes('--links')) {
  const seen = new Set<string>()
  // Walk each <a> tag's attributes one by one, so text INSIDE a quoted value (title="see href='x'")
  // or a look-alike name (data-href) is never taken for the link.
  for (const tag of html.matchAll(/<a\s((?:"[^"]*"|'[^']*'|[^'">])*)>/gi)) {
    let value: string | undefined
    for (const at of tag[1].matchAll(/([^\s=>\/"']+)(?:\s*=\s*("([^"]*)"|'([^']*)'|([^\s>"']+)))?/g)) {
      if (at[1].toLowerCase() === 'href') { value = at[3] ?? at[4] ?? at[5]; break }
    }
    const raw = decode(value ?? '').trim()
    if (!raw || raw.startsWith('#') || /^(javascript|mailto|tel):/i.test(raw)) continue
    let href = raw
    if (base) {
      try {
        href = new URL(raw, base).href
      } catch {}
    }
    seen.add(href)
  }
  console.log('links:')
  for (const h of seen) console.log(h)
}
if (text.length === 0) {
  console.log('no readable text: likely a client-rendered shell (open it in a browser) or not HTML at all — read the file before concluding the page is empty')
  process.exit(1)
}
process.exit(0)
