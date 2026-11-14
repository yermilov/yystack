#!/usr/bin/env bun
/**
 * check-health — the read-only half of marketplace-health, for Claude Code and Codex.
 *
 *   bun run "SKILLDIR/scripts/check-health.ts" [MARKETPLACE_NAME] [--host claude|codex|both] [--offline]
 *
 * For each configured marketplace (or the one named) it reports, without changing anything:
 *   Claude Code
 *     - the local catalog clone's commit vs the remote's (`git ls-remote`, read-only)
 *     - per installed plugin: the ACTIVE version (`claude plugin list --json`) vs the version the
 *       remote publishes (the clone's manifest when the clone is current; otherwise, for a GitHub
 *       source, the manifest read from raw.githubusercontent.com; otherwise "unverified")
 *     - every explicit autoUpdate value with the file it came from (settings scopes + the registry)
 *     - the global env override (DISABLE_AUTOUPDATER / FORCE_AUTOUPDATE_PLUGINS) in THIS process's
 *       environment and in the `env` block of every settings scope (shell profiles: check by hand)
 *   Codex
 *     - source_type (git = auto-updates, local = never does). A local source inside Codex's own
 *       home or runtime cache is host-managed: reported as info, never as a finding.
 *     - per installed plugin: the ACTIVE version (`codex plugin list --json`) vs the remote's
 *       (GitHub sources only)
 *
 * --offline skips every network read; remote versions are then reported as unverified, as info rather
 * than findings, so an offline run can never certify the versions, only the settings.
 * Unscoped, it lists every Claude Code marketplace in the registry, but only the Codex marketplaces
 * something is installed from (Codex configures several host-bundled ones you never use). Name a
 * marketplace when the question is about one.
 * Exit 0 = healthy, 1 = a finding (stale, auto-update off/conflicting, unverified), 2 = could not run
 * (including: the named marketplace is configured on no host checked, or nothing was checked at all).
 * It never refreshes, installs or edits a file — those are state changes the skill gates.
 */
