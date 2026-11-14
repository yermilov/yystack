---
name: plugin-dev
description: >-
  Package a skills marketplace and its plugins: layout, dual Claude + Codex manifests, version
  bumps, and where a skill belongs. Use when laying out a marketplace repo, adding/removing a plugin
  or skill, editing a marketplace.json or plugin.json, releasing a plugin, or bumping a version that
  marketplace-health showed was missed — "add a plugin", "package this skill for Claude and Codex",
  "which version do I bump", "which plugin should this skill go in", "where do hooks go in a
  plugin", "update the plugins table in the README", «додай плагін у маркетплейс». Do not use for
  the SKILL.md prose (skill-authoring), to diagnose an installed marketplace or a pushed change that
  never showed up (marketplace-health), to toggle its auto-update (enable-autoupdate), to bootstrap
  one from the canonical marketplace (clone-marketplace), nor to write hooks, commands, agents or
  MCP servers (the host's docs).
---

# plugin-dev — how a great skills marketplace looks

A **marketplace** is just a **git repo** that hosts installable **plugins**; a **plugin** is a
folder of **skills** with a manifest. Hosts also accept hooks, commands, agents and MCP servers:
writing those is the host's docs, but **packaging** them — where they sit, and that any change to
them bumps the version (§4) — is the same as for skills. Agents install a plugin and its skills
become available. The whole thing is plain files in git — no build step, no server.

Length: past the ~250-line default because §6's flows, §8's five decisions and the pre-ship
checklist are rulings applied while editing; the manifest templates and the grouping evidence
already live in `references/`.

Not for the `SKILL.md` prose (`skill-authoring`), an installed marketplace that looks stale
(`marketplace-health`), toggling auto-update (`enable-autoupdate`), bootstrapping a new one
(`clone-marketplace`), or writing hooks, commands, agents or MCP servers (the host's docs).

This skill is the prescriptive guide to structuring that repo so it (a) installs cleanly on **both**
Claude and Codex from one source, and (b) reliably delivers updates. The marketplace this skill
ships in is one worked example; when you read it from a copy inside another marketplace, that
marketplace is yours to apply it to.

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
│       ├── README.md              # what the plugin is + its skills (§7)
│       ├── hooks/                 # optional: hooks.json + the scripts it runs
│       └── skills/
│           └── <skill-name>/
│               ├── SKILL.md       # the skill (frontmatter + body)
│               ├── references/    # optional: docs loaded on demand
│               ├── scripts/       # optional: helper scripts the skill calls
│               ├── assets/        # optional: templates, images
│               └── agents/        # optional: openai.yaml — Codex-only per-skill settings
├── README.md                      # install instructions + what's inside
└── LICENSE                        # public repos: pick one (MIT is a safe default)
```

- **Rule:** one skill = one directory with a `SKILL.md`. One plugin = a directory under `plugins/`
  with **two** manifests and a `skills/` folder. One marketplace = the repo, with **two** top-level
  marketplace manifests.
- **Prefer** focused, single-purpose plugins over one giant plugin — installers add only what they
  want. Which skills go together, and when to split, move or merge, is section 8.

## 2. The two marketplace manifests

Each host reads its own file: `.claude-plugin/marketplace.json` (Claude) and
`.agents/plugins/marketplace.json` (Codex). **Keep both listing the same plugins.** Differences that
bite (verified as of 2026-11):

- For a plugin inside this repo, Claude's `source` is a **string path** and Codex's an **object**
  (`{ "source": "local", "path": … }`); each Codex entry also carries `policy` + `category` (copy them from `references/manifests.md`'s
  template; no script checks them). A
  Claude entry can instead name a remote source (an object pointing at another repo); this skill's
  layout and script cover in-repo plugins.
- Only the Claude marketplace manifest has a `metadata.version` (§4 says when to bump it).

## 3. A plugin = two manifests in lockstep

Every plugin carries BOTH `.claude-plugin/plugin.json` and `.codex-plugin/plugin.json`. The Codex
one is a superset (adds `license`, `keywords`, a `skills` path and an `interface` block for the
Directory card). Keep `name`, `version` and the gist of `description` identical across the two.

The `SKILL.md` files are **host-agnostic** — the same body backs both hosts. Write the skill once;
the two manifests are just packaging.

**Hooks** sit in `hooks/hooks.json` at the plugin root, and neither manifest names them. As of
2026-11 (Claude Code; codex-cli 0.169) both hosts discover that file and set `CLAUDE_PLUGIN_ROOT`
for its commands, so one file serves both. Codex runs plugin hooks only with `hooks = true` under
`[features]` in its config, and only after the user trusts each hook. So a hook can never be the
only path to anything that matters, and any output its script prints must be JSON both hosts
accept (a script that prints nothing is fine; the repo's own rules may say more).

**Codex per-skill settings** sit in an optional `agents/openai.yaml` beside a skill's `SKILL.md`:
its `interface` block names the skill in Codex's UI, and `policy.allow_implicit_invocation: false`
keeps the skill out of the model's context so it runs only when invoked explicitly as `$skill` — the
nearest to Claude's `disable-model-invocation: true` (codex-cli 0.169's own docs, 2026-11-14), so
never on a knowledge skill. Ship one only when you need one of those.

Read `references/manifests.md` when you create a marketplace or plugin from scratch, or a host
rejects a manifest — it has a copyable template for all four manifests and for `agents/openai.yaml`.

## 4. Version discipline — the gotcha that hides your work

Host behaviour below verified as of 2026-11; re-check it when a host changes its update flow.
Marketplace clients cache aggressively and key updates off the **declared version**. Get this wrong
and edits silently never reach anyone.

- **Must:** on ANY change to a plugin's files (add/edit/remove a skill, command, asset), **bump that
  plugin's `version` in BOTH manifests, in lockstep.** An unchanged version = installed clients keep
  their cached snapshot and never re-pull. The two package managers cache independently, so a bump
  in only one manifest leaves the other host stale.
- **Must:** when the marketplace's plugin **list** changes (a plugin ADDED or REMOVED), also bump
  `metadata.version` in `.claude-plugin/marketplace.json` — Claude caches the marketplace manifest
  keyed on that version (documented behaviour as of 2026-11, not measured here), so without the bump
  `Check for updates` reports "no change" and the new plugin never appears in Claude Code's plugin
  browser. (Per-plugin bumps re-pull a plugin's *contents*; the marketplace `metadata.version` is
  what makes clients re-pull the *manifest* and discover new plugins.) Bump it too when you edit an
  existing entry in `.claude-plugin/marketplace.json` (description, source, category): the manifest
  changed, an extra bump costs nothing, and without one clients may keep the cached copy.
- **Default:** semver-ish — patch for skill edits, minor for a new skill, and treat a new plugin as
  a marketplace minor bump too.
- **Avoid** assuming "deployed = visible in this session": a newly added plugin, skill or tool can
  stay invisible to a running agent until its client re-pulls its plugin snapshot, so don't promise
  a same-session dogfood (`marketplace-health` diagnoses it).

## 5. What makes a plugin/skill worth installing

- **One clear job per plugin**, named in a one-sentence description that says *what it does* **and**
  *when to install it*. A vague description is why nobody installs it.
- **Skills that trigger and stay lean** — that is the `skill-authoring` skill's whole subject;
  follow it for every `SKILL.md` you ship.
- **No secrets in the repo** — a public one is world-readable, and even a private one is cloned to
  every machine that installs it. Skills take config via flags/args and read tokens from the
  environment, never hard-coded.
- **A README per plugin** (§7).

## 6. Adding to the marketplace — the flows

Three rules run through every flow below, stated once here:

- **(M) `metadata.version`** — bump the Claude marketplace's `metadata.version` whenever the plugin
  list or any marketplace entry changes (§4). A flow that only edits a plugin's files does not.
- **(G) Grep before you delete, rename or move** — search the repo for the old name, bare, in
  `Requires:` lines, and qualified as `<plugin>:<skill>`, and repair every hit before the old thing
  disappears. A bare skill name resolves across all installed plugins, so `skill-authoring` survives
  a move; a qualified `<old-plugin>:<skill>` does not. So write bare names by default, and qualify
  one only to disambiguate two skills that share a name.
- **(N) A plugin name that disappears strands its installers** — both hosts key an install as
  `<plugin>@<marketplace>` (observed 2026-11-14 in Claude Code's installed-plugins file and Codex's
  config), so after a rename, a split that moves skills into a new plugin, a merge or a removal, auto-update
  keeps serving the old install and the skills are simply gone for those users. Say so in the README
  (and the changelog, if you keep one) — with the install command for the new name, or that the
  plugin is retired — and tell the user.

Before you start a flow, register its actions in this session's own todo/plan tool (search for one
first; with none, keep the list in your replies; never an external tracker), close a step that does
not apply with that reason, and make the last item the validator run below — so a skipped step
shows as open rather than as done.

**Add a plugin:** create `plugins/<name>/` with both manifests (v0.1.0) + `skills/` + a README; add
the entry to BOTH `marketplace.json` files; (M); update the root README.

**Add a skill to an existing plugin:** create `plugins/<plugin>/skills/<skill>/SKILL.md`; bump that
plugin's `version` in both manifests; add its bullet to the plugin README and its gist to the root
Plugins-table row (§7). If a plugin or marketplace description names the plugin's skills, add the
new one there too, then (M) if a marketplace entry changed.

**Remove a plugin:** (G) first; (N); delete its directory and its entry from BOTH `marketplace.json`
files; (M); drop its root README row.

**Rename a plugin:** (G) for the old name; (N); `git mv` its directory; change `name` in both plugin
manifests and both marketplace entries, plus each `source` path; bump the plugin's version; (M);
update both README layers.

**Rename a skill:** (G) for the old name; change the directory and the frontmatter `name` together;
bump the plugin's version in both manifests; fix READMEs and descriptions that name it, then (M) if
a marketplace entry changed.

**Remove a skill:** (G) first — point each hit (a routing pointer, a handoff step) at the skill that
replaces it; then delete its directory; bump the plugin's version in both manifests; drop it from
the plugin README, the root Plugins-table row and any description that names it, then (M) if a
marketplace entry changed.

**Split skills into a new plugin:** (G) for each `<old-plugin>:<skill>`; (N); `git mv` the skill
dirs; create the new plugin's two manifests and register it in both marketplace files; (M); bump the
SOURCE plugin's version; update READMEs and any description naming the moved skills.

**Move a skill between existing plugins:** (G) for `<old-plugin>:<skill>`; `git mv` the skill dir;
bump BOTH plugins' versions; update both plugin READMEs, both root Plugins-table rows and any
description that names the skill, then (M) if a marketplace entry changed.

**Merge two plugins:** (N) for the plugin that disappears; move the skills into the survivor as
above, then remove the other plugin as above — so the survivor's version and `metadata.version` are
both bumped.

Every flow ends with `check-manifests.ts … --base <ref>` (the Pre-ship checklist has the
invocation): exit 1 means the flow is not finished. *When* to do any of these: §8.

## 7. Maintaining the READMEs

The two README layers are the marketplace's human-facing surface; they go stale the moment a change
ships without touching them, so treat updating them as part of every change, not an afterthought.

**Root `README.md`** (the marketplace):
- The **Plugins table** lists every plugin with a description of the **plugin as a whole** — its job
  and the skills it ships (with a few-word gist each). Don't let the row describe just one skill of
  a multi-skill plugin, and don't duplicate a skill's full frontmatter — one table row per plugin.
- Update the row whenever a plugin's skill set or purpose changes; add/remove rows in the same
  commit that adds/removes a plugin (the §6 flows apply).
- Keep it to what exists **now** — no placeholder/"coming soon" filler rows or notes.
- The rest of the root README is install instructions per host — verify they still hold whenever the
  install flow or repo name changes.

**Per-plugin `plugins/<name>/README.md`:**
- A short intro (what the plugin is for) + a **Skills** list: one bullet per skill with what it does
  and when it triggers — enough for a human browsing the repo to decide to install.
- Update the bullet in the same commit that adds, removes, renames, or materially changes a skill. A
  plugin README edit is a plugin-file change, so the plugin **version bump** (section 4) applies.
- Keep repo-wide conventions (layout, version discipline) out of plugin READMEs — they live in this
  skill and in the repo's own memory file (`CLAUDE.md` / `AGENTS.md`); a plugin README describes
  only that plugin.

## 8. Where a skill belongs — grouping skills into plugins

Section 6 says *how* to add, remove, split, move and merge; this section says *when*. **A plugin is
the unit of an install decision** — skills live together when the same user on the same host wants
them together.

**Name the plugin's kind first:**
- **Domain** — around an object the user cares about (money, home, health); its skills are the jobs
  done on it.
- **Tool** — around an instrument (a browser, a messenger, a cloud provider); its skills are how to
  drive it, reusable by any domain.
- **Platform** — the environment every skill runs inside (the task system, the user profile, the
  development process). Keep it small and stable; everyone pays for its churn.

A plugin grouped by **how its skills trigger** ("everything on a schedule") is none of these — split
it by domain. A skill that mixes both ("pay the bill through the bank's website") belongs to the
**domain**; the browser mechanics stay in the tool plugin, referenced by name.

**Dependencies run one way:** domain → tool, tool → tool, and anyone → platform; never tool → domain
(a tool plugin must not know its consumers); domain → domain is a smell (merge, or extract the
shared instrument); no cycles. A routing pointer (*Do not use for… — that's `<skill>`*) is not a
dependency and may point anywhere: nothing breaks if the target is missing. A step that hands the
agent work in another skill is one, so give it a **capability gate**: check that the skill is
actually available before the step, and name what to do when it is not (do the work inline, or
report the gap). A skill shipped minutes ago may not be visible yet (§4). Declare a real dependency
in the dependent plugin's README ("Requires: `<plugin>`").

**The five decisions:**
1. **Which plugin gets a new skill?** The one whose one-sentence job covers it *without widening the
   sentence*; with two candidates, the **domain** decides, not the instrument.
2. **New plugin** when no job fits without "…and also X", or the skill has a different **install
   boundary** (audience, public vs private, one host/OS, heavy dependencies), or it is a tool plugin
   others depend on. Otherwise wait for 2–3 skills of the new domain.
3. **Split** when the description needs "and… and…", skills form clusters that never reference each
   other, installers want only part of it, or a reusable instrument grew inside a domain (extract a
   tool plugin). Size alone only says *look*, and a split strands existing installers of the moved
   skills (§6 rule N).
4. **Move a skill** when its references and triggers point into another plugin, or it is a tool
   recipe in a domain plugin (or the reverse).
5. **Merge** when two plugins are always installed together, for one audience, under one sentence,
   and reference each other.

**Privacy decides where a plugin may live, not which plugin a skill joins:** a skill carrying
personal data never joins a public plugin or marketplace — strip it to the reusable pattern first,
or keep it private. In a private, single-user marketplace the install-decision test rarely says no,
so decide by the description sentence, the clusters and the dependency direction. Split memory by
scope: facts about the user that no one domain owns go in the platform (profile) plugin; a domain's
facts stay in that domain's plugin, beside the method that uses them.

Read `references/grouping.md` when a placement is genuinely contested or you must explain it — it
has the reasoning and examples behind each ruling above.

## Pre-ship checklist

Register them in this session's own todo/plan tool (search for one first; with none, keep the list
in your replies), close each item with what you looked at, and close one that does not apply WITH
THAT REASON.

1. Repo has both marketplace manifests (`.claude-plugin/` + `.agents/plugins/`), listing the same
   plugins.
2. Every plugin has BOTH `plugin.json` manifests with matching `name`/`version`.
3. Every skill dir has a `SKILL.md` with a `description` (whether it triggers well is
   skill-authoring's checklist).
4. Versions bumped for the change you made (plugin version always; marketplace `metadata.version` if
   the plugin list changed or an entry was edited).
5. No secrets committed.
6. A `LICENSE` is present (public repo).
7. No personal data in a public plugin (§8).
8. Root README has an install command block for each target host (Claude Code, Codex, …).
9. The root Plugins table has a current row per plugin (§7).
10. Each plugin README's skill bullets match its skills (§7).
11. Every manifest and `hooks/hooks.json` parses as JSON; each `SKILL.md` frontmatter and
    `agents/openai.yaml` parses as YAML.
12. After a rename, move, split or remove, a grep for each old `<plugin>:<skill>` returns nothing,
    and so does one for the old plugin name when that plugin was renamed or removed (§6 rule G) —
    apart from the installer notice of item 14 and any changelog entry, which name it on purpose.
13. After a skill rename or remove, a grep for the old bare skill name returns nothing.
14. After a plugin rename, split, merge or removal, the README tells existing installers the new
    install command, or that the plugin is retired (§6 rule N).

Items 1–4 and 11 are mechanical, and items 6, 9, 10 and (with `--base`) 12–14 get a shortlist — run
the script rather than checking by eye, and read its exit code (0 clean, 1 defects listed with the
fix, 2 could not run):

```bash
bun run "SKILLDIR/scripts/check-manifests.ts" "MARKETPLACE_ROOT" --base origin/main
```

⚠️ Substitute both placeholders with **literal** paths — `SKILLDIR` is the directory you loaded this
`SKILL.md` from; it is not a shell variable. `--base` is the ref your change will land on; omit it
to check only the static structure (all but items 4 and 12–14). It also flags a plugin directory (a manifest or
`skills/`) that neither marketplace lists — the forgotten step of «Add a plugin». It prints notes,
not defects, for a missing `LICENSE` (only you know whether the repo is public) and for a plugin or
skill a README never names (a shortlist for items 9–10; a description that lists skill names is
yours to read).

No Bun? Install it with the `install-bun` skill, or check those items by hand.

## Bundled resources

- `references/manifests.md` — copyable templates for the four manifest files. Read it when creating
  a marketplace or plugin, or when a host rejects a manifest.
- `references/grouping.md` — the reasoning behind §8. Read it when a placement is contested.
- `references/trigger-tests.md` — should-fire / should-not prompts. Re-run them after any edit to
  the `description`.
- `scripts/check-manifests.ts` — the mechanical half of the pre-ship checklist (above).
