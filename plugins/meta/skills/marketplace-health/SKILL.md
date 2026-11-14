---
name: marketplace-health
description: Check whether an installed plugin marketplace — on Claude Code or Codex — is HEALTHY — (1) the latest published version of each plugin is actually installed (not a stale cached copy), and (2) auto-update is active so it stays current. Use when the user asks "is my marketplace up to date / am I on the latest?", "why didn't my new skill/plugin show up after I pushed?", "are plugin auto-updates on?", "check marketplace health", "did my marketplace update", "is my Codex marketplace current?", or after publishing a plugin change to confirm clients will pull it — «чи оновлений маркетплейс», «чому не підтягнулась нова версія скіла», «увімкнені авто-апдейти плагінів». Do not use to AUTHOR a marketplace/plugin or bump versions (that's plugin-dev), nor to turn auto-update ON (that's enable-autoupdate) — this only diagnoses an already-installed one.
---

# Marketplace health check

Answer two questions about a plugin marketplace the user has already added
(`/plugin marketplace add <owner/repo>`), and report a clear healthy / stale
verdict with the exact fix:

1. **Is the latest version installed?** — is the locally-cached copy of each
   plugin at the version the remote marketplace currently publishes, or is it a
   stale snapshot?
2. **Is auto-update enabled?** — will it stay current on its own, or is it
   pinned to whatever was installed?

This is **read-mostly diagnosis**. The state-changing steps are an explicit
`marketplace update` refresh and, for a plugin that was never installed, a
`plugin install` — **both only with the user's go-ahead** (§ When to act). A
"check / why is it missing?" request buys you the reads, never the install.

## Why staleness happens (the mental model)

Marketplace clients cache aggressively and key updates off the **declared
version**, not the git contents. So a change reaches an installed client only
when BOTH are true: the plugin's `version` was bumped in its manifest, AND the
client re-pulled (auto-update, or a manual refresh). Miss either and the client
keeps serving its cached snapshot — the #1 "I pushed a new skill and nobody
sees it" cause. This skill checks both halves.

Versioning is **per-plugin** (each plugin's `.claude-plugin/plugin.json`
`version`), not per-catalog — there is no single "marketplace version" number in
the Claude cache model. So "latest installed?" is a per-plugin comparison:
cached version vs the version the remote catalog now lists. (A marketplace's
`.claude-plugin/marketplace.json` `metadata.version` exists for a different
job — it's what makes Claude Desktop re-discover a newly *added/removed* plugin
in the catalog — so check it too when the complaint is "a whole new plugin
never appeared", not just "a plugin didn't update".)

**⚠️ Enabled is not installed.** `enabledPlugins: {"<plugin>@<marketplace>": true}` records an
intent; the plugin is usable only once the installed-plugin registry (`claude plugin list --json`)
lists it. A plugin pushed today usually is not there yet, because the local marketplace clone lags the
push. The authority is the **registry, not the cache directory** (stale cache dirs linger). The fix is
two state-changing steps — refresh the catalog, then install — **both only with the user's go-ahead**
(§ When to act). Read `references/enabled-not-installed.md` when a plugin never appeared at all: it has
the two diagnostic reads, the exact install command, and the case that produced this rule.

## Register the run

Register these as todo items now, before doing anything else, in whatever todo/plan tool this host
gives you — and while work remains keep exactly one in progress:
1. Identify the host and list the configured marketplaces (§ Check 1, first bullet; § Codex)
2. Refresh the remote catalog (§ Check 1; § When to act) — a state change, so only with the user's
go-ahead to update/fix; a plain "check" request completes it «not refreshed», versions reported unverified
3. Read the ACTIVE installed versions from the registry, not the cache tree (§ Check 1)
4. Compare installed vs remote per plugin, naming the version-pin gotcha where it applies (§ Check 1)
5. Enabled-vs-installed diagnosis — registry + clone commit + marketplace `metadata.version`
(§ Why staleness happens, «ENABLED IS NOT INSTALLED») — only when a plugin never appeared at all
6. Read the per-marketplace `autoUpdate` flag, project over user (§ Check 2)
7. Check the global env override, `DISABLE_AUTOUPDATER` / `FORCE_AUTOUPDATE_PLUGINS` (§ Check 2)
8. Apply the go-ahead rule before any refresh, install, `/plugin update` or settings edit — an explicit
"update / fix" request is the go-ahead; otherwise propose and wait (§ When to act)
9. Report the verdict (§ Output)
**On Codex** items 2–7 read differently (§ Codex): 2 is `codex plugin marketplace upgrade`, 3–4 compare
the cached `<version>` path segment, 5 is completed «Claude Code only», 6 is `source_type`, and 7 is
completed «no Codex equivalent».
Register the conditional steps too: one a branch makes moot is completed WITH THAT REASON, never
left open — an unfinished list at the end must mean something really is unfinished.
No such tool? SEARCH for one first — on hosts with deferred tools it exists but is not loaded, and
its name differs per host. Anything that creates items and marks them in progress and completed IS
that tool, whatever it is called; an empty result for one remembered name is evidence about the name,
not about the host. It must be the SESSION's own planner, never an external tracker (Jira, Linear, a
task app): your bookkeeping is not their backlog. If there truly is none, keep the list in your
replies — state it once, name each item as you start it, account for every one at the end.

Run from inside another workflow (after shipping a plugin change, say), these items ADD to that
list rather than replacing it; the calling item is the gate and completes when your last item does.
On an item-oriented todo tool they land at the tail, after the caller's closing items; that is
expected, do not renumber.

## Check 1 — latest version installed?

Run these; treat every command as "verify with `--help` if it errors — the CLI
surface moves":

- **List installed marketplaces + plugins (non-interactive):**
  `claude plugin marketplace list --json` — gives each marketplace's name +
  source (e.g. the GitHub `repo`). JSON so it's parseable in one shot.
