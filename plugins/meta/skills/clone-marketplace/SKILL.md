---
name: clone-marketplace
description: >-
  Bootstrap a NEW AI-agent skills marketplace, or refresh an existing one's vendored meta plugin, from
  the canonical marketplace — fetched from its repo's latest commit (GitHub by default), never from an
  installed copy. Use when the user wants to "create/start my own skills marketplace", "clone/bootstrap a
  marketplace like this one", "scaffold a new plugin marketplace repo", or "update my marketplace's
  meta plugin to the latest" — «створи свій маркетплейс скілів», «онови meta-плагін
  маркетплейсу». Do NOT use to add one plugin/skill to a marketplace you already run (that is
  plugin-dev), nor to check whether an INSTALLED marketplace is current (marketplace-health), nor to
  write SKILL.md prose (skill-authoring). Runs a bundled Bun script (--new
  scaffolds, --update refreshes meta in place).
---

# clone-marketplace — start a marketplace, or update it, from the canonical one

A skills marketplace is just a git repo with a known shape (`plugin-dev` documents it). This skill
copies that shape — the two marketplace manifests, the **meta plugin**, `CLAUDE.md`/`AGENTS.md`, a
README and LICENSE — so someone can stand up their own marketplace in one step, and keep its meta
plugin current later.

**The one rule that matters:** the meta plugin and structure are pulled from the **source repo at its
latest commit** (a shallow clone of its default branch; the canonical GitHub repo unless `--source`
says otherwise) — *never* from whatever copy is installed on this machine. So a clone/update gets
today's meta plugin, not a stale cache. `--source` accepts any git URL, a local path included; point
it somewhere else only on the user's say-so.

The work is deterministic, so it lives in a script — you mostly run it and then do the human-only
follow-ups (create the GitHub repo, review, commit).

## Step 0 — register the run

Register these as todo items now, before doing anything else, in whatever todo/plan tool this host
gives you — and while work remains keep exactly one in progress. Register the list for the branch
this run follows:

**`--new`:** 1. Check `bun` is installed, else run install-bun (§ The script)   2. Ask the user for
the marketplace name and the owner's name + email (§ 1)   3. Run `--new` (§ 1)   4. Run
`check-manifests.ts` over the result (§ After running)   5. Check LICENSE and the manifest carry no
`Your Name` / `you@example.com`, then commit the scaffold on the user's yes, or hand it to them
(§ 1)   6. Hand the user the human follow-ups: create the GitHub repo, push, add plugins (§ 1)

**`--update`:** 1. Check `bun` is installed, else run install-bun (§ The script)   2. Preview with
`--update --dry-run` (§ 2)   3. If a guard refused: resolve it, or get the user's explicit yes for
`--force` (§ 2)   4. Run `--update` (§ 2)   5. Review `git status` + `git diff` (§ 2)   6. Run
`check-manifests.ts` (§ After running)   7. Commit on the user's yes, or hand it to them; pushing
is theirs (§ 2)

Register the conditional steps too: one a branch makes moot is completed WITH THAT REASON, never
left open — an unfinished list at the end must mean something really is unfinished.
No such tool? SEARCH for one first — on hosts with deferred tools it exists but is not loaded, and
its name differs per host. Anything that creates items and marks them in progress and completed IS
that tool, whatever it is called. Search by that capability, then by any name you remember: one empty
result is evidence about the name; two are a real absence on this host — say so plainly, it is not
your mistake. It must be the SESSION's own planner, never an external tracker (Jira, Linear, a task
app): your bookkeeping is not their backlog. If there truly is none, keep the list in your
replies — state it once, name each item as you start it, account for every one at the end.

## The script

Written in Bun + TypeScript, so it needs **Bun** — if `bun` is missing,
run the **install-bun** skill first. It also needs `git`.

```
bun run "SKILLDIR/scripts/clone-marketplace.ts" --new    <target-dir> --name <kebab-name> \
     [--display "<UI name>"] [--owner-name "<name>"] [--owner-email "<email>"] [--source <git-url>]
bun run "SKILLDIR/scripts/clone-marketplace.ts" --update <target-dir> [--source <git-url>] [--force]
# add --dry-run to either mode: it prints every action and changes nothing
```

