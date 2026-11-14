---
name: marketplace-health
description: >-
  Check that an installed plugin marketplace (Claude Code or Codex) is HEALTHY — the latest
  published plugin versions installed, auto-update on — and, only on an explicit update request,
  bring a stale install current. Use when the user asks "is my marketplace up to date / am I on the
  latest?", "why didn't my new skill/plugin show up after I pushed?", "are plugin auto-updates on?",
  "a plugin enabled in settings never appeared", "update my plugins to the latest", "why the
  marketplace warning at session start?", or after a publish — «чи оновлений маркетплейс», «онови
  плагіни», «чому не підтягнулась нова версія скіла». Do not use to author a marketplace or bump
  versions (plugin-dev), to turn auto-update on or off (enable-autoupdate), to bootstrap a
  marketplace REPO or refresh its vendored meta plugin (clone-marketplace), nor for an installed
  skill that never triggers (skill-authoring).
---

# Marketplace health check

> Tested so far on Claude Code only; the Codex branch is untested on Codex
> (`references/trigger-tests.md`).

Answer two questions about a plugin marketplace the user has already added, and report a clear
healthy / stale verdict with the exact fix:

1. **Is the latest version installed?** — is each plugin's active install at the version the
   remote publishes, or a stale snapshot?
2. **Is auto-update enabled?** — will it stay current on its own?

The **diagnosis is read-only**, and the bundled script does the reads. The state changes — a
catalog refresh, a plugin update or install — run only under the go-ahead rule below.

**The go-ahead rule:** an explicit request to update, fix, refresh or install IS the go-ahead for the
state change it names — "update it" / "fix it" means refreshing the catalog and updating or
installing what the check found stale; anything else — a refresh, install or re-add the user did not ask for — is
proposed with the exact command, and run on their yes. Settings are never edited here (enable-autoupdate
owns them, under the same rule).

## Why staleness happens (the mental model)

Marketplace clients cache aggressively and key updates off the **declared version**, not the git
contents. A change reaches an installed client only when BOTH hold: the plugin's `version` was
bumped, AND the client re-pulled (auto-update, or a manual refresh). A plugin that declares **no**
version is identified by its commit sha instead (Claude Code shows the sha as its version: observed in `claude plugin list --json`, 2.1.325), so every
push counts as new for it, and only the re-pull matters. Miss either and the client
keeps its cached snapshot — the #1 "I pushed a new skill and nobody sees it" cause.

Versioning is **per plugin**, so "latest installed?" is a per-plugin comparison. A marketplace's
`metadata.version` does a different job — per plugin-dev's version-discipline section it is what makes Claude Code re-read
the catalog itself (documented behaviour, not measured here) — so check it when the complaint is "a
whole new plugin never appeared".

**Auto-update is not instant.** It pulls on its own schedule (at session start, among other times — documented as of 2026-11),
so a push from minutes ago can read STALE on a marketplace whose auto-update is on (Output says how
to report it).

## Step 0 — register the run

