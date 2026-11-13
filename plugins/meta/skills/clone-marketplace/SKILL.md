---
name: clone-marketplace
description: >-
  Bootstrap a NEW AI-agent skills marketplace, or bring an existing one's meta plugin and structure up
  to date, from the canonical marketplace — always fetched from GitHub at the latest version, never a
  local copy. Use when the user wants to "create/start my own skills marketplace", "clone/bootstrap a
  marketplace like this one", "scaffold a new plugin marketplace repo", or "update my marketplace's
  meta plugin / structure to the latest" — «створи свій маркетплейс скілів», «онови meta-плагін
  маркетплейсу». Do NOT use to add one plugin/skill to a marketplace you already run (that is
  plugin-dev), nor to write SKILL.md prose (skill-authoring). Runs a bundled Bun script (--new
  scaffolds, --update refreshes meta in place).
---

# clone-marketplace — start a marketplace, or update it, from the canonical one

A skills marketplace is just a git repo with a known shape (`plugin-dev` documents it). This skill
copies that shape — the two marketplace manifests, the **meta plugin**, `CLAUDE.md`/`AGENTS.md`, a
README and LICENSE — so someone can stand up their own marketplace in one step, and keep its meta
plugin current later.

**The one rule that matters:** the meta plugin and structure are pulled **from GitHub, at the latest
commit** (a shallow clone of the source repo's default branch) — *never* from a local checkout. So a
clone/update always gets today's meta plugin, whatever is (or isn't) on the machine running this.

The work is deterministic, so it lives in a script — you mostly run it and then do the human-only
follow-ups (create the GitHub repo, review, commit).

## Register the run

Register these as todo items now, before doing anything else, in whatever todo/plan tool this host
gives you — and while work remains keep exactly one in progress. Register the list for the branch
this run follows:

**`--new`:** 1. Check `bun` is installed, else run install-bun (§ The script)
2. Run `--new` with the name and owner (§ 1)   3. Run the plugin-dev pre-ship checklist over the
result (§ After running) — its close enumerates the three checks
4. Confirm no secrets landed in the scaffold (§ After running)   5. Hand the user the human
follow-ups: create the GitHub repo, commit + push, add plugins (§ 1)

**`--update`:** 1. Check `bun` is installed, else run install-bun (§ The script)
2. Preview with `--update --dry-run` (§ 2)   3. Run `--update` (§ 2)
4. Review `git status` + `git diff` (§ 2, step 1)   5. Run the plugin-dev pre-ship checklist
(§ After running) — its close enumerates the three checks   6. Confirm no secrets landed
(§ After running)   7. Commit, without bumping marketplace `metadata.version` (§ 2, step 2)

Register the conditional steps too: one a branch makes moot is completed WITH THAT REASON, never
left open — an unfinished list at the end must mean something really is unfinished.
No such tool? SEARCH for one first — on hosts with deferred tools it exists but is not loaded, and
its name differs per host. Anything that creates items and marks them in progress and completed IS
that tool, whatever it is called; an empty result for one remembered name is evidence about the name,
not about the host. It must be the SESSION's own planner, never an external tracker (Jira, Linear, a
task app): your bookkeeping is not their backlog. If there truly is none, keep the list in your
replies — state it once, name each item as you start it, account for every one at the end.

## The script

Written in Bun + TypeScript (per the repo's script rule), so it needs **Bun** installed — if `bun` is
missing, run the **install-bun** skill first.

```
bun run "SKILLDIR/scripts/clone-marketplace.ts" --new    <target-dir> --name <marketplace-name> \
                                     [--display "<UI name>"] [--owner-name "<name>"] \
                                     [--owner-email "<email>"] [--source <git-url>]
bun run "SKILLDIR/scripts/clone-marketplace.ts" --update <target-dir> [--source <git-url>]
bun run "SKILLDIR/scripts/clone-marketplace.ts" --new ... --dry-run   # print actions, change nothing
```

⚠️ `SKILLDIR` is a placeholder: substitute the **literal** directory you loaded this `SKILL.md` from
(it is not a shell variable — a command built from an unset one resolves to `/scripts/…` and fails).

`--source` defaults to the canonical marketplace this meta plugin is published from (the script's
`--help` prints the URL); override it to seed from a different one. It requires `git`. It **never** creates the GitHub repo or pushes —
that stays a human step (auth, naming, visibility).

## 1. Create a NEW marketplace

```
bun run "SKILLDIR/scripts/clone-marketplace.ts" --new ./my-skills --name my-skills \
  --owner-name "Ada Lovelace" --owner-email "ada@example.com"
```

Produces, at `./my-skills`, a ready-to-push marketplace: both `marketplace.json` manifests naming
your marketplace and listing `meta`; `plugins/meta/` copied verbatim from upstream latest (its
SessionStart health hook retargeted to your marketplace's name, so it watches yours); `CLAUDE.md`
(upstream's repo guide, renamed to your marketplace) + an `AGENTS.md` symlink to it; a starter
`README.md`; an MIT `LICENSE` in the owner's name; and `git init` + an initial stage.

Then the **human follow-ups** (the script prints them):
1. Create the GitHub repo (e.g. `gh repo create <owner>/my-skills --public`) — pick the owner/repo
   the README's install lines reference.
2. `git commit` the scaffold and `git push`.
3. Add your own plugins/skills with **plugin-dev** + **skill-authoring**.

## 2. UPDATE an existing marketplace to the latest

```
bun run "SKILLDIR/scripts/clone-marketplace.ts" --update ./my-skills   # (add --dry-run first to preview)
```

Refreshes an existing marketplace repo **in place**:
- Replaces `plugins/meta/` with upstream's latest — so it picks up new meta skills, the cross-host
  SessionStart hook, doc fixes, and the version bump that ships with them. **Your other plugins are
  left untouched.**
- **Retargets the copied SessionStart health hook to YOUR marketplace** — the hook's self-identity
  (the `MARKETPLACE` const in its `.ts` + the `[<name>]` prefix in its Bun-missing nudge) is rewritten
  from the source's name to your marketplace's `name`, so the hook watches the marketplace it's
  installed in, not the one it was cloned from. Every other mention of the source (the `--source`
  URL, plugin-dev's worked examples) legitimately points at the canonical upstream and is left as-is.
- Ensures the shared-guide scaffolding exists: adds `CLAUDE.md` (renamed to your marketplace) and the
  `AGENTS.md` symlink **only if missing** — it never clobbers a `CLAUDE.md` you've customised.

It does **not** touch your `marketplace.json` plugin list or edit your own plugins. After it runs:
1. `git -C <dir> status && git -C <dir> diff` — review exactly what changed.
2. Commit. The meta **plugin version** bump travels with the copied files (no hand-editing), so
   installed clients re-pull meta on their next update. You do **not** bump the marketplace
   `metadata.version` here — the plugin *list* didn't change (see plugin-dev §4).

## After running — the checks that keep it honest

- **Review against the meta plugin.** Run the **plugin-dev** pre-ship checklist over the result — its
  `check-manifests.ts` script does the mechanical part. For a fresh repo, that checklist is the whole
  gate.
- **Version discipline is already handled for meta** (its version came from upstream). If YOU then
  add or change plugins, that's ordinary plugin-dev version work.
- **No secrets** land in a public repo — the scaffold ships none; keep it that way.
- **Don't promise a same-tick install.** A freshly-pushed marketplace/plugin can take a client
  reconnect before it appears (plugin-dev §4).
