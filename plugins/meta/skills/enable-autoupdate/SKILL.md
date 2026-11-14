---
name: enable-autoupdate
description: >-
  Turn auto-update ON or OFF for an installed plugin marketplace — Claude Code or Codex — so it
  stays current on its own (or stops moving). Use when the user asks to "enable/turn on marketplace
  auto-updates", "disable/turn off auto-update", "pin my Codex marketplace", "keep my
  plugins up to date automatically", "my plugins never update", "stop my marketplace going stale",
  "make my marketplace auto-update", "set autoUpdate in extraKnownMarketplaces", "switch my Codex
  marketplace from local to git", "plugin updates despite DISABLE_AUTOUPDATER", or right after
  marketplace-health reports auto-update OFF —
  «увімкни авто-апдейт маркетплейсу», «вимкни авто-апдейт», «хай плагіни оновлюються самі». Do not use it to check status or bring a stale install current (that's marketplace-health),
  to author or version a marketplace (that's plugin-dev), nor to create one (clone-marketplace).
---

# Enable marketplace auto-update

Keep an installed plugin marketplace from going stale — the consumer side of "I pushed a new skill
and nobody sees it". **The mechanism differs by host, so branch first:**

- **Claude Code** → a per-marketplace `autoUpdate` flag. Third-party marketplaces default to **off**
  (Claude Code docs, 2026-08; a documented default, not measured here, so re-check the docs if it
  seems wrong). Follow §1–§5. **Turning it off** runs the same steps with `false` wherever this file
  says `true`: §2 writes it, and if the registry still reads `true` also asks for the UI toggle; it
  is done only when §4 reads `false` in every file. §3 and §5 complete as "not needed to turn it
  off"; report with the «disabled» output. If the flag is already `false` everywhere, or absent on a third-party marketplace, there is nothing
  to write: report OFF and where that comes from.
- **Codex** → there is **no flag**; Git-sourced marketplaces auto-update on their own. Go to the
  **Codex** section — the fix there is the marketplace's *source*, not a toggle.

**CLI surfaces on both hosts move:** check a command's `--help` before relying on an unfamiliar flag,
and again if it errors.

**The go-ahead rule:** an explicit request to update / fix /
enable / disable IS the go-ahead for the state change it names; anything else — a refresh, install, settings
edit or re-add the user did not ask for — is proposed with the exact command or diff, and run on
their yes. The steps below point back here. (marketplace-health states the same rule for its own read-and-refresh actions.)

Length: a little past the ~250-line default because the two hosts are separate branches, each with
its own steps and output templates.

## Step 0 — register the run

Register these as todo items now, before doing anything else, in whatever todo/plan tool this host
gives you — only the branch for the host you are fixing — and while work remains keep exactly one in
progress:
- **Claude Code:** 1. Identify the marketplace name + source (§1; a local directory may end the
  run there)   2. Only if a re-add needs it: remove the old entry — its own yes, plugins listed
  before and reinstalled after (§1)   3. Turn it on — UI, or a settings.json diff shown first (§2)
  4. Check the global env override (§3)   5. Verify the effective flag across every scope (§4)
  6. Offer a refresh now (§5)   7. Report (Output). Turning it off: see the top of this file.
- **Codex:** 1. Read the marketplace's `source_type` (Codex)   2. Act on it, naming the branch you
  took (Codex)   3. Only if the re-add needs it: remove the old entry — its own yes, plugins listed
  before and reinstalled after   4. Verify in `config.toml`: `source_type = "git"`, or the pinned
  ref (Codex)   5. Report (Output)
Register the conditional steps too: one a branch makes moot is completed WITH THAT REASON, never
left open — an unfinished list at the end must mean something really is unfinished.
No such tool? SEARCH for one first — on hosts with deferred tools it exists but is not loaded, and
its name differs per host. Anything that creates items and marks them in progress and completed IS
that tool, whatever it is called. Search by that capability, then by any name you remember: one empty
result is evidence about the name; two are a real absence on this host — say so plainly, it is not
your mistake. It must be the SESSION's own planner, never an external tracker (Jira, Linear, a task
app): your bookkeeping is not their backlog. If there truly is none, keep the list in your
replies — state it once, name each item as you start it, account for every one at the end.

## 1. Identify the marketplace (Claude Code)

```
claude plugin marketplace list --json
```

Each entry gives the marketplace `name` (the key you write under `extraKnownMarketplaces`) and where
it comes from — `"source": "github"` plus a `repo`, a git URL, or a local directory. **Take the
settings `source` object from `~/.claude/plugins/known_marketplaces.json`** (`<name>.source`, e.g.
`{"source": "github", "repo": "<owner/repo>"}`) and copy it verbatim; the `list --json` output
flattens it, and rewriting a non-GitHub source as GitHub points the entry somewhere else. A marketplace that claude.ai hosts
(added with `add --claudeai`) is untested here (2026-11-14): read what `known_marketplaces.json`
records for it before copying, and say in the report that this case is unverified. A **local-directory** marketplace has nothing upstream to pull, so the flag would do nothing. Decide
which kind it is:

- **The user's own dev checkout** → updated by hand. Leave it and say so.
- **Managed by the host** (a path inside Claude Code's own data or cache directories) → leave it.
- **A copy of a GitHub repo they want tracked** → propose `claude plugin marketplace add
  <owner/repo>`, carrying over the old entry's `--scope` and `--sparse` (Claude Code 2.1.325's `add`
  has no ref flag, so a pinned ref cannot be carried — say so). A config change, so the go-ahead
  rule applies. Afterwards, check with `list` which source the name now points at. If the add refuses
  the name, the local entry has to go first:

**Removing a marketplace is its own yes, never part of the add's.** `claude plugin marketplace
remove <name>` without `--scope` drops the declaration from every scope (`--scope user|project|local`
for one), and the plugins installed from it may go with it (Claude Code's docs say so; not checked
here). Before asking, list those plugins with their `scope`
(`claude plugin list --json`, the ids ending `@<name>`); after, reinstall each in the scope it had —
`claude plugin install <plugin>@<name> --scope <user|project|local>` — and name them in the report.

## 2. Turn it on — two paths

**Which path:** on an explicit request, take **B** (you cannot click the UI for the user); offer
**A** when the user would rather click than have a file edited. If
`known_marketplaces.json` already holds `false` for this marketplace (the UI's own record), writing
settings alone leaves two values whose precedence is undocumented: also ask the user to flip it in
the UI (path A), and do not report the request done until §4 reads `true` everywhere — until then
the result is «conflicting scopes». Don't hand-edit `known_marketplaces.json`; it is the host's own
state file.

**A. Interactive UI:** `/plugin` → **Marketplaces** → pick the marketplace →
**enable auto-update** (or disable it). The UI stores the flag in `~/.claude/plugins/known_marketplaces.json`
(`<name>.autoUpdate`), not in settings.json — observed on Claude Code 2.1.325, 2026-11; §4 reads it
there.

**B. settings.json edit (explicit, scriptable):** set `autoUpdate: true` under the marketplace's key,
in the scope the user wants. **No scope named → user-wide.** A project's `.claude/settings.json` is
committed, so it declares the marketplace for everyone who opens the repo: write there only when
asked.

- **User-wide** — `~/.claude/settings.json`
- **This project** — `.claude/settings.json`, or `.claude/settings.local.json` for an uncommitted
  personal override. Among settings files the more specific scope wins: `settings.local.json` over
  the project's `settings.json` over the user's (Claude Code docs, as of 2026-11).

```json
{
  "extraKnownMarketplaces": {
    "<marketplace-name>": {
      "source": <the <name>.source object from known_marketplaces.json, verbatim>,
      "autoUpdate": true
    }
  }
}
```

Merge into any existing `extraKnownMarketplaces` block — never clobber other marketplaces; if the
key exists with `autoUpdate: false`, flip just that value. **Always show the exact diff.** On an
explicit request to enable auto-update, show it and write it in the same turn: this marketplace's
own entry (its `source` from §1, plus `autoUpdate`) is that request. A diff that touches any
other key is proposed and written only on the user's yes.

## 3. Mind the global override

`autoUpdate: true` does nothing while updates are disabled globally. As of 2026-08 (names re-checked
present in Claude Code 2.1.325 on 2026-11): **`DISABLE_AUTOUPDATER=1`** turns off ALL updates,
whatever the per-marketplace flag says; adding **`FORCE_AUTOUPDATE_PLUGINS=1`** keeps plugin updates
on while pausing Claude Code's own binary updates. Look in all three places it can be set: the current shell environment, the shell profile files, and
the `env` block of every settings.json scope from §2. If `DISABLE_AUTOUPDATER` is set, adding
`FORCE_AUTOUPDATE_PLUGINS=1` affects **every** marketplace, not only this one, so it is its own
go-ahead: write it only when the user's request names
that situation ("I still want plugin updates despite DISABLE_AUTOUPDATER"); after a request about one
marketplace, propose it and say it affects all plugins. Never remove their binary-update choice. If the names seem inert, re-check the current
Claude Code docs — env names move. Close this step naming each place you read (shell env, which profile files, which settings `env`
blocks) — an unread profile file is how "enabled but still stale" survives. (Turning it off: close
this step as "not needed".)

## 4. Verify — read the EFFECTIVE flag

Read `autoUpdate` for this marketplace from every place it can live: `.claude/settings.local.json`,
`.claude/settings.json`, `~/.claude/settings.json` and `~/.claude/plugins/known_marketplaces.json` —
plus an organisation's managed settings file where one is installed, which outranks all of them
— `managed-settings.json` in `/Library/Application Support/ClaudeCode/` (macOS),
`/etc/claude-code/` (Linux) or `C:\Program Files\ClaudeCode\` (Windows), per Claude Code's docs as of
2026-11 (none existed on the machine this was checked on). The checker below does not read managed
settings: when that file exists, read it by hand as well. Managed settings can also arrive with no
file (device management or an organisation's admin console, per the same docs); `/status` lists the
settings sources in effect. If it shows a managed source you cannot read, report the result as
"unverified — a managed policy is present", never as ON.
**With Bun installed, marketplace-health's read-only checker does this for you:**
`bun run "SKILLDIR/../marketplace-health/scripts/check-health.ts" "<name>" --host claude --offline`
(`SKILLDIR` is the directory you loaded this SKILL.md from, a literal path to substitute, not a shell
variable; the two skills ship side by side in one plugin, and if that path is missing, read the files
by hand). Run it from the project in question — it resolves `.claude/…` against its working directory.
Read its `autoUpdate` and `global override` lines: its
exit code also counts unrelated findings, such as an unverified version. Without Bun, read the files above by hand.

Report each value and the file it came from. An absent value means the host default: off for a
third-party marketplace, on for an official one. The more specific settings scope wins (§2), so a
user-wide write can still read OFF in this project. If the settings files and
`known_marketplaces.json` disagree, say so plainly rather than picking one: which of them wins is
not documented.

## 5. Offer a refresh now

Turning auto-update on does not pull anything this minute. `claude plugin marketplace update <name>`
does — run it when the user asked for an update now; otherwise offer it (go-ahead rule). This covers
only the refresh that follows this skill's own change; a standalone "pull it now" request, comparing
versions, or a plugin that still looks stale is marketplace-health's job. (Turning it off: close this
step as "not needed".)

## Codex

There is **no auto-update flag** on Codex: it **auto-updates Git-sourced marketplaces
unconditionally** in the background (stated as of 2026-08 on Codex CLI; not re-measured on codex-cli 0.169 — a Git marketplace that sits stale is marketplace-health's). Don't invent an
`autoUpdate` key in `config.toml`; it does not exist there. Read `source_type` under
`[marketplaces.<name>]` in `~/.codex/config.toml` (or `$CODEX_HOME/config.toml`):

- **`git`** → already auto-updating; nothing to enable. A Git marketplace that still looks stale is
  marketplace-health's job, not this one.
  **To stop it updating**, there is no flag either: propose re-adding it pinned to a fixed commit or
  tag (`codex plugin marketplace add <owner/repo> --ref <commit-or-tag>`; a config change, go-ahead
  rule; the removal rule below applies if the add refuses the name). Verify that `config.toml` now
  records that ref under `[marketplaces.<name>]`. That a pinned ref then stays put is inferred from
  `--ref`, not measured: say so in the report.
- **`local`** → Codex never refreshes it, and `codex plugin marketplace upgrade` refreshes Git
  marketplaces only. **On a
  turn-off request it is already off: report that and change nothing.** Otherwise decide which kind
  of local it is before touching it:
  - **Bundled or managed by the host** (a path inside Codex's own data or cache directories, such as
    its bundled marketplaces) → leave it alone; there is no Git upstream to switch to. Report it.
  - **The user's own dev checkout** → expected to be updated by hand (`git pull` in the source).
    Leave it and say so.
  - **A snapshot of a Git repo** → re-add it from Git so it joins the auto-update set:
    `codex plugin marketplace add <owner/repo>` (or an HTTPS/SSH Git URL), carrying over any ref or
    sparse path the old entry used (`--ref`, `--sparse`). A config change, so the go-ahead rule
    applies. On codex-cli 0.169 (2026-11) this replaced the local entry of the same
    name in place. If Codex instead answers that the marketplace "is already added from a different
    source", it has to be removed first (`codex plugin marketplace remove <name>`), under the same
    removal rule as Claude Code's (§1): its own yes, plugins listed before and reinstalled after.

**Verify:** re-read `config.toml` and confirm `source_type = "git"` under `[marketplaces.<name>]`
(`codex plugin marketplace list` shows only names and roots, not the source type). With Bun,
marketplace-health's checker (`--host codex`) reports `source_type` too, and its «clone is behind»
line is how you notice a Git marketplace that is not refreshing.

## Output

Lead with the one action and its effect, matched to the case:

```
# Claude Code — enabled
Marketplace <name> (<source>)
 → autoUpdate = true in <file> (or /plugin → Marketplaces → enable auto-update).
   Effective value: ON (<file it came from>). Now stays current automatically.

# Claude Code — enabled but blocked
Marketplace <name>: autoUpdate = true, but DISABLE_AUTOUPDATER=1 is set in <where>.
 → FORCE_AUTOUPDATE_PLUGINS=1 there keeps plugin updates on (<applied | proposed>).

# Claude Code — conflicting scopes
Marketplace <name>: autoUpdate differs by file — <file>: true, <file>: false.
 → which one wins is not documented; <what the user should change to make them agree>.

# Claude Code — local directory
Marketplace <name> is a local directory → <your dev checkout, left as is | a copy of <owner/repo>:
 re-add it from GitHub (proposed / done)>.

# Claude Code — disabled
Marketplace <name> → autoUpdate = false in <file> (or: already OFF — <where>; nothing written).
 Effective value: OFF (<file it came from | the host default for a third-party marketplace>).

# Claude Code — unverified
Marketplace <name>: <a managed policy is present | the source is claude.ai-hosted> and could not be
read → effective value unverified; <what the user or their admin can check>.

# Codex — git source
Marketplace <name> is Git-sourced → Codex already auto-updates it. Nothing to enable.

# Codex — pinned (updates stopped)
Marketplace <name> re-added at <ref> → no longer moves. That it stays put is inferred from --ref,
not measured.

# Codex — local snapshot re-added
Marketplace <name> was a local snapshot → re-added from <owner/repo>; source_type is now git.

# Codex — local, left alone
Marketplace <name> is <bundled by the host | your dev checkout> → left as is; <why>.
```

## Bundled resources

- `references/trigger-tests.md` — should-fire / should-not prompts. Read it when you change the
  `description`, and re-run them against the new text.