Register these as todo items now, before doing anything else, in whatever todo/plan tool this host
gives you — and while work remains keep exactly one in progress:
1. Run the read-only checker (§ Check)
2. Hand-check, read-only, the «unverified» rows the user's question turns on (§ Check)
3. Claude Code: check the shell profile files (`~/.zshrc`, `~/.bashrc`, `~/.profile` or the login
   shell's equivalents) for the env override — the script cannot (§ Check)
4. Only for a plugin that never appeared at all (§ Never appeared)
5. Propose the refresh, with its exact command, for whatever stays stale or unverified — on an
   explicit update request, complete it «go-ahead given» (§ Fix)
6. Refresh the catalog — only under the go-ahead rule (§ Fix)
7. Update or install the plugin — only under the go-ahead rule (§ Fix)
8. Report the verdict (§ Output)
**On Codex**, item 3 is completed «no Codex equivalent» and items 6–7 are one step (§ Fix).
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

Substitute `SKILLDIR` with the literal directory you loaded this file from. **Run it from the
project root**: project-scope settings are read from the working directory (it prints which).
Exit 0 = healthy, 1 = a finding (stale, off, conflicting or unverified), 2 = could not run. `--offline` reads no
network, so it can confirm the settings but never certify a version: an offline 0 says so. It only reads: `git ls-remote` and
GitHub's raw files tell it what the remote publishes, so a plain "check" request still gets
**verified** versions without a refresh. No Bun? Install it (`install-bun`), or do the same reads by
hand:

- **Claude Code.** Active installs: `claude plugin list --json` (`id` = `<plugin>@<marketplace>`,
  `version`). That registry is the authority. Never derive "installed" from
  `~/.claude/plugins/cache/…`: superseded and uninstalled copies linger there, some marked
  `.orphaned_at`. Catalog clone and source: `~/.claude/plugins/known_marketplaces.json`
  (`installLocation`, `source`). Clone vs remote: `git -C <installLocation> rev-parse HEAD` against
  `git -C <installLocation> ls-remote origin HEAD` — never a `git fetch` there without the go-ahead:
  the clone is the host's own, and fetching changes what it later installs from.
- **Codex.** `[marketplaces.<name>]` in `~/.codex/config.toml` (or `$CODEX_HOME`) has `source_type`
  and `source` — as of codex-cli 0.169, 2026-11, no timestamp or revision fields. Active installs:
  `codex plugin list --json` (`installed[]`: `name`, `marketplaceName`, `version`) — the authority,
  as on Claude Code; the cache under `~/.codex/plugins/cache/<marketplace>/<plugin>/<version>/`
  keeps superseded versions too.
- **Auto-update (Claude Code).** `autoUpdate` can sit in `.claude/settings.local.json`,
  `.claude/settings.json`, `~/.claude/settings.json` (under `extraKnownMarketplaces.<name>`) and in
  `known_marketplaces.json`, where the `/plugin` UI toggle stores it (observed on Claude Code
  2.1.325, 2026-11). Report every value with its file; if they disagree, say so — which wins is not
  documented. An absent value on a third-party marketplace means **off** (Claude Code docs as of 2026-08, not
  re-measured; the checker treats only `claude-plugins-official` as official). The global override, `DISABLE_AUTOUPDATER` / `FORCE_AUTOUPDATE_PLUGINS`: the script
  reads its own environment and every settings `env` block; the shell profile files are yours to
  read (Step-0 item 3). enable-autoupdate §3 has what the variables do.
- **Auto-update (Codex).** No flag: `source_type = "git"` ⇒ Codex keeps it current itself (stated
  as of 2026-08, not re-measured on 0.169); `"local"` ⇒ it never does. A local source inside Codex's
  bundled-marketplaces or runtime paths is one Codex ships and manages — expected, not stale; another
  local source under its home was probably put there by another app, so confirm it rather than
  calling it healthy.

**Version-pin gotcha to name in the report** (plugins that declare a version): if the remote shipped
new code without bumping the plugin's `version`, the client correctly sees "same version" and skips
it. Matching versions with a change still missing means the defect is upstream — the fix belongs in `plugin-dev`.

**The SessionStart nudge.** If the marketplace this skill ships in installs a session-start hook (the
canonical one does), it speaks in two cases: this marketplace's auto-update reads off (→
enable-autoupdate), or Bun is missing so it cannot check (→ install-bun). It reads the override only
from its own environment and treats `DISABLE_AUTOUPDATER=1` without `FORCE_AUTOUPDATE_PLUGINS=1` as off, while the checker also reads every
settings `env` block and reports a disagreement — so when the two differ, trust the checker.

## Never appeared at all

**Claude Code:** `enabledPlugins: {"<plugin>@<marketplace>": true}` records an intent; the plugin is
usable only once `claude plugin list --json` lists it. A plugin pushed recently may not be there yet:
the catalog clone lags the push until it is re-pulled. The checker flags each enabled entry the
registry lacks. If the remote catalog lists the plugin but its `metadata.version` was not bumped
when the list changed, the client may never re-read the catalog: that defect is upstream, so hand it
to plugin-dev. Read `references/enabled-not-installed.md` for the reads and the install command.

**Codex:** `codex plugin list --json` is the same authority. Two separate causes: the catalog
clone does not list the plugin yet (the script's "clone is behind" line), fixed by the Codex
refresh below; or the catalog lists it and it was never installed, fixed by
`codex plugin add <plugin>@<marketplace>`. Check which before proposing either.

## Fix — only under the go-ahead rule

- **Claude Code:** refresh the catalog — `claude plugin marketplace update <name>` (omit the name for
  all) — then update the plugin — `claude plugin update <plugin>@<name>` — or, for a plugin never
  installed, the two-step install in `references/enabled-not-installed.md`. A
  restart applies it. If refreshes keep failing and wiping the clone,
  `CLAUDE_CODE_PLUGIN_KEEP_MARKETPLACE_ON_FAILURE=1` keeps the last good copy (present in Claude
  Code 2.1.325) — propose it, don't set it.
- **Codex:** `codex plugin marketplace upgrade <name>` (omit the name for every Git marketplace;
  codex-cli 0.169's help, 2026-11, says only that it refreshes the marketplace snapshots;
  whether installed plugins move with it is not measured here — confirm with `codex plugin list
  --json` afterwards);
  for a plugin the catalog lists but that was never installed, `codex plugin add <plugin>@<name>`.
- On a plain "check", run neither; put the exact commands in the report.
- Settings are not edited here, even on "fix it" (the go-ahead rule above).

## Output

A tight verdict, not a command dump:

```
Marketplace <name> (<source>) — <host>
 • Versions: <plugin> installed x.y.z vs remote a.b.c → STALE   (or "all current", or "unverified: <why>")
 • Auto-update: <ON | OFF | conflicting: <file>: <value>; …> (<where it was read>)
 → Fix: `claude plugin marketplace update <name>` + `claude plugin update <plugin>@<name>`, restart
        (Codex: `codex plugin marketplace upgrade <name>`, then `codex plugin list --json`); auto-update OFF → enable-autoupdate
```

Lead with healthy / stale and the one action that fixes it. Stale minutes after a push with
auto-update on → say it will land on its own. Everything current and auto-update on → one line.

## Bundled resources

- `scripts/check-health.ts` — the read-only check above (`--help` for its options).
- `references/enabled-not-installed.md` — reads and install command for a plugin that never appeared.
- `references/trigger-tests.md` — should-fire / should-not prompts; re-run them after any edit to
  the `description`.
