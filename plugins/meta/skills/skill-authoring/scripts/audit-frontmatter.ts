#!/usr/bin/env bun
/**
 * audit-frontmatter — the mechanical half of a skill-authoring review (§1).
 *
 * Parses every SKILL.md frontmatter as YAML (never a `description:` line-grep, which bleeds into the
 * keys that follow and over-reports length) and reports, per skill:
 *   - description length in CODE POINTS against the 1024-character cap (the skill validator refuses
 *     a longer one — Codex CLI, as of 2026-08: its runtime accepts it and truncates the tail, so keep only
 *     capability prose there) and against SKILL.md §1's 500–900 aim (a warning)
 *   - whether the DESCRIPTION carries a `Do not use for…` boundary — read off the parsed field, not
 *     the file, because the same phrase in the body is not a boundary
 *   - `name` vs its directory
 *   - frontmatter that will not parse at all — which is counted in NONE of the other buckets, so it
 *     is announced up front rather than only at the end
 *
 * The boundary regex is a SHORTLIST, not a verdict: real boundaries phrase themselves freely
 * ("Do NOT use it to…", "— that's <sibling>"), so read what it flags before believing it.
 */

// Bun.YAML is built in — no dependency to install, so this runs on a clean machine with no network.
import { basename, dirname, join, resolve } from 'node:path'

const CAP = 1024
// SKILL.md §1's aim. Outside it is a warning, not a failure: a long one competes for the shared skills
// budget (which shortens descriptions from the tail), a short one rarely names enough situations.
const AIM_MIN = 500
const AIM_MAX = 900
const BOUNDARY = /do not use (for|it|this|to|when|on)|not for\b|—\s*that'?s\b/i

interface Row {
  path: string
  name: string
  dir: string
  length: number
  boundary: boolean
  error?: string
}

function usage(): never {
  console.log(`usage: bun run audit-frontmatter.ts [marketplace-root] [--json]

Scans <root>/plugins/*/skills/*/SKILL.md (default root: the current directory).

Exits 1 on the defects a machine can be sure of: frontmatter that will not parse, a missing or
non-string or blank name/description, a name that disagrees with its directory, and a description over the
${CAP}-character cap. Descriptions outside the ${AIM_MIN}–${AIM_MAX} aim and missing boundaries are reported but do not
fail the run — both need a human read. Exits 2 when the audit cannot run: an unreadable root or no
plugins/*/skills/*/SKILL.md under it, an unknown flag or a second root, or a Bun without its YAML
parser (< 1.3).`)
  process.exit(0)
}

const args = process.argv.slice(2)
// --help wins only when nothing else on the line is wrong: `--bad --help` or two roots must still exit 2.
const badFlag =
  args.some((a) => a.startsWith('-') && !['--json', '--help', '-h'].includes(a)) ||
  args.filter((a) => !a.startsWith('-')).length > 1
if ((args.includes('-h') || args.includes('--help')) && !badFlag) usage()

// Bun.YAML is built in from Bun 1.3. Fail with an actionable message rather than a bare TypeError:
// an older Bun runs the script, so the version has to be checked here.
if (typeof Bun.YAML?.parse !== 'function') {
  console.error(
    `this audit needs Bun's built-in YAML parser (Bun >= 1.3); you are on ${Bun.version}.\n` +
      `Upgrade it (the install-bun skill picks the command for how it was installed) and re-run.`,
  )
  process.exit(2)
}
// Refuse what we do not parse: a typo'd flag silently ignored would audit the wrong thing and pass.
const unknown = args.filter((a) => a.startsWith('-') && !['--json', '--help', '-h'].includes(a))
const positional = args.filter((a) => !a.startsWith('-'))
if (unknown.length > 0 || positional.length > 1) {
  console.error(
    unknown.length > 0
      ? `audit-frontmatter: unknown flag ${unknown.join(' ')} — the flags are --json and --help.`
      : `audit-frontmatter: one marketplace root at most, got ${positional.length}: ${positional.join(' ')}`,
  )
  process.exit(2)
}
const asJson = args.includes('--json')
const root = resolve(positional[0] ?? '.')

const glob = new Bun.Glob('plugins/*/skills/*/SKILL.md')
let paths: string[]
try {
  paths = (await Array.fromAsync(glob.scan({ cwd: root }))).sort()
} catch (e) {
  console.error(`cannot read ${root} (${(e as Error).message}) — pass the marketplace root, the directory that holds plugins/.`)
  process.exit(2)
}

if (paths.length === 0) {
  console.error(`no plugins/*/skills/*/SKILL.md under ${root} — wrong directory? (permanent: fix the path, a retry will not help)`)
  process.exit(2)
}