- **Refresh the remote catalog** (state-changing — see § When to act):
  `claude plugin marketplace update <name>` (omit `<name>` to refresh all).
  This re-pulls the remote `marketplace.json` + each plugin's manifest.
- **Read the ACTIVE installed versions:** `claude plugin list --json` — its
  `version` / `installPath` per plugin is the authority, and
  `~/.claude/plugins/installed_plugins.json` is the same data on disk. Do **not**
  derive "installed" from the cache tree: `~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/`
  retains superseded and uninstalled copies (some carry an `.orphaned_at` marker),
  so several `<version>` directories can coexist and the newest one may not be the
  active install. Use the cache listing only to corroborate. The marketplace registry
  is `~/.claude/plugins/known_marketplaces.json`.

**Compare:** for each plugin, the **active installed** version from
`claude plugin list --json` vs the version the
just-refreshed remote catalog lists for it. Equal → up to date. Installed < remote
→ **stale** (the fix is a refresh + `/plugin update`). If you can't refresh
(offline / the `git pull` failed), say so rather than guessing: report the
cached versions and flag them "unverified against remote". (If refreshes keep
failing and wiping the cache, Claude Code's
`CLAUDE_CODE_PLUGIN_KEEP_MARKETPLACE_ON_FAILURE=1` makes it keep the last-good
copy instead — propose it, don't set it; verified as of 2026-08, re-check with
the current docs.)

**Version-pin gotcha to name in the report:** if the remote repo shipped new
code but did NOT bump the plugin's `version` string, the client correctly sees
"same version" and skips it — so "up to date" by version can still be missing
real changes. If the user says a change is missing but versions match, the
defect is upstream (an un-bumped version), and the fix belongs in `plugin-dev`,
not here.

## Check 2 — auto-update enabled?

The per-marketplace toggle can live in two kinds of place: **settings.json** under
`extraKnownMarketplaces` (project `.claude/settings.local.json` and `.claude/settings.json`
override user `~/.claude/settings.json`), and `~/.claude/plugins/known_marketplaces.json`
(`<name>.autoUpdate`), which is where the `/plugin` UI toggle stores it — observed on Claude
Code 2.1.325, 2026-11. Read all of them:

```json
{
  "extraKnownMarketplaces": {
    "<marketplace-name>": {
      "source": { "source": "github", "repo": "<owner/repo>" },
      "autoUpdate": true
    }
  }
}
```

- Read `autoUpdate` for the marketplace in each place, and report each value with its
  file; if they disagree, say so rather than picking one. `true` → enabled;
  `false` → pinned (won't self-update). **Defaults differ by source:** official
  Anthropic marketplaces default to `true`, third-party / local-dev ones default
  to `false` — so an *absent* `autoUpdate` on a third-party marketplace means
  **disabled**, and that's the common "why am I stale" answer.
- **Global override wins:** look for `DISABLE_AUTOUPDATER` and
  `FORCE_AUTOUPDATE_PLUGINS` in the shell environment, the shell profile files and the
  `env` block of each settings.json. What each does (dated) is in enable-autoupdate §3;
  in short, `DISABLE_AUTOUPDATER=1` alone turns ALL updates off whatever the flag says.
- **Turning it on is not this skill's job** — report the verdict and hand the
  fix to `enable-autoupdate`.

## Codex

The two questions still apply, but the mechanism differs — **verify commands with
`--help`, the CLI surface moves.** Codex tracks marketplaces in
`~/.codex/config.toml` under `[marketplaces.<name>]` (fields: `source_type`,
`source`, `last_updated`, `last_revision`) and caches installed plugins at
`~/.codex/plugins/cache/<marketplace>/<plugin>/<version>/`.

- **Latest version installed?** Compare the cached `<version>` path segment against
  what the source publishes. `codex plugin marketplace upgrade <name>` refreshes a
  git marketplace's snapshot (then re-read the cache path). `codex plugin marketplace list`
  enumerates what's configured.
- **Auto-update?** There is **no `autoUpdate` flag** — Codex auto-updates
  **git-sourced** marketplaces unconditionally. So `source_type = "git"` ⇒
  auto-update is ON by construction; `source_type = "local"` ⇒ a pinned snapshot
  that never self-updates (the enable-autoupdate skill covers the fix). Report the
  verdict off `source_type`, not a boolean.

Don't assume Claude Code's `claude plugin …` commands or the
`extraKnownMarketplaces.autoUpdate` setting exist on Codex — they don't.

## When to act (not just report)

- **Reporting** (list, read cache paths, read settings, read env) is
  non-destructive — do it freely.
- **The go-ahead rule:** an explicit request to update / fix / enable IS the go-ahead for the state change it names; anything else — a refresh, install, settings edit or re-add the user did not ask for — is proposed with the exact command or diff, and run on their yes. (The same rule is written in enable-autoupdate; change both together.)
- So `marketplace update` / `plugin install` / `/plugin update` run on an "update /
  fix" request or a yes; on a plain "check", do the read-only comparison and report
  the versions as unverified against remote.
- **Never edit `settings.json` silently** — turning auto-update on is
  enable-autoupdate's job; hand it over with the verdict.

## Output

A tight verdict, not a command dump:

```
Marketplace <name> (<owner/repo>)
 • Versions: <plugin> cached x.y.z vs remote a.b.c → STALE   (or "all current")
 • Auto-update: OFF (extraKnownMarketplaces.<name>.autoUpdate absent → third-party default)
 → Fix: `claude plugin marketplace update <name>`, then turn auto-update on (enable-autoupdate)
```

Lead with healthy/stale and the one action that fixes it. If everything is
current and auto-update is on, say so in one line — no ceremony.