`SKILLDIR` is a placeholder: substitute the **literal** directory you loaded this `SKILL.md` from (it
is not a shell variable — a command built from an unset one resolves to `/scripts/…` and fails).

`--help` prints the default `--source` URL. The script **never** creates the GitHub repo or
pushes — that stays a human step (auth, naming, visibility).

## 1. Create a NEW marketplace

Ask the user for the marketplace name (kebab-case; the script refuses anything else) and the owner's
name and email — they go into the LICENSE and the Claude manifest. Without them the script writes
`Your Name` / `you@example.com` and prints a warning; never push those placeholders.

```
bun run "SKILLDIR/scripts/clone-marketplace.ts" --new ./my-skills --name my-skills \
  --owner-name "Ada Lovelace" --owner-email "ada@example.com"
```

It produces, at `./my-skills`, a ready-to-push marketplace:
- both `marketplace.json` manifests, naming your marketplace and listing `meta`;
- `plugins/meta/` copied from upstream latest, with its SessionStart health hook retargeted to your
  marketplace's name so it watches yours;
- `CLAUDE.md` — upstream's repo guide, retitled, with its "this repo is the canonical source of meta"
  section replaced by one saying meta is **vendored** here and edits to it are lost on `--update` —
  plus an `AGENTS.md` symlink to it (a copy, with a warning, where symlinks are not allowed);
- a starter `README.md` and an MIT `LICENSE` in the owner's name;
- `git init` + an initial stage.

Then the **human follow-ups** (the script prints them):
1. Create the GitHub repo, with the visibility they choose (e.g. `gh repo create <owner>/my-skills`)
   — the owner/repo the README's install lines reference.
2. Commit the scaffold (you may, on their yes) and `git push` (theirs).
3. Add your own plugins/skills with **plugin-dev** + **skill-authoring**.

## 2. Refresh an existing marketplace's meta plugin

```
bun run "SKILLDIR/scripts/clone-marketplace.ts" --update ./my-skills --dry-run   # preview
bun run "SKILLDIR/scripts/clone-marketplace.ts" --update ./my-skills
```

It replaces `plugins/meta/` with upstream's latest — new meta skills, hook and doc fixes, and the
version bump that ships with them — and leaves your other plugins and your `marketplace.json`
untouched. It retargets the copied health hook to your marketplace, and adds `CLAUDE.md` and
the `AGENTS.md` symlink **only if missing** — a `CLAUDE.md` you customised is never touched.

**Because it deletes `plugins/meta/` first, it refuses (exit 1) when** that directory holds
uncommitted changes or git-ignored files, when the target is not a git repo (so that cannot be
checked), or when the target is named like the source marketplace (it is the source itself, which is
edited directly). `--force` skips all three, and any local files under `plugins/meta/` are then lost
— pass it only on the user's say-so.

After it runs:
1. `git -C <dir> status && git -C <dir> diff` — review exactly what changed.
2. Commit on the user's yes (pushing stays theirs). The meta plugin's version bump travels with the
   copied files, so installed clients re-pull meta on their next update. The Claude manifest's `metadata.version` needs no bump — unless you
   also edit the meta entry in `marketplace.json` (its description, say), which per plugin-dev's
   **Version discipline** does need one.

## After running

- Run plugin-dev's `check-manifests.ts` over the result:
  `bun run "<dir>/plugins/meta/skills/plugin-dev/scripts/check-manifests.ts" "<dir>"`. Exit 0 means
  both manifests and every plugin agree. When you go on to add plugins, plugin-dev's full
  **Pre-ship checklist** applies.
- **Don't promise a same-tick install.** A freshly pushed marketplace or plugin can take a client
  reconnect before it appears (plugin-dev, **Version discipline**).

## Bundled resources

- `scripts/clone-marketplace.ts` — the scaffold/update script above (`--help` for its options).
- `references/trigger-tests.md` — should-fire / should-not prompts; re-run them after any edit to
  the `description`.
