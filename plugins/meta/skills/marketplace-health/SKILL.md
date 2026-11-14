---
name: marketplace-health
description: >-
  Check whether an installed plugin marketplace — on Claude Code or Codex — is HEALTHY: (1) the
  latest published version of each plugin is actually installed, and (2) auto-update is on so it
  stays current; then, only on an explicit update request, bring a stale one current. Use when the
  user asks "is my marketplace up to date / am I on the latest?", "why didn't my new skill/plugin
  show up after I pushed?", "are plugin auto-updates on?", "a plugin enabled in settings never
  appeared", "check marketplace health", "why did I get a marketplace warning at session start?", or
  after publishing a change — «чи оновлений маркетплейс», «чому не підтягнулась нова версія скіла».
  Do not use to author a marketplace or bump versions (plugin-dev), to turn auto-update on or
  off (enable-autoupdate), nor to bootstrap or refresh a marketplace's meta plugin from the canonical
  one (clone-marketplace).
---

# Marketplace health check

Answer two questions about a plugin marketplace the user has already added, and report a clear
healthy / stale verdict with the exact fix:

1. **Is the latest version installed?** — is each plugin's active install at the version the
   remote publishes, or a stale snapshot?
2. **Is auto-update enabled?** — will it stay current on its own?

This is **read-only diagnosis**, and the bundled script does the reads. The state changes — a
catalog refresh, a plugin update or install — run only under the go-ahead rule below.

**The go-ahead rule:** an explicit request to update / fix / enable / disable IS the go-ahead for the state change it names; anything else — a refresh, install, settings edit or re-add the user did not ask for — is proposed with the exact command or diff, and run on their yes. (The same rule is written in enable-autoupdate; change both together.)

## Why staleness happens (the mental model)

Marketplace clients cache aggressively and key updates off the **declared version**, not the git
contents. A change reaches an installed client only when BOTH hold: the plugin's `version` was
bumped, AND the client re-pulled (auto-update, or a manual refresh). Miss either and the client
keeps its cached snapshot — the #1 "I pushed a new skill and nobody sees it" cause.

Versioning is **per plugin**, so "latest installed?" is a per-plugin comparison. A marketplace's
`metadata.version` does a different job — per `plugin-dev` §4 it is what makes Claude Code re-read
the catalog itself (documented behaviour, not measured here) — so check it when the complaint is "a
whole new plugin never appeared".

**Auto-update is not instant.** It pulls on its own schedule (at session start, among other times),
so a push from minutes ago can read STALE on a marketplace whose auto-update is on. Say so rather
than calling it broken; a refresh is the fix only if the user wants it now.

## Step 0 — register the run

Register these as todo items now, before doing anything else, in whatever todo/plan tool this host
gives you — and while work remains keep exactly one in progress:
1. Run the read-only checker (§ Check)   2. Corroborate anything it could not verify (§ Check)
3. Claude Code: check the shell profile files for the env override — the script cannot (§ Check)
4. A plugin that never appeared at all — only in that case (§ Never appeared)
5. Refresh the catalog — only under the go-ahead rule (§ Fix)   6. Update or install the plugin —
only under the go-ahead rule (§ Fix)   7. Report the verdict (§ Output)
**On Codex**, item 3 is completed «no Codex equivalent» and items 5–6 are one step (§ Fix).
Register the conditional steps too: one a branch makes moot is completed WITH THAT REASON, never
left open — an unfinished list at the end must mean something really is unfinished.
No such tool? SEARCH for one first — on hosts with deferred tools it exists but is not loaded, and
its name differs per host. Anything that creates items and marks them in progress and completed IS
that tool, whatever it is called. Search by that capability, then by any name you remember: one empty
result is evidence about the name; two are a real absence on this host — say so plainly, it is not
your mistake. It must be the SESSION's own planner, never an external tracker (Jira, Linear, a task
app): your bookkeeping is not their backlog. If there truly is none, keep the list in your
replies — state it once, name each item as you start it, account for every one at the end.

Run from inside another workflow (after shipping a plugin change, say), these items ADD to that
list without dropping any of the caller's. The calling item goes back to pending while yours run and
completes when your last one does. On an item-oriented todo tool they land at the tail, after the
caller's closing items — expected, do not renumber. On a tool that takes the whole plan at once,
resubmit it with the caller's items intact.

## Check — run the script, then corroborate

```bash
bun run "SKILLDIR/scripts/check-health.ts" [MARKETPLACE_NAME] [--host claude|codex|both] [--offline]
```

Substitute `SKILLDIR` with the literal directory you loaded this file from. Exit 0 = healthy,
1 = a finding (each printed with its fix), 2 = could not run. It only reads: `git ls-remote` and
GitHub's raw files tell it what the remote publishes, so a plain "check" request still gets
**verified** versions without a refresh. No Bun? Install it (`install-bun`), or do the same reads by
hand:

- **Claude Code.** Active installs: `claude plugin list --json` (`id` = `<plugin>@<marketplace>`,
  `version`). That registry is the authority. Never derive "installed" from
  `~/.claude/plugins/cache/…`: superseded and uninstalled copies linger there, some marked
  `.orphaned_at`. Catalog clone and source: `~/.claude/plugins/known_marketplaces.json`
  (`installLocation`, `source`). Clone vs remote: `git -C <installLocation> rev-parse HEAD` against
  `git -C <installLocation> ls-remote origin HEAD`.
- **Codex.** `[marketplaces.<name>]` in `~/.codex/config.toml` (or `$CODEX_HOME`) has `source_type`
  and `source` — as of codex-cli 0.169, 2026-11, no timestamp or revision fields. Active installs:
  `codex plugin list --json` (`installed[]`: `name`, `marketplaceName`, `version`) — the authority,
  as on Claude Code; the cache under `~/.codex/plugins/cache/<marketplace>/<plugin>/<version>/`
  keeps superseded versions too.
- **Auto-update (Claude Code).** `autoUpdate` can sit in `.claude/settings.local.json`,
  `.claude/settings.json`, `~/.claude/settings.json` (under `extraKnownMarketplaces.<name>`) and in
  `known_marketplaces.json`, where the `/plugin` UI toggle stores it (observed on Claude Code
  2.1.325, 2026-11). Report every value with its file; if they disagree, say so — which wins is not
  documented. An absent value on a third-party marketplace means **off** (documented default, not
  re-measured). The global override, `DISABLE_AUTOUPDATER` / `FORCE_AUTOUPDATE_PLUGINS`: the script
  reads its own environment and every settings `env` block; the shell profile files are yours to
  read (Step-0 item 3). enable-autoupdate §3 has what the variables do.
- **Auto-update (Codex).** No flag: `source_type = "git"` ⇒ Codex keeps it current itself (stated
  as of 2026-08, not re-measured on 0.169); `"local"` ⇒ it never does. A local source inside Codex's
  own home or runtime cache is a marketplace Codex ships and manages — expected, not stale. Turning auto-update on is
  enable-autoupdate's job — hand it over with the verdict.

**Version-pin gotcha to name in the report:** if the remote shipped new code without bumping the
plugin's `version`, the client correctly sees "same version" and skips it. Matching versions with a
change still missing means the defect is upstream — the fix belongs in `plugin-dev`.

**The SessionStart nudge.** The marketplace this skill ships in also installs a session-start hook
that speaks only when this marketplace's auto-update reads off. If the user asks about that
message, run the check above: it reads the same places.

## Never appeared at all

**Claude Code:** `enabledPlugins: {"<plugin>@<marketplace>": true}` records an intent; the plugin is
usable only once `claude plugin list --json` lists it. A plugin pushed recently may not be there yet:
the catalog clone lags the push until it is re-pulled. Read `references/enabled-not-installed.md`
for the reads and the install command.

**Codex:** `codex plugin list --json` is the same authority. Two separate causes: the catalog
clone does not list the plugin yet (the script's "clone is behind" line), fixed by the Codex
refresh below; or the catalog lists it and it was never installed, fixed by
`codex plugin add <plugin>@<marketplace>`. Check which before proposing either.

## Fix — only under the go-ahead rule

- **Claude Code:** refresh the catalog — `claude plugin marketplace update <name>` (omit the name for
  all) — then update the plugin — `claude plugin update <plugin>@<name>` — or, for a plugin never
  installed, `claude plugin install <plugin>@<name> --scope <user|project|local>` (one value). A
  restart applies it. If refreshes keep failing and wiping the clone,
  `CLAUDE_CODE_PLUGIN_KEEP_MARKETPLACE_ON_FAILURE=1` keeps the last good copy (present in Claude
  Code 2.1.325) — propose it, don't set it.
- **Codex:** `codex plugin marketplace upgrade <name>` (omit the name for every Git marketplace);
  for a plugin the catalog lists but that was never installed, `codex plugin add <plugin>@<name>`.
- On a plain "check", run neither; put the exact commands in the report.
- Never edit settings here, even on a "fix it" request — turning auto-update on or off is
  enable-autoupdate's; hand it over with the verdict.

## Output

A tight verdict, not a command dump:

```
Marketplace <name> (<source>) — <host>
 • Versions: <plugin> installed x.y.z vs remote a.b.c → STALE   (or "all current", or "unverified: <why>")
 • Auto-update: <ON | OFF | conflicting: <file>: <value>; …> (<where it was read>)
 → Fix: `claude plugin marketplace update <name>` + `claude plugin update <plugin>@<name>`, restart
        (Codex: `codex plugin marketplace upgrade <name>`); auto-update OFF → enable-autoupdate
```

Lead with healthy / stale and the one action that fixes it. Stale minutes after a push with
auto-update on → say it will land on its own. Everything current and auto-update on → one line.

## Bundled resources

- `scripts/check-health.ts` — the read-only check above (`--help` for its options).
- `references/enabled-not-installed.md` — reads and install command for a plugin that never appeared.
- `references/trigger-tests.md` — should-fire / should-not prompts; re-run them after any edit to
  the `description`.
