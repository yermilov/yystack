# Trigger tests for `marketplace-health`

> Reference for the `marketplace-health` skill. Read it when you change this skill's `description`,
> and re-run the prompts below against the new text. The near-misses aim at the siblings that share
> its words: `enable-autoupdate` (turning auto-update on), `plugin-dev` (authoring, version bumps)
> and `clone-marketplace` (refreshing a marketplace's meta plugin from the canonical one).

Run each prompt in a fresh session with the marketplace installed, and record whether this skill
loads. A prompt passes when the result matches the column it is in. Record each run below.

**Runs:** none yet. The set was written on 2026-11-14 from the description and has not been run.
Until a dated row appears here (host, fired x/11, stayed silent y/10), the description's routing has
been reviewed but not measured.

## Should fire

| Prompt | What it exercises |
| --- | --- |
| "is my plugin marketplace up to date?" | the core question |
| "am I on the latest version of my plugins?" | the version half |
| "why didn't my new skill show up after I pushed?" | the classic symptom |
| "are plugin auto-updates on?" | the auto-update half, as a question |
| "check marketplace health" | the name |
| "is my Codex marketplace current?" | the Codex branch |
| "I just published a plugin change — will clients pick it up?" | the publish-side check |
| "I get a marketplace warning every time a session starts" | the hook's nudge |
| "the plugin is enabled in settings but its skills aren't there" | enabled-not-installed |
| «чи оновлений маркетплейс?» | a native-language phrasing |
| «чому не підтягнулась нова версія скіла?» | a native-language symptom |

## Should NOT fire

| Prompt | Why not — and what should fire instead |
| --- | --- |
| "turn on auto-update for my marketplace" | an action → `enable-autoupdate` |
| "make my Codex marketplace update itself" | → `enable-autoupdate` |
| "bump the version of my plugin" | authoring → `plugin-dev` |
| "add a new plugin to my marketplace" | → `plugin-dev` |
| "update my marketplace's meta plugin to the latest from GitHub" | → `clone-marketplace` |
| "create my own skills marketplace" | → `clone-marketplace` |
| "update Claude Code itself" | the host binary, not a marketplace |
| "is my npm package up to date?" | a different package system |
| "check my home network health" | "health", but not plugins |
| "write a skill that checks versions" | skill authoring → `skill-authoring` |
