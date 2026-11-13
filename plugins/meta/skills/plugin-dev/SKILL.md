---
name: plugin-dev
description: >-
  Build and maintain an AI-agent skills marketplace and its plugins: repo layout, the Claude + Codex
  dual-manifest packaging, the version-bump discipline auto-update keys off, adding a plugin or skill,
  and which plugin a skill belongs in (split, move, merge). Use when creating a marketplace,
  adding/removing a plugin, packaging a skill for Claude Code / Cowork / Codex, editing a
  marketplace.json or plugin.json, or debugging why a new plugin or skill doesn't show up after an
  update — "add a plugin", "package this skill for Claude and Codex", "my new plugin isn't showing
  up", "which plugin should this skill go in". Do not use for writing the SKILL.md prose (that's
  skill-authoring), nor for authoring hooks, slash commands, agents or MCP servers — use the host's
  own plugin-component docs or skills for those; this is about marketplace + plugin PACKAGING.
---

# plugin-dev — how a great skills marketplace looks

A **marketplace** is just a **git repo** that hosts installable **plugins**; a **plugin** is a folder
of **skills** (hosts also accept commands, agents, hooks and MCP servers — out of scope here) with a
manifest. Agents install a plugin and its skills become available. The whole thing is plain files in
git — no build step, no server.

This skill is the prescriptive guide to structuring that repo so it (a) installs cleanly on **both**
Claude and Codex from one source, and (b) reliably delivers updates. The marketplace this skill ships
in is one worked example; when you read it from a copy inside another marketplace, that marketplace is
yours to apply it to.

## The one job

A marketplace exists to get **the right skill in front of an agent at the right moment, and keep it
current.** Everything below serves that: a clear plugin split (so installers pick what they need),
correct dual manifests (so it works on both hosts), and version discipline (so updates actually
reach installed clients). Anything that doesn't serve it is noise — cut it.

## 1. Repo layout — the canonical shape

```
<marketplace-repo>/
├── .claude-plugin/
│   └── marketplace.json          # Claude marketplace manifest (lists plugins)
├── .agents/
│   └── plugins/
│       └── marketplace.json      # Codex marketplace manifest (lists plugins)
├── plugins/
│   └── <plugin-name>/
│       ├── .claude-plugin/
│       │   └── plugin.json        # Claude plugin manifest
│       ├── .codex-plugin/
│       │   └── plugin.json        # Codex plugin manifest
│       ├── README.md              # what the plugin is + its skills + authoring notes
│       └── skills/
│           └── <skill-name>/
│               ├── SKILL.md       # the skill (frontmatter + body)
│               ├── references/    # optional: docs loaded on demand
│               ├── scripts/       # optional: helper scripts the skill calls
│               └── assets/        # optional: templates, images
├── README.md                      # install instructions + what's inside
└── LICENSE                        # public repos: pick one (MIT is a safe default)
```

- **Rule:** one skill = one directory with a `SKILL.md`. One plugin = a directory under `plugins/`
  with **two** manifests and a `skills/` folder. One marketplace = the repo, with **two** top-level
  marketplace manifests.
- **Prefer** several small, single-purpose plugins over one giant plugin — installers add only what
  they want, and a focused plugin description triggers better in the Directory. Which skills go
  together, and when to split, move or merge, is section 8.

## 2. The two marketplace manifests

Each host reads its own file: `.claude-plugin/marketplace.json` (Claude) and
`.agents/plugins/marketplace.json` (Codex). **Keep both listing the same plugins.** Differences that
bite (verified as of 2026-11):

- Claude's plugin `source` is a **string path**; Codex's is an **object**
  (`{ "source": "local", "path": … }`), and each Codex entry also carries `policy` + `category`.
- Only the Claude marketplace manifest has a `metadata.version` (§4 says when to bump it).

## 3. A plugin = two manifests in lockstep

Every plugin carries BOTH `.claude-plugin/plugin.json` and `.codex-plugin/plugin.json`. The Codex one
is a superset (adds `license`, `keywords`, a `skills` path and an `interface` block for the Directory
card). Keep `name`, `version` and the gist of `description` identical across the two.

The `SKILL.md` files are **host-agnostic** — the same body backs both hosts. Write the skill once; the
two manifests are just packaging.