const rows: Row[] = []
for (const rel of paths) {
  const full = join(root, rel)
  let text: string
  try {
    text = await Bun.file(full).text()
  } catch (e) {
    // A skill we cannot read would silently shrink the audit, so stop instead.
    console.error(`cannot read ${full} (${(e as Error).message}) — the audit did not run (permanent: fix the permissions or the path).`)
    process.exit(2)
  }
  const dir = basename(dirname(full))
  const base: Row = { path: rel, name: '', dir, length: 0, boundary: false }

  // Both delimiters must be a line of EXACTLY `---` — not `----`, `---note`, or `---` with trailing
  // spaces, all of which the host's validator refuses. Only a stray CR (CRLF file) is forgiven. A
  // looser match would quietly certify a skill that cannot be packaged.
  const lines = text.split('\n').map((l) => l.replace(/\r$/, ''))
  const end = lines[0] === '---' ? lines.findIndex((l, i) => i > 0 && l === '---') : -1
  if (end === -1) {
    rows.push({ ...base, error: 'no `---`-delimited YAML frontmatter' })
    continue
  }
  try {
    const fm = (Bun.YAML.parse(lines.slice(1, end).join('\n')) ?? {}) as Record<string, unknown>
    // Loaders require both to be strings — a list or a number is a rejected skill, not a short one,
    // so never coerce here or the audit reports a defect as healthy.
    // Empty counts as missing: a blank description is a skill with no classifier at all, which the
    // host refuses — and it would otherwise land only in the non-failing no-boundary bucket.
    const bad = (['name', 'description'] as const).filter(
      (k) => typeof fm[k] !== 'string' || !(fm[k] as string).trim(),
    )
    if (bad.length) {
      rows.push({ ...base, error: `${bad.join(' and ')} missing, blank, or not a string` })
      continue
    }
    const description = (fm.description as string).trim()
    rows.push({
      ...base,
      name: fm.name as string,
      // Code points, not UTF-16 units: the validator enforcing the cap counts the way Python does,
      // so `.length` would double-count every emoji and fail a description that is actually legal.
      length: [...description].length,
      boundary: BOUNDARY.test(description),
    })
  } catch (err) {
    rows.push({ ...base, error: `frontmatter is not valid YAML: ${(err as Error).message}` })
  }
}

const broken = rows.filter((r) => r.error)
const overCap = rows.filter((r) => !r.error && r.length > CAP)
const longish = rows.filter((r) => !r.error && r.length <= CAP && r.length > AIM_MAX)
const shortish = rows.filter((r) => !r.error && r.length < AIM_MIN)
const mismatched = rows.filter((r) => !r.error && r.name !== r.dir)
const noBoundary = rows.filter((r) => !r.error && !r.boundary)

if (asJson) {
  console.log(JSON.stringify({ root, rows, overCap, overAim: longish, underAim: shortish, mismatched, noBoundary }, null, 2))
} else {
  const line = (r: Row) => `  ${String(r.length).padStart(4)}  ${r.path}`
  console.log(`${rows.length} skills under ${root}\n`)

  // A skill whose frontmatter will not parse has no description to measure, so it is counted in NONE
  // of the buckets below. Say so up here: a reader who takes "over the cap: 2" at face value while a
  // parse failure hides a third one has been under-reported by the very tool that was meant to stop
  // them hand-counting.
  if (broken.length)
    console.log(
      `${broken.length} of these have UNREADABLE frontmatter and are counted in none of the buckets\n` +
        `below — a parse failure silently shrinks every number here. They are listed at the end.\n`,
    )

  // On Codex CLI (as of 2026-08, SKILL.md §1) the runtime accepts an over-cap description and silently
  // truncates it — it is the packaged-skill validator that refuses one. Either way the tail is what you lose, so nothing but capability prose belongs there.
  console.log(`over the ${CAP}-char cap — validator refuses, runtime truncates: ${overCap.length}`)
  overCap.forEach((r) => console.log(line(r)))

  console.log(`\nover the ${AIM_MAX}-char aim (warning) — cut capability prose: ${longish.length}`)
  longish.forEach((r) => console.log(line(r)))

  console.log(`\nunder the ${AIM_MIN}-char aim (warning) — does it name enough situations?: ${shortish.length}`)
  shortish.forEach((r) => console.log(line(r)))

  console.log(`\nname ≠ directory: ${mismatched.length}`)
  mismatched.forEach((r) => console.log(`  ${r.name} in ${r.path}`))

  console.log(`\nno boundary in the description — shortlist, read each: ${noBoundary.length}`)
  noBoundary.forEach((r) => console.log(`  ${r.path}`))

  if (broken.length) {
    console.log(`\nunreadable frontmatter: ${broken.length}`)
    broken.forEach((r) => console.log(`  ${r.path} — ${r.error}`))
  }
}

process.exit(overCap.length + mismatched.length + broken.length > 0 ? 1 : 0)
