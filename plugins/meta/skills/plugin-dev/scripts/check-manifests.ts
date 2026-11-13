#!/usr/bin/env bun
/**
 * check-manifests — the deterministic half of plugin-dev's pre-ship checklist.
 *
 *   bun run "SKILLDIR/scripts/check-manifests.ts" "MARKETPLACE_ROOT" [--base <git-ref>]
 *
 * Checks, for a marketplace repo laid out the way plugin-dev §1 describes:
 *   1. both marketplace manifests exist, parse, and list the SAME plugin names
 *   2. every listed plugin has BOTH plugin.json manifests, they parse, and name/version match
 *   3. every skills/<name>/SKILL.md frontmatter parses as YAML, has a description, and name == dir
 * With --base <ref> (e.g. origin/main), it also checks the VERSION DISCIPLINE of the change:
 *   4. every plugin whose files changed since <ref> has a different version than at <ref>
 *   5. if the plugin LIST changed since <ref>, the Claude marketplace metadata.version changed too
 *
 * Exit 0 = clean, 1 = a defect listed above (each printed with what to do), 2 = could not run.
 * It only reads; it never edits a file.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const args = process.argv.slice(2)
if (args.includes('--help') || args.includes('-h') || args.length === 0) {
  console.log(readFileSync(import.meta.path, 'utf8').replace(/^#!.*\n/, '').split('*/')[0].replace(/^\/\*\*?|^ \* ?/gm, ''))
  process.exit(args.length === 0 ? 2 : 0)
}
// Bun.YAML is built in from Bun 1.3 — without it every SKILL.md would read as "invalid YAML" (exit 1),
// which is a verdict about the runtime, not the repo. Say so and exit 2 instead.
if (typeof (Bun as any).YAML?.parse !== 'function') {
  console.error(`check-manifests: cannot run — needs Bun >= 1.3 for its built-in YAML parser; you are on ${Bun.version}. Run \`bun upgrade\`.`)
  process.exit(2)
}
const root = resolve(args[0])
const baseIdx = args.indexOf('--base')
const base = baseIdx >= 0 ? args[baseIdx + 1] : undefined
if (baseIdx >= 0 && !base) fail2('--base needs a git ref, e.g. --base origin/main')

const problems: string[] = []
const bad = (msg: string) => problems.push(msg)
function fail2(msg: string): never {
  console.error(`check-manifests: cannot run — ${msg}`)
  process.exit(2)
}
function readJson(path: string, label: string): any {
  if (!existsSync(path)) { bad(`${label}: missing file ${path}`); return undefined }
  try { return JSON.parse(readFileSync(path, 'utf8')) } catch (e) {
    bad(`${label}: ${path} is not valid JSON (${(e as Error).message}) — fix the syntax first`)
    return undefined
  }
}

const claudeMkt = readJson(join(root, '.claude-plugin/marketplace.json'), 'Claude marketplace')
const codexMkt = readJson(join(root, '.agents/plugins/marketplace.json'), 'Codex marketplace')
if (!claudeMkt && !codexMkt) fail2(`${root} has neither marketplace manifest — is this the marketplace root?`)

const names = (m: any) => new Set<string>((m?.plugins ?? []).map((p: any) => p.name))
const claudeNames = names(claudeMkt)
const codexNames = names(codexMkt)
for (const n of claudeNames) if (codexMkt && !codexNames.has(n)) bad(`plugin "${n}" is in the Claude marketplace but not the Codex one — add it to .agents/plugins/marketplace.json`)
for (const n of codexNames) if (claudeMkt && !claudeNames.has(n)) bad(`plugin "${n}" is in the Codex marketplace but not the Claude one — add it to .claude-plugin/marketplace.json`)

