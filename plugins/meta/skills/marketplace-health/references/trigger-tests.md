# Trigger tests for `marketplace-health`

> Reference for the `marketplace-health` skill. Read it when you change this skill's `description`,
> and re-run the prompts below against the new text. The near-misses aim at the siblings that share
> its words: `enable-autoupdate` (turning auto-update on), `plugin-dev` (authoring, version bumps)
> and `clone-marketplace` (refreshing a marketplace's meta plugin from the canonical one).

Run each prompt in a fresh session with the marketplace installed, and record whether this skill
loads. A prompt passes when the result matches the column it is in. Record each run below.

**How it was run:** a fresh `claude -p` per prompt from an empty directory, `--plugin-dir` on the
working tree, `--max-turns 2`, MCP servers cut off, and writes, shell, web, subagents and workflows
disallowed. "Fired" = a `Skill` call whose skill is exactly `marketplace-health` or
`<plugin>:marketplace-health`.

**Runs:**

| Date | Host · model | Description | Fired | Silent | Note |
| --- | --- | --- | --- | --- | --- |
| 2026-11-14 | Claude Code · claude-fable-5-2 | previous (boundary says "on or off") | 9/11 | 10/11 | "new skill didn't show up after I pushed" and "will clients pick it up" went to plugin-dev; "update the meta plugin from GitHub" fired here instead of clone-marketplace |
| 2026-11-14 | Claude Code · claude-fable-5-2 | meta 0.7.45 (910 chars) | 11/11 | 11/11 | plugin-dev no longer claims "a change that never reached clients"; this skill says it updates an INSTALL and names the vendored meta plugin as clone-marketplace's |
| 2026-11-14 | Claude Code · claude-fable-5-2 · isolated | meta 0.7.52 (886 chars) | 11/11 | 12/12 | reciprocal boundary with skill-authoring; a never-triggers near-miss added |
| 2026-11-14 | Claude Code · claude-fable-5-2 · full | meta 0.7.52 (886 chars) | 11/11 | 12/12 | |
| 2026-11-14 | Claude Code · claude-fable-5-2 · isolated | meta 0.7.52 (892 chars) | 13/13 | 12/12 | update-request phrasings added to the description and two should-fire prompts |
| 2026-11-14 | Claude Code · claude-fable-5-2 · full | meta 0.7.52 (892 chars) | 13/13 | 12/12 | |

**Full** = the runner's other installed plugins loaded too; **isolated** = `--setting-sources project`,
only this plugin. Rows without either were not recorded.

What these runs do not establish: Codex routing (not run — Codex routes from the INSTALLED copy),
other models, repeat stability.

## With the skill vs without it

| Date | Host · model | Prompt | With the skill | Without it |
| --- | --- | --- | --- | --- |
| 2026-11-14 | Claude Code · claude-fable-5-2 · isolated, read-only tools, `--max-turns 10` | "I pushed a new version of a skill to my GitHub plugin marketplace acme-skills an hour ago, but Claude Code still uses the old one. Why, and how do I check what's actually installed versus published? Don't change anything yet." | loaded the skill; registered its 8 items; the same two causes (no bump, no re-pull) plus the bundled read-only checker as a one-command diagnosis and the hand reads behind it | the same two causes and manual paths, no way to verify both sides at once |

At `--max-turns 4` the with-skill run spent its turns registering the Step-0 list and reading files,
and returned nothing: on a host with a tight turn budget, the list itself has a cost. These runs do
not establish the Codex side, or that the checker's output was used: there was no shell in the run,
and a shell-enabled pair needs an OS-level sandbox first (the reviewing method's rule).

## Should fire

| Prompt | What it exercises |
| --- | --- |
| "update my acme-tools plugins to the latest version" | an explicit update request (the Fix half) |
| «онови плагіни з маркетплейсу acme-tools» | a native-language update request |
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
| "my deploy-checklist skill is installed and listed, but it never triggers when I ask about deploys" | it is installed; the description is the problem → `skill-authoring` |
| "turn on auto-update for my marketplace" | an action → `enable-autoupdate` |
| "make my Codex marketplace update itself" | → `enable-autoupdate` |
| "turn off auto-update for my acme-tools marketplace" | an action → `enable-autoupdate` |
| "bump the version of my plugin" | authoring → `plugin-dev` |
| "add a new plugin to my marketplace" | → `plugin-dev` |
| "update my marketplace's meta plugin to the latest from GitHub" | → `clone-marketplace` |
| "create my own skills marketplace" | → `clone-marketplace` |
| "update Claude Code itself" | the host binary, not a marketplace |
| "is my npm package up to date?" | a different package system |
| "check my home network health" | "health", but not plugins |
| "write a skill that checks versions" | skill authoring → `skill-authoring` |