Read `references/manifests.md` when you create a marketplace or plugin from scratch, or a host rejects
a manifest — it has a copyable template for all four files.

## 4. Version discipline — the gotcha that hides your work

Marketplace clients cache aggressively and key updates off the **declared version**. Get this wrong
and edits silently never reach anyone.

- **Must:** on ANY change to a plugin's files (add/edit/remove a skill, command, asset), **bump that
  plugin's `version` in BOTH manifests, in lockstep.** An unchanged version = installed clients keep
  their cached snapshot and never re-pull. The two package managers cache independently, so a bump in
  only one manifest leaves the other host stale.
- **Must:** when the marketplace's plugin **list** changes (a plugin ADDED or REMOVED), also bump
  `metadata.version` in `.claude-plugin/marketplace.json` — Claude caches the marketplace manifest
  keyed on that version, so without the bump `Check for updates` reports "no change" and the new
  plugin never appears in the Directory. (Per-plugin bumps re-pull a plugin's *contents*; the
  marketplace `metadata.version` is what makes clients re-pull the *manifest* and discover new
  plugins.) The Codex marketplace manifest has no version field, so only Claude needs this.
- **Default:** semver-ish — patch for skill edits, minor for a new skill, and treat a new plugin as a
  marketplace minor bump too.
- **Never** assume "deployed = visible in this session." A newly-added plugin/skill/tool can stay
  invisible to a running agent until its client reconnects / refreshes its plugin snapshot. Don't
  promise a same-tick dogfood — and don't write a routing rule in another skill that points at a
  just-shipped plugin without a capability gate and a named fallback: until the client re-pulls,
  that pointer leads nowhere (`marketplace-health` diagnoses it).

## 5. What makes a plugin/skill worth installing

- **One clear job per plugin**, named in a one-sentence description that says *what it does* **and**
  *when to install it*. A vague description is why nobody installs it.
- **Skills that trigger and stay lean** — that is the `skill-authoring` skill's whole subject; follow
  it for every `SKILL.md` you ship.
- **No secrets in the repo** — it's public. Skills take config via flags/args and read tokens from
  the environment, never hard-coded.
- **A README per plugin** listing its skills + one-line triggers, so a human browsing the repo knows
  what they're getting.

## 6. Adding to the marketplace — the flows

**Add a plugin:** create `plugins/<name>/` with both manifests (v0.1.0) + `skills/` + a README; add
the entry to BOTH `marketplace.json` files; **bump the Claude marketplace `metadata.version`**; update
the root README.

**Add a skill to an existing plugin:** create `plugins/<plugin>/skills/<skill>/SKILL.md`; **bump that
plugin's `version` in both manifests**; mention it in the plugin README. (No marketplace
`metadata.version` bump — the plugin list didn't change.)

**Split skills into a new plugin:** `git mv` the skill dirs, create the new plugin's two manifests,
register it in both marketplace files, bump the SOURCE plugin's version, and update READMEs.
Cross-skill references resolve by **name** across all installed plugins, so no rewrites are needed —
just keep the referenced plugins installed alongside. (*When* to split, move or merge: section 8.)

## 7. Maintaining the READMEs

The two README layers are the marketplace's human-facing surface; they go stale the moment a change
ships without touching them, so treat updating them as part of every change, not an afterthought.

**Root `README.md`** (the marketplace):
- The **Plugins table** lists every plugin with a description of the **plugin as a whole** — its job
  and the skills it ships (with a few-word gist each). Don't let the row describe just one skill of a
  multi-skill plugin, and don't duplicate a skill's full frontmatter — one table row per plugin.
- Update the row whenever a plugin's skill set or purpose changes; add/remove rows in the same commit
  that adds/removes a plugin (together with the manifest edits and the marketplace
  `metadata.version` bump).
- Keep it to what exists **now** — no placeholder/"coming soon" filler rows or notes.
- The rest of the root README is install instructions per host — verify they still hold whenever the
  install flow or repo name changes.

**Per-plugin `plugins/<name>/README.md`:**
- A short intro (what the plugin is for) + a **Skills** list: one bullet per skill with what it does
  and when it triggers — enough for a human browsing the repo to decide to install.
- Update the bullet in the same commit that adds, removes, renames, or materially changes a skill.
  A plugin README edit is a plugin-file change, so the plugin **version bump** (section 4) applies.
