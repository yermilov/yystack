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
 *   4. no directory under plugins/ that looks like a plugin (a manifest or skills/) is missing from both marketplaces
 *   5. a plugin's hooks/hooks.json, and a skill's agents/openai.yaml, parse when present
 * With --base <ref> (e.g. origin/main), it also checks the VERSION DISCIPLINE of the change:
 *   6. every plugin whose files changed since <ref> has a GREATER version than at <ref>
 *   7. if the Claude marketplace manifest changed since <ref> (a plugin added or removed, or an
 *      entry edited), its metadata.version changed too
 *   and it NOTES every skill or plugin that existed at <ref> and is gone now, wherever its old name is
 *   still written (bare in backticks, or as <plugin>:<skill>) — a shortlist for pre-ship items 12–14.
 * It also prints NOTES (not defects): no LICENSE (required for a public repo, optional for a private
 * one, and the script cannot tell which this is); a plugin the root README never names; a skill its
 * plugin README never names. A README mention is prose, so these are a shortlist to read, not a verdict.
 *
 * Exit 0 = clean, 1 = a defect listed above (each printed with what to do), 2 = could not run
 * (including an unknown flag or a second root).
 * It only reads; it never edits a file.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const args = process.argv.slice(2)
const usage = () => readFileSync(import.meta.path, 'utf8').replace(/^#!.*\n/, '').split('*/')[0].replace(/^\/\*\*?|^ \* ?/gm, '')
function fail2(msg: string): never {
  console.error(`check-manifests: cannot run — ${msg} (permanent: fix the command line or the path)`)
  process.exit(2)
}
// One pass over the arguments, refusing anything we do not parse: a typo'd or repeated flag silently
// ignored (`--bse origin/main`, a second `--base`) would skip the version check and still say "clean".
// --help wins only when the rest of the line is valid.
let base: string | undefined
let help = false
const positional: string[] = []
for (let i = 0; i < args.length; i++) {
  const a = args[i]
  if (a === '--help' || a === '-h') help = true
  else if (a === '--base') {
    if (base !== undefined) fail2('--base given twice')
    const v = args[i + 1]
    if (v === undefined || v.trim() === '' || v.startsWith('-')) fail2('--base needs a git ref, e.g. --base origin/main')
    base = v
    i++
  } else if (a.startsWith('-')) fail2(`unknown flag ${a}; the flags are --base <git-ref> and --help`)
  else positional.push(a)
}
if (positional.length > 1) fail2(`expected exactly one MARKETPLACE_ROOT argument, got ${positional.length}: ${positional.join(' ')}`)
if (help || args.length === 0) {
  console.log(usage())
  process.exit(args.length === 0 ? 2 : 0)
}
if (positional.length !== 1) fail2('expected exactly one MARKETPLACE_ROOT argument, got (none)')
// Bun.YAML is built in from Bun 1.3 — without it every SKILL.md would read as "invalid YAML" (exit 1),
// which is a verdict about the runtime, not the repo. Say so and exit 2 instead.
if (typeof (Bun as any).YAML?.parse !== 'function') {
  console.error(`check-manifests: cannot run — needs Bun >= 1.3 for its built-in YAML parser; you are on ${Bun.version}. Run \`bun upgrade\`.`)
  process.exit(2)
}
const root = resolve(positional[0])

const problems: string[] = []
const notes: string[] = []
const bad = (msg: string) => problems.push(msg)

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
  const claudeEntry = (claudeMkt?.plugins ?? []).find((p: any) => p.name === name)
  if (claudeNames.has(name) && !cs && claudeEntry?.source && typeof claudeEntry.source === 'object' && !xs) {
    // A remote source (another repo) is valid for Claude; its files are not here to check.
    notes.push(`plugin "${name}" has a remote Claude source; its manifests and skills were not checked`)
    if (codexNames.has(name)) bad(`plugin "${name}": its Codex marketplace entry has no "source": {"source": "local", "path": …} — add the path`)
    continue
  }
  if (claudeNames.has(name) && !cs && typeof claudeEntry?.source !== 'object') bad(`plugin "${name}": its Claude marketplace entry has no "source" — set it to "./plugins/${name}" (or a remote source object)`)
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
  const hooks = join(dir, 'hooks/hooks.json')
  if (existsSync(hooks)) readJson(hooks, `plugin "${name}" (hooks)`)
  const rootReadme = join(root, 'README.md')
  if (existsSync(rootReadme) && !readFileSync(rootReadme, 'utf8').includes(name)) notes.push(`plugin "${name}" is never named in the root README — add its Plugins-table row (plugin-dev §7)`)
  const pluginReadme = join(dir, 'README.md')
  const pluginReadmeText = existsSync(pluginReadme) ? readFileSync(pluginReadme, 'utf8') : undefined
  if (pluginReadmeText === undefined) notes.push(`plugin "${name}" has no README.md (plugin-dev §7)`)
  const skillsDir = join(dir, 'skills')
  if (!existsSync(skillsDir)) continue
  // A dot-directory (an editor or tool cache such as `.cache/`) is not a skill, and is usually
  // gitignored, so it never ships; flagging it would fail a clean repo.
  for (const skill of readdirSync(skillsDir, { withFileTypes: true }).filter((d) => d.isDirectory() && !d.name.startsWith('.'))) {
    const md = join(skillsDir, skill.name, 'SKILL.md')
    if (!existsSync(md)) { bad(`${name}/${skill.name}: directory has no SKILL.md`); continue }
    const m = readFileSync(md, 'utf8').match(/^---\n([\s\S]*?)\n---/)
    if (!m) { bad(`${name}/${skill.name}: SKILL.md has no frontmatter block`); continue }
    let fm: any
    try { fm = Bun.YAML.parse(m[1]) } catch (e) { bad(`${name}/${skill.name}: frontmatter is not valid YAML (${(e as Error).message})`); continue }
    if (!fm?.description) bad(`${name}/${skill.name}: frontmatter has no description — the skill can never trigger`)
    if (fm?.name !== skill.name) bad(`${name}/${skill.name}: frontmatter name "${fm?.name}" differs from its directory`)
    const oa = join(skillsDir, skill.name, 'agents/openai.yaml')
    if (existsSync(oa)) { try { Bun.YAML.parse(readFileSync(oa, 'utf8')) } catch (e) { bad(`${name}/${skill.name}: agents/openai.yaml is not valid YAML (${(e as Error).message})`) } }
    if (pluginReadmeText !== undefined && !pluginReadmeText.includes(skill.name)) notes.push(`skill "${skill.name}" is never named in plugins/${name}'s README — add its bullet (plugin-dev §7)`)
  }
}

