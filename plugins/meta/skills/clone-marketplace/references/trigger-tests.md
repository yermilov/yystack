# Trigger tests for `clone-marketplace`

> Reference for the `clone-marketplace` skill. Read it when you change this skill's `description`,
> and re-run the prompts below against the new text. The near-misses aim at the siblings that share
> its words: `plugin-dev` (adding to a marketplace you run), `marketplace-health` (is an installed
> one current) and `skill-authoring` (writing skill prose).

Run each prompt in a fresh session with the marketplace installed, and record whether this skill
loads. A prompt passes when the result matches the column it is in. Record each run below.

**Runs:** none yet. The set was written on 2026-11-14 from the description and has not been run.
Until a dated row appears here (host, fired x/10, stayed silent y/10), the description's routing has
been reviewed but not measured.

## Should fire

| Prompt | What it exercises |
| --- | --- |
| "create my own skills marketplace" | the core ask |
| "I want to start a plugin marketplace like this one" | "like this one" |
| "bootstrap a new marketplace repo for my team's skills" | a synonym |
| "scaffold a Claude Code plugin marketplace" | one host named |
| "set up a Codex plugin marketplace from scratch" | the other host |
| "update my marketplace's meta plugin to the latest" | the update branch |
| "pull the newest meta skills into my own marketplace repo" | update, no keyword |
| "my marketplace was cloned months ago — its meta skills are out of date" | update, a symptom |
| «створи свій маркетплейс скілів» | a native-language phrasing |
| «онови meta-плагін маркетплейсу» | the native-language update |

## Should NOT fire

| Prompt | Why not — and what should fire instead |
| --- | --- |
| "add a new plugin to my marketplace" | → `plugin-dev` |
| "bump the version of my plugin" | → `plugin-dev` |
| "is my installed marketplace up to date?" | an installed client → `marketplace-health` |
| "why didn't my new skill show up after I pushed?" | → `marketplace-health` |
| "turn on auto-update for my marketplace" | → `enable-autoupdate` |
| "write a SKILL.md for my PDF tool" | → `skill-authoring` |
| "clone this git repo" | a plain clone, not a marketplace |
| "update my npm packages" | a different package system |
| "install Bun" | → `install-bun` |
| "fork a GitHub repo for me" | a plain fork |
