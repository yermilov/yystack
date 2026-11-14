# Trigger tests for `plugin-dev`

> Reference for the `plugin-dev` skill. Read it when you change this skill's `description`, and
> re-run the prompts below against the new text. The near-misses aim at the three siblings whose
> territory borders this one: `marketplace-health`, `clone-marketplace` and `skill-authoring`.

Run each prompt in a fresh session with the marketplace installed, and record whether this skill
loads. A prompt passes when the result matches the column it is in. Record each run below.

**Runs:** none yet. The set was written on 2026-11-14 from the description and has not been run.
Until a dated row appears here (host, fired x/10, stayed silent y/10), the description's routing has
been reviewed but not measured.

## Should fire

| Prompt | What it exercises |
| --- | --- |
| "add a new plugin to my marketplace" | the core verb + object |
| "package this skill so it installs on both Claude Code and Codex" | dual manifests |
| "I edited a skill but nobody got the change — which version do I bump?" | version discipline, authoring side |
| "do I need to bump metadata.version when I add a skill?" | the marketplace-vs-plugin bump |
| "what goes in .codex-plugin/plugin.json?" | a manifest file by name |
| "which plugin should this new skill go in?" | placement (§8) |
| "this plugin has 15 skills, should I split it?" | split (§8) |
| "move this skill into the research plugin" | the move flow (§6) |
| "set up the repo layout for a skills marketplace" | layout (§1) |
| "remove the old plugin from the marketplace" | the remove flow (§6) |
| "update the plugins table in the README" | README maintenance (§7) |
| «додай плагін у маркетплейс» | a native-language phrasing |

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