const norm = (p: string) => p.replace(/^\.\//, '').replace(/\/$/, '')
const claudeSrc = (name: string) => {
  const e = (claudeMkt?.plugins ?? []).find((p: any) => p.name === name)
  return typeof e?.source === 'string' ? norm(e.source) : undefined
}
const codexSrc = (name: string) => {
  const e = (codexMkt?.plugins ?? []).find((p: any) => p.name === name)
  return typeof e?.source?.path === 'string' ? norm(e.source.path) : undefined
}
const srcOf = (name: string) => claudeSrc(name) ?? codexSrc(name) ?? `plugins/${name}`

const versions = new Map<string, string>()
for (const name of new Set([...claudeNames, ...codexNames])) {
  const cs = claudeSrc(name), xs = codexSrc(name)
  if (claudeNames.has(name) && !cs) bad(`plugin "${name}": its Claude marketplace entry has no string "source" path — set it to "./plugins/${name}"`)
  if (codexNames.has(name) && !xs) bad(`plugin "${name}": its Codex marketplace entry has no "source": {"source": "local", "path": …} — add the path`)
  if (cs && xs && cs !== xs) bad(`plugin "${name}": the two marketplaces point at different directories (claude "${cs}" vs codex "${xs}") — make them the same path`)
  const src = srcOf(name)
  const dir = join(root, src)
  const c = readJson(join(dir, '.claude-plugin/plugin.json'), `plugin "${name}" (Claude manifest)`)
  const x = readJson(join(dir, '.codex-plugin/plugin.json'), `plugin "${name}" (Codex manifest)`)
  if (c && c.name !== name) bad(`plugin "${name}": its Claude plugin.json says name "${c.name}" — the marketplace entry and the manifest must agree`)
  if (x && x.name !== name) bad(`plugin "${name}": its Codex plugin.json says name "${x.name}" — the marketplace entry and the manifest must agree`)
  if (c && x && c.version !== x.version) bad(`plugin "${name}": versions differ (claude ${c.version} vs codex ${x.version}) — bump both in lockstep`)
  if (c?.version) versions.set(name, c.version)
  const skillsDir = join(dir, 'skills')
  if (!existsSync(skillsDir)) continue
  for (const skill of readdirSync(skillsDir, { withFileTypes: true }).filter((d) => d.isDirectory())) {
    const md = join(skillsDir, skill.name, 'SKILL.md')
    if (!existsSync(md)) { bad(`${name}/${skill.name}: directory has no SKILL.md`); continue }
    const m = readFileSync(md, 'utf8').match(/^---\n([\s\S]*?)\n---/)
    if (!m) { bad(`${name}/${skill.name}: SKILL.md has no frontmatter block`); continue }
    let fm: any
    try { fm = Bun.YAML.parse(m[1]) } catch (e) { bad(`${name}/${skill.name}: frontmatter is not valid YAML (${(e as Error).message})`); continue }
    if (!fm?.description) bad(`${name}/${skill.name}: frontmatter has no description — the skill can never trigger`)
    if (fm?.name !== skill.name) bad(`${name}/${skill.name}: frontmatter name "${fm?.name}" differs from its directory`)
  }
}

if (base) {
  const git = (...a: string[]) => {
    const r = Bun.spawnSync(['git', '-C', root, ...a])
    if (r.exitCode !== 0) fail2(`git ${a.join(' ')} failed: ${r.stderr.toString().trim()}`)
    return r.stdout.toString()
  }
  git('rev-parse', '--verify', `${base}^{commit}`)
  const changed = git('diff', '--name-only', base, '--').split('\n').filter(Boolean)
  const untracked = git('ls-files', '--others', '--exclude-standard').split('\n').filter(Boolean)
  const touched = [...changed, ...untracked]
  // semver-ish compare: numeric dot parts, a pre-release suffix sorts below the release
  const cmp = (a: string, b: string) => {
    const [ma, pa = ''] = a.split('-', 2), [mb, pb = ''] = b.split('-', 2)
    const na = ma.split('.').map(Number), nb = mb.split('.').map(Number)
    for (let i = 0; i < Math.max(na.length, nb.length); i++) {
      const d = (na[i] ?? 0) - (nb[i] ?? 0)
      if (d) return Math.sign(d)
    }
    if (pa === pb) return 0
    return pa === '' ? 1 : pb === '' ? -1 : pa < pb ? -1 : 1
  }
  for (const [name, version] of versions) {
    const src = srcOf(name)
    if (!touched.some((f) => f.startsWith(src + '/'))) continue
    const r = Bun.spawnSync(['git', '-C', root, 'show', `${base}:${src}/.claude-plugin/plugin.json`])
    if (r.exitCode !== 0) continue // a plugin new since base: nothing to compare against
    const old = JSON.parse(r.stdout.toString()).version
    if (cmp(version, old) <= 0) bad(`plugin "${name}" changed since ${base} but its version ${version} is not greater than ${old} — installed clients will never re-pull it; bump both manifests upward`)
  }
  const r = Bun.spawnSync(['git', '-C', root, 'show', `${base}:.claude-plugin/marketplace.json`])
  if (r.exitCode === 0 && claudeMkt) {
    const old = JSON.parse(r.stdout.toString())
    const before = [...names(old)].sort().join(',')
    const after = [...claudeNames].sort().join(',')
    if (before !== after && old?.metadata?.version === claudeMkt?.metadata?.version)
      bad(`the plugin list changed since ${base} but metadata.version is still ${claudeMkt?.metadata?.version} — bump it, or clients never discover the new list`)
  }
}

if (problems.length) {
  console.log(`check-manifests: ${problems.length} problem(s) in ${root}`)
  for (const p of problems) console.log(`  ✗ ${p}`)
  process.exit(1)
}
console.log(`check-manifests: clean — ${versions.size} plugins, both marketplaces agree${base ? `, versions bumped vs ${base}` : ''}`)