import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const args = process.argv.slice(2)
if (args.includes('--help') || args.includes('-h')) {
  console.log(readFileSync(import.meta.path, 'utf8').replace(/^#!.*\n/, '').split('*/')[0].replace(/^\/\*\*?|^ \* ?/gm, ''))
  process.exit(0)
}
const hostIdx = args.indexOf('--host')
const hostArg = hostIdx >= 0 ? args[hostIdx + 1] : 'both'
if (!['claude', 'codex', 'both'].includes(hostArg ?? '')) fail2('--host takes claude, codex or both')
const offline = args.includes('--offline')
const positional = args.filter((a, i) => !a.startsWith('-') && !(hostIdx >= 0 && i === hostIdx + 1))
if (positional.length > 1) fail2(`expected at most one MARKETPLACE_NAME, got: ${positional.join(' ')}`)
const only = positional[0]

function fail2(msg: string): never {
  console.error(`check-health: cannot run — ${msg}`)
  process.exit(2)
}
let findings = 0
let checked = 0
const flag = (msg: string) => { findings++; console.log(`  ✗ ${msg}`) }
const ok = (msg: string) => console.log(`  ✓ ${msg}`)
const info = (msg: string) => console.log(`  · ${msg}`)

const readJson = (p: string): any => {
  try { return JSON.parse(readFileSync(p, 'utf8')) } catch { return undefined }
}
// undefined on ANY failure — a non-zero exit, a timeout, or the executable missing from PATH
// (Bun throws for that one), so callers report "unverified" instead of crashing.
const run = (cmd: string[], timeoutMs = 20000): string | undefined => {
  try {
    const r = Bun.spawnSync(cmd, { timeout: timeoutMs, stderr: 'pipe' })
    return r.exitCode === 0 ? r.stdout.toString().trim() : undefined
  } catch { return undefined }
}
// A semver-ish version ("1.2.3", "1.2.3-beta") can be ordered; anything else (a git sha, which Claude
// Code uses for a plugin that declares no version) can only be compared for equality.
const semverish = (v: string) => /^\d+(\.\d+)*(-[\w.]+)?$/.test(v)
// numeric dot parts; a pre-release suffix sorts below the release
const cmp = (a: string, b: string) => {
  const [ma, pa = ''] = a.split('-', 2), [mb, pb = ''] = b.split('-', 2)
  const na = ma.split('.').map(Number), nb = mb.split('.').map(Number)
  for (let i = 0; i < Math.max(na.length, nb.length); i++) {
    const d = (na[i] ?? 0) - (nb[i] ?? 0)
    if (d) return Math.sign(d)
  }
  return pa === pb ? 0 : pa === '' ? 1 : pb === '' ? -1 : pa < pb ? -1 : 1
}
const githubRepo = (src: any): string | undefined => {
  if (src?.source === 'github' && typeof src.repo === 'string') return src.repo
  const url = typeof src === 'string' ? src : src?.url
  const m = typeof url === 'string' ? url.match(/github\.com[:/]([^/]+\/[^/.]+?)(\.git)?$/) : null
  return m?.[1]
}
// `ref` is the branch or tag the marketplace is pinned to; without one, the default branch.
async function rawJson(repo: string, path: string, ref = 'HEAD'): Promise<any> {
  if (offline) return undefined
  try {
    const r = await fetch(`https://raw.githubusercontent.com/${repo}/${encodeURIComponent(ref)}/${path.replace(/^\.\//, '')}`, { signal: AbortSignal.timeout(15000) })
    return r.ok ? await r.json() : undefined
  } catch { return undefined }
}
// Version of each plugin a catalog (marketplace.json) lists, read from <root> on disk or from GitHub.
// Each host reads its own catalog: Claude `.claude-plugin/marketplace.json`, Codex
// `.agents/plugins/marketplace.json` (falling back to the Claude one, which lists the same plugins).
const CATALOGS: Record<string, string[]> = {
  '.claude-plugin': ['.claude-plugin/marketplace.json'],
  '.codex-plugin': ['.agents/plugins/marketplace.json', '.claude-plugin/marketplace.json'],
}
async function catalogVersions(fromDisk: string | undefined, repo: string | undefined, manifestDir: string, ref?: string): Promise<Map<string, string> | undefined> {
  let mkt: any
  for (const cat of CATALOGS[manifestDir]) {
    mkt = fromDisk ? readJson(join(fromDisk, cat)) : repo ? await rawJson(repo, cat, ref) : undefined
    if (mkt?.plugins) break
  }
  if (!mkt?.plugins) return undefined
  const out = new Map<string, string>()
  for (const p of mkt.plugins) {
    const raw = typeof p.source === 'string' ? p.source : typeof p.source?.path === 'string' ? p.source.path : `plugins/${p.name}`
    const src = raw.replace(/^\.\//, '').replace(/\/$/, '')
    const pj = fromDisk ? readJson(join(fromDisk, src, manifestDir, 'plugin.json')) : await rawJson(repo!, `${src}/${manifestDir}/plugin.json`, ref)
    if (pj?.version) out.set(p.name, pj.version)
  }
  return out
}

// The commit the clone SHOULD be at: the pinned ref's (a commit sha is its own answer; a branch or
// tag is resolved with ls-remote, preferring the peeled `^{}` line of an annotated tag), else HEAD.
function remoteCommit(loc: string, ref?: string): string | undefined {
  if (ref && /^[0-9a-f]{7,40}$/i.test(ref)) {
    return run(['git', '-C', loc, 'rev-parse', '--verify', '--quiet', `${ref}^{commit}`]) // known locally, else unverified
  }
  const out = run(['git', '-C', loc, 'ls-remote', 'origin', ...(ref ? [`refs/heads/${ref}`, `refs/tags/${ref}`, `refs/tags/${ref}^{}`] : ['HEAD'])])
  const lines = (out ?? '').split('\n').filter(Boolean).map((l) => l.split(/\s+/))
  return (lines.find(([, n]) => n?.endsWith('^{}')) ?? lines[0])?.[0]
}

// What the remote publishes, read without changing anything. Prefer the host's own catalog clone:
// when its commit equals the remote's (git ls-remote, the user's own git credentials), its manifests
// ARE the remote's. Otherwise fall back to GitHub's raw files (public repos only).
async function remoteSide(loc: string | undefined, repo: string | undefined, ref: string | undefined,
  manifestDir: string, refreshCmd: string): Promise<{ versions?: Map<string, string>; label: string; behind?: boolean }> {
  const viaGithub = async () => {
    const v = repo ? await catalogVersions(undefined, repo, manifestDir, ref) : undefined
    return v ? { versions: v, label: 'remote (GitHub)' } : { label: 'unverified' }
  }
  if (loc && existsSync(join(loc, '.git'))) {
    const local = run(['git', '-C', loc, 'rev-parse', 'HEAD'])
    const remote = offline ? undefined : remoteCommit(loc, ref)
    if (local && remote && local === remote) {
      ok(`catalog clone is current (${local.slice(0, 7)})`)
      return { versions: await catalogVersions(loc, undefined, manifestDir), label: 'remote' }
    }
    if (local && remote) {
      flag(`catalog clone is behind: local ${local.slice(0, 7)}, remote ${remote.slice(0, 7)} — a refresh (\`${refreshCmd}\`) is needed before an update can land`)
      const r = await viaGithub()
      if (!r.versions) info('per-plugin remote versions unreadable without a refresh (not a public GitHub repo) — re-check after it')
      return { ...r, behind: true }
    }
    info(`could not compare the catalog clone with its remote${offline ? ' (--offline)' : ''}`)
    return viaGithub()
  }
  if (!repo) info('no git clone and no GitHub source — remote versions unverified')
  return viaGithub()
}

// Marketplaces the host itself ships, where an unset flag means its own default rather than off.
const OFFICIAL = new Set(['claude-plugins-official'])

async function claude() {
  const regPath = join(homedir(), '.claude/plugins/known_marketplaces.json')
  const registry = readJson(regPath)
  if (!registry) { console.log('Claude Code: no marketplace registry at ~/.claude/plugins/known_marketplaces.json — skipped'); return }
  const listOut = run(['claude', 'plugin', 'list', '--json'])
  let installed: any[] | undefined
  try { installed = listOut ? JSON.parse(listOut) : undefined } catch { installed = undefined }
  // The override can come from this process's environment or from any settings scope's `env` block.
  // Project scopes are read relative to the working directory: say which one, so a run from
  // elsewhere is visibly a run that skipped them.
  const settingsFiles = ['.claude/settings.local.json', '.claude/settings.json', join(homedir(), '.claude/settings.json')]
  console.log(`Claude Code: project settings read from ${process.cwd()}/.claude (run from the project root to include them)`)
  const envSources: [string, Record<string, unknown>][] = [['process environment', process.env]]
  for (const f of settingsFiles) { const e = readJson(f)?.env; if (e && typeof e === 'object') envSources.push([`${f} env`, e]) }
  const envSeen = envSources.flatMap(([where, e]) => ['DISABLE_AUTOUPDATER', 'FORCE_AUTOUPDATE_PLUGINS']
    .filter((k) => e[k] !== undefined).map((k) => `${k}=${e[k]} (${where})`))
  // Precedence between the process env and the settings scopes is not documented here, so a variable
  // set to different values in different places is reported as a conflict, never resolved.
  const valuesOf = (k: string) => new Set(envSources.filter(([, e]) => e[k] !== undefined).map(([, e]) => String(e[k])))
  const envConflict = ['DISABLE_AUTOUPDATER', 'FORCE_AUTOUPDATE_PLUGINS'].filter((k) => valuesOf(k).size > 1)
  const is1 = (k: string) => valuesOf(k).size === 1 && valuesOf(k).has('1')
  const globallyOff = envConflict.length === 0 && is1('DISABLE_AUTOUPDATER') && !is1('FORCE_AUTOUPDATE_PLUGINS')
  const env = envSeen.length ? envSeen.join('; ') : 'neither variable set'
  for (const [name, m] of Object.entries<any>(registry)) {
    if (only && name !== only) continue
    console.log(`Claude Code — marketplace ${name}`)
    checked++
    if (!installed) flag('`claude plugin list --json` failed — installed versions unverified')
    const loc: string | undefined = m.installLocation
    const repo = githubRepo(m.source)
    const ref: string | undefined = typeof m.source?.ref === 'string' ? m.source.ref : undefined
    const { versions: remoteVersions, label: remoteLabel, behind } = await remoteSide(loc, repo, ref, '.claude-plugin', `claude plugin marketplace update ${name}`)
    // One row per scope (user, each project): group by plugin, so nine scopes are one line, and
    // name the scopes when they disagree, since stale-in-one-scope is a real state.
    const byPlugin = new Map<string, any[]>()
    for (const p of (installed ?? []).filter((x) => String(x.id).endsWith(`@${name}`))) {
      const plugin = String(p.id).split('@')[0]
      byPlugin.set(plugin, [...(byPlugin.get(plugin) ?? []), p])
    }
    for (const [plugin, rows] of byPlugin) {
      const want = remoteVersions?.get(plugin)
      const versions = new Map<string, string[]>()
      for (const r of rows) {
        const v = typeof r.version === 'string' ? r.version : '(none)'
        versions.set(v, [...(versions.get(v) ?? []), r.projectPath ? `${r.scope ?? '?'} ${r.projectPath}` : String(r.scope ?? '?')])
      }
      const shown = [...versions].map(([v, sc]) => versions.size === 1 && sc.length === 1 ? v : `${v} (${sc.length === 1 ? sc[0] : `${sc.length} scopes`})`).join(', ')
      if (versions.has('(none)')) { flag(`${plugin}: the registry lists no version in some scope — installed version unverified (${shown})`); continue }
      if (!want) {
        const commitOnly = [...versions.keys()].every((v) => !semverish(v))
        const msg = commitOnly
          ? `${plugin}: installed ${shown} — a plugin with no declared version, identified by commit; this checker cannot compute the remote commit, so \`claude plugin update ${plugin}@${name}\` is the only way to be sure it is current`
          : `${plugin}: installed ${shown}; remote version unverified`
        if (offline) info(msg)
        else if (!(behind && !remoteVersions)) flag(msg)
        continue
      }
      const stale = [...versions.keys()].filter((v) =>
        semverish(v) && semverish(want) ? cmp(v, want) < 0 : v !== want)
      const shaNote = [...versions.keys()].some((v) => !semverish(v)) || !semverish(want) ? ' (sha versions: compared for equality only)' : ''
      const staleWhere = stale.flatMap((v) => versions.get(v) ?? [])
      const where = staleWhere.length > 5 ? `${staleWhere.slice(0, 5).join('; ')}; +${staleWhere.length - 5} more` : staleWhere.join('; ')
      if (stale.length) flag(`${plugin}: installed ${shown} vs ${remoteLabel} ${want} → STALE in: ${where}${shaNote} (\`claude plugin update ${plugin}@${name}\` after the catalog refresh; restart to apply)`)
      else ok(`${plugin}: installed ${shown} = ${remoteLabel} ${want}${shaNote}`)
    }
    // «Enabled in settings but never appeared»: an enabledPlugins entry the registry does not list.
    // A user-scope install serves every project; a project or local enable is also met by an install
    // recorded for THIS project (the working directory), never by one in another project.
    const here = realpathSync(process.cwd())
    const sameDir = (p: unknown) => { try { return typeof p === 'string' && realpathSync(p) === here } catch { return false } }
    const installedFor = (id: string, userScope: boolean) => (installed ?? []).some((x) =>
      String(x.id) === id && (x.scope === 'user' || (!userScope && sameDir(x.projectPath))))
    for (const f of settingsFiles) {
      const en = readJson(f)?.enabledPlugins
      if (!en || typeof en !== 'object' || !installed) continue
      const userScope = f === join(homedir(), '.claude/settings.json')
      for (const [id, on] of Object.entries(en)) {
        if (on === true && id.endsWith(`@${name}`) && !installedFor(id, userScope)) flag(`${id}: enabled in ${f} but not installed ${userScope ? 'at user scope' : `for ${here}`} — see «Never appeared at all»`)
      }
    }
    const values: string[] = []
    for (const f of settingsFiles) {
      const v = readJson(f)?.extraKnownMarketplaces?.[name]?.autoUpdate
      if (typeof v === 'boolean') values.push(`${f}: ${v}`)
    }
    if (typeof m.autoUpdate === 'boolean') values.push(`${regPath}: ${m.autoUpdate}`)
    const bools = values.map((v) => v.endsWith('true'))
    if (values.length === 0 && OFFICIAL.has(name)) info('autoUpdate: not set — the host\'s own official marketplace updates by default (Claude Code docs; not measured here)')
    else if (values.length === 0) flag('autoUpdate: not set anywhere → off for a third-party marketplace (enable-autoupdate turns it on)')
    else if (bools.every(Boolean)) ok(`autoUpdate: on (${values.join('; ')})`)
    else if (bools.every((b) => !b)) flag(`autoUpdate: off (${values.join('; ')})`)
    else flag(`autoUpdate: conflicting values — ${values.join('; ')} (precedence undocumented)`)
    if (envConflict.length) flag(`global override: ${envConflict.join(', ')} set to different values in different places — ${env}; which applies is unverified`)
    else if (globallyOff) flag(`global override: ${env} → ALL updates are off in this environment`)
    else info(`global override: ${env} — shell profile files are not read; check them by hand`)
  }
}

function codexSourceType(toml: string, name: string): { type?: string; source?: string; ref?: string } {
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const block = toml.match(new RegExp(`^\\[marketplaces\\.${esc}\\]\\s*\\n([\\s\\S]*?)(?=^\\[|$(?![\\s\\S]))`, 'm'))?.[1] ?? ''
  return {
    type: block.match(/^source_type\s*=\s*"([^"]*)"/m)?.[1],
    source: block.match(/^source\s*=\s*"([^"]*)"/m)?.[1],
    ref: block.match(/^ref\s*=\s*"([^"]*)"/m)?.[1], // set by `codex plugin marketplace add --ref`
  }
}

