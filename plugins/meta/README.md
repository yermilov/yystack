# meta

The **meta** plugin for the `yystack` marketplace — the tooling for building the marketplace
itself. It ships six skills and a session-start hook:

## Skills

- **plugin-dev** — a prescriptive guide to building a great skills marketplace and the plugins that
  live in it: the repo layout, the **Claude + Codex dual-manifest** packaging, the **version-bump
  discipline** the marketplace auto-update keys off, **where a skill belongs** (domain, tool and platform plugins,
  one-way dependencies, when to create, split, move or merge a plugin), and what makes a plugin/skill
  actually worth installing. Ships `scripts/check-manifests.ts`, which runs the mechanical half of its
  pre-ship checklist (both marketplaces agree, manifests in lockstep, versions bumped vs a base ref).
  Trigger when setting up or growing a plugin marketplace, adding a plugin,
  deciding which plugin a skill goes in, packaging a skill for Claude and/or Codex, or fixing a change
  that never reached clients because a version wasn't bumped (diagnosing an install is
  marketplace-health).
- **skill-authoring** — how to write, structure, and review great Agent Skills (SKILL.md files): the
  description/frontmatter that decides triggering, progressive-disclosure structure and length,
  writing style for an LLM reader, when to bundle scripts/references/assets, named anti-patterns,
  and how to make one skill portable across both Claude and Codex. Gives **workflow skills** their own
  contract — the copyable Step-0 TODO block a running agent registers, **one item per
  independently-skippable check** so a partly-done step can't close as done, a per-kind skeleton, and
  length budgeted per step with each deep step's evidence in `references/`. Carries the **Claude 5
  context-engineering reversals** — under-constrain on purpose, design interfaces instead of giving
  examples, prefer references in code form — with the measured precedents in `references/`, a
  trigger-test set for itself, `scripts/audit-frontmatter.ts` (every description against the loader's
  cap) and `scripts/audit-markers.ts` (the `Length verdict` line and the Step-0 marker, ignoring
  quotes inside code).
- **marketplace-health** — diagnose an already-installed marketplace on **Claude Code or Codex**: is
  the latest published version of each plugin actually installed (vs a stale cached copy), and is
  auto-update active so it stays current? Ships `scripts/check-health.ts`, a read-only check that
  verifies installed versions against the remote without refreshing anything; it refreshes or
  updates only on an explicit request. Trigger on "am I on the latest?", "why didn't my new skill
  show up after I pushed?", or "are plugin auto-updates on?".
- **enable-autoupdate** — the action counterpart to marketplace-health, on **both hosts**: on Claude
  Code set `extraKnownMarketplaces.<name>.autoUpdate = true` (or the `/plugin` UI toggle); on Codex
  git-sourced marketplaces already auto-update, so the fix for a stale one is re-adding it from its
  Git source or `codex plugin marketplace upgrade`. Trigger on "enable/turn on marketplace
  auto-updates", "keep my plugins up to date automatically", or right after marketplace-health
  reports auto-update OFF.
- **clone-marketplace** — bootstrap a **new** marketplace repo (or bring an existing one up to date)
  from this marketplace's structure + meta plugin, always fetched from **GitHub at the latest
  version**. Ships a Bun script `clone-marketplace.ts`: `--new` scaffolds a fresh repo (both
  marketplace manifests, the meta plugin, CLAUDE.md/AGENTS.md, README, MIT LICENSE, git init);
  `--update` refreshes an existing repo's meta plugin + scaffolding in place, leaving your own plugins
  untouched. Trigger on "create/start my own skills marketplace", "clone a marketplace like this one",
  or "update my marketplace's meta plugin to the latest".
- **install-bun** — install the **Bun** runtime this marketplace's scripts run on. Its executables
  (the `clone-marketplace` script and the session-start health hook) are written in **Bun +
  TypeScript**, so a machine without Bun can't run them. Presents the install command (official
  installer, Homebrew, or npm) for the user to run, then verifying `bun --version` and fixing PATH.
  Trigger when Bun is missing — the session-start check reports it isn't installed, a `bun` command
  fails, or the user asks to "install bun".

## Session-start hook

The plugin also ships a **cross-host `SessionStart` hook** (`hooks/hooks.json` →
`hooks/scripts/marketplace-health-check.sh`) that runs on **both Claude Code and Codex** (both
auto-discover `hooks/hooks.json` and set `CLAUDE_PLUGIN_ROOT`; the script emits the cross-host
`{"hookSpecificOutput":{…}}` JSON both accept). On Codex it runs only with `hooks = true` under
`[features]` in the config, and after you trust the hook when Codex asks. The entry point is a **thin shell wrapper**: it
detects whether **Bun** is installed and, if so, `exec`s the real check —
`marketplace-health-check.ts` (Bun + TypeScript, per the repo's script rule); if Bun is missing it
emits a one-line nudge to run the `install-bun` skill instead of erroring. On session start the check
speaks **only when this marketplace won't stay current on its own** — Claude Code with `autoUpdate`
off, or a Codex `source_type = "local"` (non-git) install — injecting a one-line nudge to run the
`enable-autoupdate` skill. When auto-update is active (Claude Code `autoUpdate` on, or a Codex git
marketplace) it stays **silent**. It detects the host from where the plugin is installed, is
local-only (no network), non-blocking, and degrades quietly to silence if a file or tool is missing.
