---
name: enable-autoupdate
description: >-
  Turn ON auto-update for an installed plugin marketplace — Claude Code or Codex — so it stays
  current on its own. Use when the user asks to "enable/turn on marketplace auto-updates", "keep my
  plugins up to date automatically", "my plugins never update", "stop my marketplace going stale",
  "make <marketplace> auto-update", "set autoUpdate in extraKnownMarketplaces", "switch my Codex
  marketplace from local to git", or right after marketplace-health reports auto-update OFF —
  «увімкни авто-апдейт маркетплейсу», «хай плагіни оновлюються самі», «плагіни не оновлюються». Do
  not use it to check status (that's marketplace-health, which only diagnoses), nor to author or
  version a marketplace (that's plugin-dev). Covers the Claude Code setting, its global env
  override, and the Codex git-vs-local source fix.
---

# Enable marketplace auto-update

Keep an installed plugin marketplace from going stale — the consumer side of "I pushed a new skill
and nobody sees it". **The mechanism differs by host, so branch first:**

- **Claude Code** → a per-marketplace `autoUpdate` flag (third-party marketplaces default to **off**
  — as documented when this skill was written; re-check the Claude Code docs if it seems wrong).
  Follow §1–§5.
- **Codex** → there is **no flag**; Git-sourced marketplaces auto-update on their own. Go to the
  **Codex** section — the fix there is the marketplace's *source*, not a toggle.

**The go-ahead rule (shared with marketplace-health):** an explicit request to update / fix /
enable IS the go-ahead for the state change it names; anything else — a refresh, install, settings
edit or re-add the user did not ask for — is proposed with the exact command or diff, and run on
their yes. The steps below point back here. (The same rule is
written in marketplace-health; change both together.)

## Step 0 — register the run

Register these as todo items now, before doing anything else, in whatever todo/plan tool this host
gives you — only the branch for the host you are fixing — and while work remains keep exactly one in
progress:
- **Claude Code:** 1. Identify the marketplace name + source (§1)   2. Turn it on — UI, or a
  settings.json diff shown first (§2)   3. Check the global env override (§3)   4. Verify the
  effective flag across every scope (§4)   5. Refresh now — only if asked, else offer it (§5)
  6. Report (Output)
- **Codex:** 1. Read the marketplace's `source_type` (Codex)   2. Act on it — `git`: nothing to
  enable; `local`: decide which kind of local it is, re-add from Git only for a snapshot of a Git
  repo (Codex)   3. Verify with `list` / `config.toml` (Codex)   4. Report (Output)
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
flattens it, and rewriting a non-GitHub source as GitHub points the entry somewhere else. A **local-directory**
marketplace has nothing upstream to pull, so the flag would do nothing. Decide which kind it is,
as on Codex: the user's own dev checkout → updated by hand, leave it and say so; a copy of a
GitHub repo they want tracked → propose `claude plugin marketplace add <owner/repo>` (a config
change, go-ahead rule; check with `list` afterwards which source the name now points at, and remove
the local entry first if the add refuses the name).
Verify any command with `--help` if it errors; the CLI surface moves.

## 2. Turn it on — two paths

**Which path:** on an explicit request to enable it, take **B** and write it now — you cannot click
the UI for the user. Offer **A** when the user would rather click than have a file edited. If
`known_marketplaces.json` already holds `false` for this marketplace (the UI's own record), writing
settings alone leaves two values whose precedence is undocumented: also ask the user to flip it in
the UI (path A), and do not report the request done until §4 reads `true` everywhere — until then
the result is «conflicting scopes». Don't hand-edit `known_marketplaces.json`; it is the host's own
state file.

**A. Interactive UI:** `/plugin` → **Marketplaces** → pick the marketplace →
**enable auto-update**. The UI stores the flag in `~/.claude/plugins/known_marketplaces.json`
(`<name>.autoUpdate`), not in settings.json — observed on Claude Code 2.1.325, 2026-11; §4 reads it
there.

**B. settings.json edit (explicit, scriptable):** set `autoUpdate: true` under the marketplace's key,
in the scope the user wants:

- **User-wide** — `~/.claude/settings.json`
- **This project** — `.claude/settings.json`, or `.claude/settings.local.json` for an uncommitted
  personal override (precedence: §4).

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
on while pausing Claude Code's own binary updates. Look in all three places it can be set: the
current shell environment, the shell profile files, and the `env` block of every settings.json scope
from §2. If it is set and the user wants plugin updates, propose `FORCE_AUTOUPDATE_PLUGINS=1` beside
it rather than removing their binary-update choice. If the names seem inert, re-check the current
Claude Code docs — env names move. Close this step naming each place you read (shell env, which
profile files, which settings `env` blocks) — an unread profile file is how "enabled but still
stale" survives.

## 4. Verify — read the EFFECTIVE flag

Read `autoUpdate` for this marketplace from every place it can live: `.claude/settings.local.json`,
`.claude/settings.json`, `~/.claude/settings.json` and `~/.claude/plugins/known_marketplaces.json`.
Report each value you found and which file it came from. A project-level `false` overrides a
user-level `true`, so a user-wide write can still read OFF in this project. If the settings files and
`known_marketplaces.json` disagree, say so plainly rather than picking one — which of them wins is
not documented. **marketplace-health** runs the same check as a second opinion.

## 5. Refresh now — only if asked

Turning auto-update on does not pull anything this minute. `claude plugin marketplace update <name>`
does — run it when the user asked for an update now; otherwise offer it (go-ahead rule).

## Codex

There is **no auto-update flag** on Codex: it **auto-updates Git-sourced marketplaces
unconditionally** in the background (stated as of 2026-08 on Codex CLI; not re-measured on
codex-cli 0.169 — if a Git marketplace sits stale, `upgrade` below refreshes it by hand). Don't invent an
`autoUpdate` key in `config.toml`; it does not exist there. Read `source_type` under
`[marketplaces.<name>]` in `~/.codex/config.toml` (or `$CODEX_HOME/config.toml`):

- **`git`** → already auto-updating; nothing to enable. To pull the newest revision now (go-ahead
  rule): `codex plugin marketplace upgrade <name>` — omit the name to refresh every Git marketplace.
- **`local`** → Codex never refreshes it, and `upgrade` refreshes Git marketplaces only. Decide which
  kind of local it is before touching it:
  - **Bundled or managed by the host** (a path inside Codex's own data or cache directories, such as
    its bundled marketplaces) → leave it alone; there is no Git upstream to switch to. Report it.
  - **The user's own dev checkout** → expected to be updated by hand (`git pull` in the source).
    Leave it and say so.
  - **A snapshot of a Git repo** → re-add it from Git so it joins the auto-update set:
    `codex plugin marketplace add <owner/repo>` (or an HTTPS/SSH Git URL), carrying over any ref or
    sparse path the old entry used (`--ref`, `--sparse`). A config change, so the go-ahead rule
    applies. On codex-cli 0.169 (2026-11) this replaced the local entry of the same
    name in place. If Codex instead answers that the marketplace "is already added from a different
    source", run `codex plugin marketplace remove <name>` first, then the `add`.

**Verify:** re-read `config.toml` and confirm `source_type = "git"` under `[marketplaces.<name>]`
(`codex plugin marketplace list` shows only names and roots, not the source type). Check any command with `--help` first — the CLI surface moves.

## Output

Lead with the one action and its effect, matched to the case:

```
# Claude Code — enabled
Marketplace <name> (<source>)
 → autoUpdate = true in <file> (or /plugin → Marketplaces → enable auto-update).
   Effective value: ON (<file it came from>). Now stays current automatically.

# Claude Code — enabled but blocked
Marketplace <name>: autoUpdate = true, but DISABLE_AUTOUPDATER=1 is set in <where>.
 → add FORCE_AUTOUPDATE_PLUGINS=1 there to keep plugin updates on (proposed, not applied).

# Claude Code — conflicting scopes
Marketplace <name>: autoUpdate differs by file — <file>: true, <file>: false.
 → which one wins is not documented; <what the user should change to make them agree>.

# Claude Code — local directory
Marketplace <name> is a local directory → <your dev checkout, left as is | a copy of <owner/repo>:
 re-add it from GitHub (proposed / done)>.

# Codex — git source
Marketplace <name> is Git-sourced → Codex already auto-updates it. Nothing to enable.
 → `codex plugin marketplace upgrade <name>` pulls the newest revision right now.

# Codex — local snapshot re-added
Marketplace <name> was a local snapshot → re-added from <owner/repo>; source_type is now git.

# Codex — local, left alone
Marketplace <name> is <bundled by the host | your dev checkout> → left as is; <why>.
```

## Bundled resources

- `references/trigger-tests.md` — should-fire / should-not prompts. Read it when you change the
  `description`, and re-run them against the new text.