// A plugin directory nobody registered is invisible to both hosts — the forgotten step of «Add a plugin».
const listedDirs = new Set([...claudeNames, ...codexNames].map(srcOf))
const pluginsRoot = join(root, 'plugins')
if (existsSync(pluginsRoot)) {
  for (const d of readdirSync(pluginsRoot, { withFileTypes: true }).filter((d) => d.isDirectory() && !d.name.startsWith('.'))) {
    const rel = `plugins/${d.name}`
    const looksLikePlugin = ['.claude-plugin/plugin.json', '.codex-plugin/plugin.json', 'skills'].some((f) => existsSync(join(root, rel, f)))
    if (looksLikePlugin && !listedDirs.has(rel)) bad(`${rel} looks like a plugin (a manifest or skills/) but neither marketplace lists it — give it both plugin.json manifests, add it to both marketplace.json files, and bump metadata.version`)
  }
}

const parseAt = (text: string, what: string): any => {
  try { return JSON.parse(text) } catch (e) { fail2(`${what} at ${base} is not valid JSON (${(e as Error).message}) — pick a base ref where it parses`) }
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
    const old = parseAt(r.stdout.toString(), `${src}/.claude-plugin/plugin.json`)?.version
    if (typeof old !== 'string') { notes.push(`plugin "${name}": its plugin.json at ${base} has no version, so the bump could not be compared`); continue }
    if (cmp(version, old) <= 0) bad(`plugin "${name}" changed since ${base} but its version ${version} is not greater than ${old} — installed clients will never re-pull it; bump both manifests upward`)
  }
  // Stale references (pre-ship items 12–13): a skill or plugin that existed at base and is gone now
  // leaves its old name behind in routing pointers, `Requires:` lines and qualified `<plugin>:<skill>`
  // references. Read the tree at base, list what disappeared, and grep the working tree for it. These
  // are NOTES (a shortlist to read): a name can legitimately survive in a changelog or a precedent.
  const skillDirsAt = (lines: string[]) => new Set(lines.map((f) => f.match(/^plugins\/([^/]+)\/skills\/([^/]+)\/SKILL\.md$/)).filter(Boolean).map((m) => `${m![1]}/${m![2]}`))
  const before = skillDirsAt(git('ls-tree', '-r', '--name-only', base, '--', 'plugins').split('\n'))
  const nowFiles = git('ls-files', '--cached', '--others', '--exclude-standard', '--', 'plugins').split('\n').filter((f) => f && existsSync(join(root, f)))
  const now = skillDirsAt(nowFiles)
  const nowSkills = new Set([...now].map((s) => s.split('/')[1]))
  // A plugin still exists if it is still listed or still has a manifest — not merely if it still has skills.
  const nowPlugins = new Set([...versions.keys()].map((n) => srcOf(n).split('/').pop()!))
  const goneSkills = [...before].filter((s) => !now.has(s))
  if (goneSkills.length) {
    const textFiles = git('ls-files', '--cached', '--others', '--exclude-standard').split('\n')
      .filter((f) => /\.(md|json|ya?ml|ts|toml)$/.test(f) && existsSync(join(root, f)))
    const texts = textFiles.map((f) => [f, readFileSync(join(root, f), 'utf8')] as const)
    const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const hits = (re: RegExp) => texts.filter(([, x]) => re.test(x)).map(([f]) => f)
    const goneNoted = new Set<string>()
    for (const s of goneSkills) {
      const [plugin, skill] = s.split('/')
      const qualified = hits(new RegExp(`(^|[^\\w-])${esc(plugin)}:${esc(skill)}(?![\\w-])`))
      if (qualified.length) notes.push(`"${plugin}:${skill}" no longer exists but is still named in: ${qualified.join(', ')} — rewrite each (§6 rule G)`)
      if (!nowSkills.has(skill)) {
        const bare = hits(new RegExp(`\`${esc(skill)}\``)).filter((f) => !qualified.includes(f))
        if (bare.length) notes.push(`skill "${skill}" no longer exists but \`${skill}\` is still named in: ${bare.join(', ')} — repair or point at its replacement (§6 rule G)`)
      }
      if (!nowPlugins.has(plugin) && !goneNoted.has(plugin)) {
        goneNoted.add(plugin)
        notes.push(`plugin "${plugin}" no longer exists — its installers keep a dead install: if its skills moved, tell them the new install command in the README; if it was retired, say so (§6 rule N)`)
      }
    }
  }
  const r = Bun.spawnSync(['git', '-C', root, 'show', `${base}:.claude-plugin/marketplace.json`])
  if (r.exitCode === 0 && claudeMkt) {
    const old = parseAt(r.stdout.toString(), '.claude-plugin/marketplace.json')
    const before = [...names(old)].sort().join(',')
    const after = [...claudeNames].sort().join(',')
    const strip = (m: any) => JSON.stringify({ ...m, metadata: { ...m?.metadata, version: undefined } })
    const oldV = String(old?.metadata?.version ?? '0'), newV = String(claudeMkt?.metadata?.version ?? '0')
    if (cmp(newV, oldV) <= 0) {
      if (before !== after) bad(`the plugin list changed since ${base} but metadata.version ${newV} is not greater than ${oldV} — bump it upward, or clients never discover the new list`)
      else if (strip(old) !== strip(claudeMkt)) bad(`.claude-plugin/marketplace.json was edited since ${base} but metadata.version ${newV} is not greater than ${oldV} — bump it upward, or clients may keep the cached manifest`)
    }
  }
}

const hasLicense = existsSync(root) && readdirSync(root).some((f) => /^(LICEN[CS]E|COPYING)(\.|$)/i.test(f))
if (!hasLicense) notes.unshift('no LICENSE file; a PUBLIC marketplace needs one (pre-ship item 6), a private one may skip it')
for (const n of notes) console.log(`check-manifests: note — ${n}`)
if (problems.length) {
  console.log(`check-manifests: ${problems.length} problem(s) in ${root}`)
  for (const p of problems) console.log(`  ✗ ${p}`)
  process.exit(1)
}
console.log(`check-manifests: clean — ${versions.size} plugins, both marketplaces agree${base ? `, versions bumped vs ${base}` : ''}`)
