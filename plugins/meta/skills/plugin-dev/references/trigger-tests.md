# Trigger tests for `plugin-dev`

> Reference for the `plugin-dev` skill. Read it when you change this skill's `description`, and
> re-run the prompts below against the new text. The near-misses aim at the three siblings whose
> territory borders this one: `marketplace-health`, `clone-marketplace` and `skill-authoring`.

Run each prompt in a fresh session with the marketplace installed, and record whether this skill
loads. A prompt passes when the result matches the column it is in. Record each run below.

Write realistic prompts: name the skill or plugin the user means ("this skill" with nothing to point
at makes the model ask which one).

**How it was run:** a fresh `claude -p` per prompt from an empty directory, `--plugin-dir` on the
working tree, `--max-turns 2`, MCP servers cut off, and writes, shell, web, subagents and workflows
disallowed. "Fired" = a `Skill` call whose skill is exactly `plugin-dev` or `<plugin>:plugin-dev`
(another installed plugin may ship a skill whose name merely contains it).

**Runs:**

| Date | Host · model | Description | Fired | Silent | Note |
| --- | --- | --- | --- | --- | --- |
| 2026-11-14 | Claude Code · claude-fable-5-2 | previous | 12/12 | 10/10 | prompts reworded to name the skill/plugin |
| 2026-11-14 | Claude Code · claude-fable-5-2 | interim | 14/14 | 10/10 | adds "release a plugin" and "where do hooks go"; the hook-script near-miss went to another plugin's hook skill |
| 2026-11-14 | Claude Code · claude-fable-5-2 | meta 0.7.43 (914 chars) | 14/14 | 10/10 | "a change that never reached clients" handed to marketplace-health (it was pulling that skill's prompts) |
| 2026-11-14 | Claude Code · claude-fable-5-2 · full | trimmed to 883, without "from the canonical marketplace" | 13/14 | 10/10 | "set up the repo layout for a skills marketplace" went to clone-marketplace — the cut phrase was the distinction; restored |
| 2026-11-14 | Claude Code · claude-fable-5-2 · isolated | meta 0.7.50 (899 chars) | 14/14 | 10/10 | |
| 2026-11-14 | Claude Code · claude-fable-5-2 · full | meta 0.7.50 (899 chars) | 14/14 | 10/10 | |

**Full** = the runner's other installed plugins loaded too (they compete for the prompt);
**isolated** = `--setting-sources project`, only this plugin. Rows without either were not recorded.

What these runs do not establish: Codex routing (not run — Codex routes from the INSTALLED copy, so
a run counts for this description only once the installed text matches it), other models, or repeat
stability (each prompt ran once per row).

## With the skill vs without it

One task prompt, run once with the skill available and once with `Skill` disallowed; isolated,
`--max-turns 4`, read-only tools (no shell, no web).

| Date | Host · model | Prompt | With the skill | Without it |
| --- | --- | --- | --- | --- |
| 2026-11-14 | Claude Code · claude-fable-5-2 | "…I'm renaming the plugin `tools` to `dev-tools`. Other plugins' skills reference `tools:lint-check`… Give me the exact checklist of every change before I push, so installed users actually get it." | loaded the skill; grep first (qualified, `Requires:`, bare); both plugin manifests bumped in lockstep; both marketplace entries; **the Claude marketplace `metadata.version` bump**; prefer bare names over a new qualified one | a careful checklist, but no `metadata.version` bump — the step whose omission leaves the renamed plugin invisible to Claude clients |

Reading: the skill's difference here is one silent-failure step the bare model did not know. That
does not establish the other flows, or other models.

## Should fire

| Prompt | What it exercises |
| --- | --- |
| "add a new plugin to my marketplace" | the core verb + object |
| "package my invoice-check skill so it installs on both Claude Code and Codex" | dual manifests |
| "I edited a skill but nobody got the change — which version do I bump?" | version discipline, authoring side |
| "do I need to bump metadata.version when I add a skill?" | the marketplace-vs-plugin bump |
| "what goes in .codex-plugin/plugin.json?" | a manifest file by name |
| "I'm adding an invoice-check skill — which plugin in my marketplace should it go in?" | placement (§8) |
| "my acme-tools plugin has 15 skills, should I split it?" | split (§8) |
| "move my watch-video skill into the research plugin" | the move flow (§6) |
| "set up the repo layout for a skills marketplace" | layout (§1) |
| "remove the legacy-tools plugin from my marketplace" | the remove flow (§6) |
| "update the plugins table in the README" | README maintenance (§7) |
| «додай плагін у маркетплейс» | a native-language phrasing |
| "where do hooks go in a plugin, and does Codex pick them up?" | hook packaging (§3) |
| "I'm ready to release my acme-tools plugin — what do I need to bump?" | release |

## Should NOT fire

| Prompt | Why not — and what should fire instead |
| --- | --- |
| "is my installed marketplace on the latest version?" | install state → `marketplace-health` |
| "my new skill doesn't show up on this machine after I pushed" | diagnosing an install → `marketplace-health` first |
| "turn on auto-update for my marketplace" | → `enable-autoupdate` |
| "create my own skills marketplace like this one" | bootstrap from the canonical one → `clone-marketplace` |
| "update my marketplace's meta plugin to the latest" | → `clone-marketplace` |
| "my skill never triggers, fix the description" | SKILL.md prose → `skill-authoring` |
| "write a SessionStart hook script" | hook authoring → the host's docs |
| "build an MCP server for our API" | not packaging |
| "bump the version in package.json for the release" | a version bump, but not a plugin |
| "publish this npm package" | packaging, but not a skills marketplace |
