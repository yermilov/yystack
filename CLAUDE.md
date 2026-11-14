# yystack — repository guide

Guidance for agents (and humans) working in this marketplace repo. `AGENTS.md` is a
symlink to this file, so Claude Code, Codex, and other agents all read the same guide.

## Repository layout

```
.claude-plugin/marketplace.json     # Claude marketplace manifest
.agents/plugins/marketplace.json    # Codex marketplace manifest
plugins/<name>/
  .claude-plugin/plugin.json         # Claude plugin manifest
  .codex-plugin/plugin.json          # Codex plugin manifest
  README.md
  skills/<skill>/SKILL.md            # the skill (host-agnostic)
```

Adding a plugin or a skill has a **version-bump discipline** the marketplace auto-update depends on —
the `plugin-dev` skill spells it out. In short: bump a plugin's `version` in **both** its manifests on
any change, and bump the Claude marketplace's `metadata.version` whenever the plugin **list** changes
or an entry in that manifest is edited.

## This repo is the canonical source of the `meta` plugin

`clone-marketplace` fetches `plugins/meta/` **from here, from GitHub, at the latest version** — that is
what other marketplaces bootstrap and update from. So an edit under `plugins/meta/**` is an edit to
everyone's copy: bump the version in both manifests, and keep the content host-agnostic.

## Support both hosts (Claude Code + Codex)

**Default every skill, plugin, and hook to work on BOTH Claude Code and Codex** — single-host is the
exception you must justify, not the default. Write skill bodies host-agnostic (name capabilities, not
one host's tools), ship both manifests (`.claude-plugin` + `.codex-plugin`), and prefer one artifact
both hosts accept (e.g. a SessionStart hook whose script emits the cross-host
`{"hookSpecificOutput":{…}}` JSON — Codex requires it and Claude Code accepts it). Only when a step is
genuinely impossible on a host, gate just that step and keep the rest portable. Full guidance lives in
the `skill-authoring` skill (§9) and `plugin-dev`.

## Keep skills generic — no personal data

This is a **public** marketplace: every skill must be generic and reusable by anyone. **Never bake in
the author's personal or private specifics** — real ISP / vendor / hardware model names tied to one
person's setup, home or network layout, account or address details, measurements taken at one
location, names, or any identifying data. Teach the *method* with generic, illustrative examples
instead ("a gigabit plan behind a Wi-Fi 5 router", not a named product someone owns). If a skill grew
out of a concrete personal case, **strip it down to the reusable pattern before publishing** — keep
the lesson, drop the identifying particulars. Personal context belongs in your own private notes, not
in a shipped skill.

## Scripts: Bun + TypeScript

Write **every executable this repo ships** — hook scripts, skill `scripts/`, and repo tooling — in
**Bun + TypeScript** (`.ts` run with `bun`), not shell. One runtime + a typed language keeps the
scripts consistent, testable, and safe to refactor.

- **Skill / tooling scripts:** a `.ts` invoked with `bun run <path>` (or a `#!/usr/bin/env bun`
  shebang + `chmod +x`). Take config via flags/args; read secrets from the environment, never
  hard-code them (the repo is public).
- **Hook scripts** are a **thin POSIX-shell wrapper** that detects Bun and, when present, `exec`s the
  real Bun + TypeScript check (`<name>.ts`); the wrapper itself stays minimal (a couple of `command
  -v bun` lines), all logic lives in the `.ts`. The wrapper must handle the **Bun-missing** case
  without ever erroring or breaking the session — it either stays a **clean no-op** (no output,
  exit 0) or emits **one** non-error cross-host `{"hookSpecificOutput":{…}}` line pointing the user at
  the `install-bun` skill (a self-resolving nudge that disappears once Bun is installed). It must
  **never** exit non-zero or block the session. Note the tradeoff: the Bun-backed half only runs where
  Bun is installed — that's the price of the typed toolchain, accepted deliberately here (the shell
  wrapper is the one exception to the Bun-only rule, precisely so it can run before Bun exists).

(Any shell scripts that predate this rule should be converted to Bun + TypeScript when next touched.)

## Review every commit against the meta plugin

Before **each commit** to this repo, review the full change set against the instructions in the
`meta` plugin (`plugins/meta/skills/`):

- **plugin-dev** — repo layout, dual-manifest packaging, version-bump discipline, README maintenance
  (root Plugins table + per-plugin READMEs), and its **pre-ship checklist**; run the checklist over
  the diff before committing.
- **skill-authoring** — any added or edited `SKILL.md` must follow it (triggering description, lean
  body, progressive disclosure into the skill's **own** bundled `references/` `scripts/` `assets/`,
  never into a file outside the marketplace). Referring to a *sibling skill by name* is the
  encouraged way to compose them — that is not an external reference.
- **marketplace-health** — after publishing, use it to verify the installed marketplace actually
  picked the change up.

If a change contradicts those skills, fix the change or — when the convention itself is wrong —
update the skill in the same commit so the instructions and the repo never drift apart.
