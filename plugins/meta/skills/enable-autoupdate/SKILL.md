---
name: enable-autoupdate
description: Turn ON auto-update for an installed plugin marketplace — Claude Code or Codex — so it stays current on its own. Use when the user asks to "enable/turn on marketplace auto-updates", "keep my plugins up to date automatically", "stop my marketplace going stale", "make <marketplace> auto-update", or right after marketplace-health reports auto-update OFF — «увімкни авто-апдейт маркетплейсу», «хай плагіни оновлюються самі». Do not use it to check status (that's marketplace-health, which only diagnoses), nor to author/version a marketplace (that's plugin-dev). Covers the Claude Code settings flag and the Codex git-vs-local source fix.
---

# Enable marketplace auto-update

Keep an installed plugin marketplace from going stale — stop the "I pushed a new
skill and nobody sees it" problem on the *consumer* side. **The mechanism differs by
host, so branch first:**

- **Claude Code** → one setting controls it: `extraKnownMarketplaces.<name>.autoUpdate`
  in **settings.json** (third-party marketplaces default to **off**). Follow steps 1–4, then Output.
- **Codex** → there's **no flag**; git-sourced marketplaces auto-update on their own.
  Skip to the **Codex** section — the fix there is about the marketplace's *source*,
  not a toggle.

Pair with **marketplace-health** to confirm the result.

## Register the run

Register these as todo items now, before doing anything else, in whatever todo/plan tool this host
gives you — only the branch for the host you are fixing — and while work remains keep exactly one in
progress:
- **Claude Code:** 1. Identify the marketplace name + repo (§1)   2. Turn it on — UI, or a
  settings.json diff shown and approved first (§2)   3. Check the `DISABLE_AUTOUPDATER` override (§3)
  4. Verify it reads ON (§4)   5. Report (Output)
- **Codex:** 1. Read the marketplace's `source_type` (Codex)   2. Act on it (Codex) — `git`: nothing
  to enable, `upgrade` only if an immediate refresh was asked for; `local`: re-add from Git, unless
  it is a deliberate dev checkout (then leave it and say so)   3. Report (Output)
Register the conditional steps too: one a branch makes moot is completed WITH THAT REASON, never
left open — an unfinished list at the end must mean something really is unfinished.
No such tool? SEARCH for one first — on hosts with deferred tools it exists but is not loaded, and
its name differs per host. Anything that creates items and marks them in progress and completed IS
that tool, whatever it is called; an empty result for one remembered name is evidence about the name,
not about the host. It must be the SESSION's own planner, never an external tracker (Jira, Linear, a
task app): your bookkeeping is not their backlog. If there truly is none, keep the list in your
replies — state it once, name each item as you start it, account for every one at the end.

## 1. Identify the marketplace name (Claude Code)

The name is the `name` field in the marketplace's `marketplace.json`, and it's the key you'll write under `extraKnownMarketplaces`.
Confirm what's installed non-interactively:

```
claude plugin marketplace list --json
```

Each entry gives the marketplace `name` + its GitHub `repo` (`owner/repo`) — you
need both for the settings block below. Verify any command with `--help` if it
errors; the CLI surface moves.

## 2. Turn it on — two equivalent paths

**A. Interactive UI (let the user click):** `/plugin` → **Marketplaces** → pick the
marketplace → **enable auto-update**. Best when the user would rather not hand-edit
JSON — recommend this by default.

**B. settings.json edit (explicit, scriptable):** add or set `autoUpdate: true`
under the marketplace's key. Pick the scope deliberately:

- **User-wide** — `~/.claude/settings.json` (every project auto-updates it)
- **This project only** — `.claude/settings.json` (overrides the user file)

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

Merge into any existing `extraKnownMarketplaces` block — don't clobber other
marketplaces. If the key already exists with `autoUpdate: false`, just flip it to
`true`.

**Never edit the user's settings.json silently.** Always show the exact diff before writing
it. If the user explicitly asked to enable auto-update, that request is the go-ahead for this
diff; if the edit came up some other way, or the diff touches anything beyond this
marketplace's `autoUpdate`, wait for their yes (or hand them path A).

## 3. Mind the global override

`autoUpdate: true` still does nothing if updates are globally disabled: the env
var **`DISABLE_AUTOUPDATER=1`** turns off ALL updates regardless of the per-marketplace
flag. If auto-update "won't stick", check the environment. (`DISABLE_AUTOUPDATER=1`
together with `FORCE_AUTOUPDATE_PLUGINS=1` keeps plugin updates on while pausing
Claude Code's own binary updates.) Both names verified as of 2026-08 — if they seem
inert, re-check the current Claude Code docs; env names move.

## 4. Verify

Re-run **marketplace-health** (or read the flag back) to confirm it now reports
**auto-update: ON**. **The go-ahead rule (the same in marketplace-health and enable-autoupdate):** an explicit request to update / fix / enable IS the go-ahead for the state change it names; anything else — a refresh, install, settings edit or re-add the user did not ask for — is proposed with the exact command or diff, and run on their yes. So pull the current version immediately
(`claude plugin marketplace update <name>`) only when the user asked for it now; otherwise
offer it.

## Codex

Codex works differently: there is **no auto-update flag to set**, because Codex
**auto-updates git-sourced marketplaces unconditionally** — a built-in background
task keeps them current on its own (verified as of 2026-08 on Codex CLI). So "enabling" auto-update is about the
marketplace's **source**, not a toggle. Detect and act by `source_type` in
`~/.codex/config.toml` (`[marketplaces.<name>]`):

- **`source_type = "git"`** → already auto-updating. Nothing to enable; the
  Claude-Code `autoUpdate` action is a no-op here. To pull the newest revision
  immediately: `codex plugin marketplace upgrade <name>` (omit the name to refresh
  all git marketplaces).
- **`source_type = "local"`** → a pinned local snapshot Codex will **never**
  refresh (and `codex plugin marketplace upgrade` won't help — it refreshes only
  **git** marketplaces). The fix is to re-add it from its **Git** source (e.g.
  `codex plugin marketplace add <owner/repo>`) so it joins the auto-upgrade set — a config
  change: show the command; an explicit "enable auto-update" request covers it, otherwise run it
  on the user's yes (the go-ahead rule). A
  deliberate local dev checkout is expected to be updated by hand (git pull the
  source); there is no auto-update for it.

Verify any command with `--help` — the CLI surface moves. Don't invent an
`autoUpdate` key in `config.toml`; it does not exist there.

## Output

Lead with the one action and its effect, matched to the host:

```
# Claude Code
Marketplace <name> (<owner/repo>)
 → set extraKnownMarketplaces.<name>.autoUpdate = true in <scope> settings.json
   (or /plugin → Marketplaces → enable auto-update). Now stays current automatically.

# Codex — git source
Marketplace <name> is git-sourced → Codex already auto-updates it. Nothing to enable.
 → `codex plugin marketplace upgrade <name>` to pull the newest revision right now.

# Codex — local source
Marketplace <name> is a local (non-git) snapshot → Codex will never auto-update it.
 → re-add it from its Git source (`codex plugin marketplace add <owner/repo>`) to make it self-update.
```