- Keep repo-wide conventions (layout, version discipline) out of plugin READMEs — they live in this
  skill and in the repo's own memory file (`CLAUDE.md` / `AGENTS.md`); a plugin README describes only
  that plugin.

## 8. Where a skill belongs — grouping skills into plugins

Section 6 says *how* to add, split and move; this section says *when*. **A plugin is the unit of an
install decision** — skills live together when the same user on the same host wants them together.

**Name the plugin's kind first:**
- **Domain** — around an object the user cares about (money, home, health); its skills are the jobs
  done on it.
- **Tool** — around an instrument (a browser, a messenger, a cloud provider); its skills are how to
  drive it, reusable by any domain.
- **Platform** — the environment every skill runs inside (the task system, the user profile, the
  development process). Keep it small and stable; everyone pays for its churn.

A plugin grouped by **how its skills trigger** ("everything on a schedule") is none of these — split it
by domain. A skill that mixes both ("pay the bill through the bank's website") belongs to the
**domain**; the browser mechanics stay in the tool plugin, referenced by name.

**Dependencies run one way:** domain → tool and anyone → platform; never tool → domain (a tool plugin
must not know its consumers); domain → domain is a smell (merge, or extract the shared instrument); no
cycles. A routing pointer (*Do not use for… — that's `<plugin>:<skill>`*) is not a dependency and may
point anywhere. Declare a real dependency in the dependent plugin's README ("Requires: `<plugin>`").

**The five decisions:**
1. **Which plugin gets a new skill?** The one whose one-sentence job covers it *without widening the
   sentence*; with two candidates, the **domain** decides, not the instrument.
2. **New plugin** when no job fits without "…and also X", or the skill has a different **install
   boundary** (audience, public vs private, one host/OS, heavy dependencies). Otherwise wait for 2–3
   skills of the new domain.
3. **Split** when the description needs "and… and…", skills form clusters that never reference each
   other, or a reusable instrument grew inside a domain (extract a tool plugin). Size alone only says
   *look*.
4. **Move a skill** when its references and triggers point into another plugin, or it is a tool recipe
   in a domain plugin (or the reverse).
5. **Merge** when two plugins are always installed together, for one audience, under one sentence,
   and reference each other.

**Privacy decides where a plugin may live, not which plugin a skill joins:** a skill carrying
personal data never joins a public plugin or marketplace — strip it to the reusable pattern first, or
keep it private. In a private, single-user marketplace the install-decision test rarely says no, so
decide by the description sentence, the clusters and the dependency direction.

Read `references/grouping.md` when a placement is genuinely contested or you must explain it — it has
the reasoning and examples behind each ruling above.

## Pre-ship checklist

1. Repo has both marketplace manifests (`.claude-plugin/` + `.agents/plugins/`), listing the same plugins.
2. Every plugin has BOTH `plugin.json` manifests with matching `name`/`version`.
3. Every skill dir has a `SKILL.md` with a triggering `description`.
4. Versions bumped for the change you made (plugin version always; marketplace `metadata.version` if the plugin list changed).
5. No secrets committed; a `LICENSE` present (public repo).
6. Root README documents how to install on each target host (see the repo README).
7. READMEs are in sync with the change (root Plugins table row per plugin; plugin README's skill
   bullets) — see section 7.
8. All JSON parses and each `SKILL.md` frontmatter parses as YAML.

Items 1, 2, 4 and 8 are mechanical — run the script rather than checking them by eye, and read its
exit code (0 clean, 1 defects listed with the fix, 2 could not run):

```bash
bun run "SKILLDIR/scripts/check-manifests.ts" "MARKETPLACE_ROOT" --base origin/main
```

⚠️ Substitute both placeholders with **literal** paths — `SKILLDIR` is the directory you loaded this
`SKILL.md` from; it is not a shell variable. `--base` is the ref your change will land on; omit it to
check only the static structure (items 1, 2, 8).

## Bundled resources

- `references/manifests.md` — copyable templates for the four manifest files. Read it when creating a
  marketplace or plugin, or when a host rejects a manifest.
- `references/grouping.md` — the reasoning behind §8. Read it when a placement is contested.
- `scripts/check-manifests.ts` — the mechanical half of the pre-ship checklist (above).
