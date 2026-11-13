#!/usr/bin/env bun
/**
 * audit-frontmatter — the mechanical half of a skill-authoring review (§1).
 *
 * Parses every SKILL.md frontmatter as YAML (never a `description:` line-grep, which bleeds into the
 * keys that follow and over-reports length) and reports, per skill:
 *   - description length in CODE POINTS against the 1024-character cap (the skill validator refuses
 *     a longer one; the runtime accepts it and truncates the tail, where the boundary lives)
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
const NEAR_CAP = 0.9 // flag descriptions crowding the cap: they compete for the skills context budget
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
non-string name/description, a name that disagrees with its directory, and a description over the
${CAP}-character cap. Descriptions crowding the cap and missing boundaries are reported but do not
fail the run — both need a human read.`)
  process.exit(0)
}

const args = process.argv.slice(2)
if (args.includes('-h') || args.includes('--help')) usage()

// Bun.YAML is built in from Bun 1.3. Fail with an actionable message rather than a bare TypeError:
// `install-bun` accepts any working `bun`, so an older one satisfies the prerequisite and still
// cannot run this.
if (typeof Bun.YAML?.parse !== 'function') {
  console.error(
    `this audit needs Bun's built-in YAML parser (Bun >= 1.3); you are on ${Bun.version}.\n` +
      `Upgrade with \`bun upgrade\` (or the install-bun skill) and re-run.`,
  )
  process.exit(2)
}
const asJson = args.includes('--json')
const root = resolve(args.find((a) => !a.startsWith('--')) ?? '.')

const glob = new Bun.Glob('plugins/*/skills/*/SKILL.md')
const paths = (await Array.fromAsync(glob.scan({ cwd: root }))).sort()

if (paths.length === 0) {
  console.error(`no plugins/*/skills/*/SKILL.md under ${root} — wrong directory?`)
  process.exit(2)
}

const rows: Row[] = []
for (const rel of paths) {
  const full = join(root, rel)
  const text = await Bun.file(full).text()
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
const nearCap = rows.filter((r) => !r.error && r.length <= CAP && r.length >= CAP * NEAR_CAP)
const mismatched = rows.filter((r) => !r.error && r.name !== r.dir)
const noBoundary = rows.filter((r) => !r.error && !r.boundary)

if (asJson) {
  console.log(JSON.stringify({ root, rows, overCap, nearCap, mismatched, noBoundary }, null, 2))
} else {
  const line = (r: Row) => `  ${String(r.length).padStart(4)}  ${r.path}`
  console.log(`${rows.length} skills under ${root}\n`)

  // A skill whose frontmatter will not parse has no description to measure, so it is counted in NONE
  // of the buckets below. Say so up here: a reader who takes "over the cap: 2" at face value while a
  // parse failure hides a third one has been under-reported by the very tool that was meant to stop
  // them hand-counting. (Measured: one library's only unparseable skill also had a 1232-char
  // description, absent from the over-cap list.)
  if (broken.length)
    console.log(
      `${broken.length} of these have UNREADABLE frontmatter and are counted in none of the buckets\n` +
        `below — a parse failure silently shrinks every number here. They are listed at the end.\n`,
    )

  // The runtime accepts an over-cap description and silently truncates it — it is the packaged-skill
  // validator that refuses one. Either way the tail, where the boundary lives, is what you lose.
  console.log(`over the ${CAP}-char cap — validator refuses, runtime truncates: ${overCap.length}`)
  overCap.forEach((r) => console.log(line(r)))

  console.log(`\ncrowding the cap (≥${Math.round(CAP * NEAR_CAP)}) — cut capability prose: ${nearCap.length}`)
  nearCap.forEach((r) => console.log(line(r)))

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