async function codex() {
  const home = process.env.CODEX_HOME ?? join(homedir(), '.codex')
  const cfgPath = join(home, 'config.toml')
  if (!existsSync(cfgPath)) { console.log(`Codex: no ${cfgPath} — skipped`); return }
  const toml = readFileSync(cfgPath, 'utf8')
  const rootsOut = run(['codex', 'plugin', 'marketplace', 'list', '--json'])
  let roots: Record<string, string> = {}
  try { for (const m of JSON.parse(rootsOut ?? '{}')?.marketplaces ?? []) roots[m.name] = m.root } catch { roots = {} }
  const listOut = run(['codex', 'plugin', 'list', '--json'])
  let active: any[] | undefined
  try { active = listOut ? JSON.parse(listOut)?.installed : undefined } catch { active = undefined }
  const names = [...toml.matchAll(/^\[marketplaces\.([^\]]+)\]/gm)].map((m) => m[1])
  for (const name of names) {
    if (only && name !== only) continue
    const { type, source, ref } = codexSourceType(toml, name)
    const mine = active?.filter((p) => p.marketplaceName === name && p.installed !== false)
    const cache = join(home, 'plugins/cache', name)
    if (!only && (active ? !mine?.length : !existsSync(cache))) continue // nothing installed from it
    console.log(`Codex — marketplace ${name}`)
    checked++
    // Only Codex's own bundled and runtime paths are host-managed. Another app can also park a local
    // marketplace under Codex's home; that one is neither Codex's nor necessarily stale, so say so.
    const hostManaged = type === 'local' && !!source && (source.startsWith(`${home}/.tmp/bundled-marketplaces/`) || /\/codex-runtimes?\//.test(source))
    const underHome = type === 'local' && !!source && source.startsWith(`${home}/`)
    if (type === 'git') ok('source_type = git → Codex keeps it current on its own')
    else if (hostManaged) info(`source_type = local, managed by Codex itself (${source}) — expected, not stale`)
    else if (underHome) info(`source_type = local inside Codex's home but not a Codex-bundled path (${source}) — probably placed by another app; confirm before calling it healthy or stale`)
    else if (type === 'local') flag(`source_type = local (${source}) → never auto-updates; enable-autoupdate decides whether it should be re-added from Git`)
    else info(`source_type = ${type ?? '(missing)'}`)
    const repo = source ? githubRepo(source) : undefined
    if (ref) info(`pinned to ref ${ref} — remote versions read from that ref`)
    const side = type === 'local' ? undefined
      : await remoteSide(roots[name], repo, ref, '.codex-plugin', `codex plugin marketplace upgrade ${name}`)
    const remote = side?.versions
    const quietUnverified = !!side?.behind && !remote // the "clone is behind" finding already covers them
    // The active install comes from `codex plugin list --json`; superseded cache directories linger,
    // so the newest one on disk is only a fallback, and is labelled as such.
    let rows: [string, string, string][] = (mine ?? []).filter((p) => {
      if (typeof p.version === 'string') return true
      flag(`${p.name}: \`codex plugin list\` lists no version — installed version unverified`)
      return false
    }).map((p) => [p.name, p.version, 'installed'])
    if (!active) {
      flag('`codex plugin list --json` failed — falling back to the newest CACHED version, which may not be the active one')
      if (existsSync(cache)) rows = readdirSync(cache).flatMap((plugin) => {
        const v = readdirSync(join(cache, plugin)).filter((x) => !x.startsWith('.'))
          // A sha-named directory has no order: semver names win (sorted last, so .at(-1) picks them); shas go by mtime.
          .sort((a, b) => semverish(a) && semverish(b) ? cmp(a, b) : semverish(a) !== semverish(b) ? (semverish(a) ? 1 : -1)
            : statSync(join(cache, plugin, a)).mtimeMs - statSync(join(cache, plugin, b)).mtimeMs).at(-1)
        return v ? [[plugin, v, 'cached'] as [string, string, string]] : []
      })
    }
    if (!rows.length) info('no installed plugins')
    for (const [plugin, have, label] of rows) {
      const want = remote?.get(plugin)
      if (!want) {
        const msg = `${plugin}: ${label} ${have}; remote version unverified${repo ? '' : ' (not a GitHub source)'}`
        if (type === 'local') info(msg + ' — a local source has no remote to compare with')
        else if (offline) info(msg)
        else if (!quietUnverified) flag(msg)
        continue
      }
      const older = semverish(have) && semverish(want) ? cmp(have, want) < 0 : have !== want
      if (older) flag(`${plugin}: ${label} ${have} vs remote ${want} → STALE (\`codex plugin marketplace upgrade ${name}\`)`)
      else ok(`${plugin}: ${label} ${have} = remote ${want}`)
    }
  }
}

if (hostArg !== 'codex') await claude()
if (hostArg !== 'claude') await codex()
if (checked === 0) fail2(only ? `marketplace "${only}" is not configured on the host(s) checked` : 'no configured marketplace with installed plugins was found')
console.log(findings ? `check-health: ${findings} finding(s)` : offline ? 'check-health: settings healthy; versions NOT checked (--offline)' : 'check-health: healthy')
process.exit(findings ? 1 : 0)
