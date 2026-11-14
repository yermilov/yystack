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
| 2026-11-14 | Claude Code · claude-fable-5-2 | current (shipped) | 14/14 | 10/10 | "a change that never reached clients" handed to marketplace-health (it was pulling that skill's prompts) |

What these runs do not establish: Codex routing (not run), other models, repeat stability, or
whether the skill improves the work (no with-skill vs baseline task run).

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
