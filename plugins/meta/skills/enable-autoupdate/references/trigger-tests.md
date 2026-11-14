# Trigger tests for `enable-autoupdate`

> Reference for the `enable-autoupdate` skill. Read it when you change this skill's `description`,
> and re-run the prompts below against the new text. The near-misses aim at the siblings that share
> its keywords: `marketplace-health` (status), `plugin-dev` (version bumps) and updating the host
> itself, which no skill owns.

Run each prompt in a fresh session with the marketplace installed, and record whether this skill
loads. A prompt passes when the result matches the column it is in. Record each run below.

**Runs:** none yet. The set was written on 2026-11-14 from the description and has not been run.
Until a dated row appears here (host, fired x/11, stayed silent y/10), the description's routing has
been reviewed but not measured.

## Should fire

| Prompt | What it exercises |
| --- | --- |
| "turn on auto-update for my plugin marketplace" | the core verb + object |
| "keep my plugins up to date automatically" | the outcome, no keyword |
| "my plugins never update, make them" | a symptom plus an ask to fix |
| "set autoUpdate to true for my-marketplace in extraKnownMarketplaces" | the setting's own names |
| "marketplace-health says auto-update is OFF — fix it" | the hand-off from the sibling |
| "make my Codex marketplace update itself" | the Codex branch |
| "switch my Codex marketplace from local to git" | the Codex source fix |
| "stop my marketplace going stale" | a synonym |
| «увімкни авто-апдейт маркетплейсу» | a native-language phrasing |
| «плагіни не оновлюються, зроби щоб оновлювались» | a native-language symptom + ask |
| "DISABLE_AUTOUPDATER is set but I still want plugin updates" | the env override (§3) |

## Should NOT fire

| Prompt | Why not — and what should fire instead |
| --- | --- |
| "is auto-update on for my marketplace?" | a status question → `marketplace-health` |
| "am I on the latest version of my plugins?" | → `marketplace-health` |
| "why didn't my new skill show up after I pushed?" | diagnosis first → `marketplace-health` |
| "bump the plugin version so clients pick up my change" | authoring → `plugin-dev` |
| "add a new plugin to my marketplace" | → `plugin-dev` |
| "create my own skills marketplace" | → `clone-marketplace` |
| "update Claude Code itself to the latest version" | the host binary, not a marketplace |
| "turn off auto-update for this marketplace" | the opposite action; answer directly |
| "enable auto-save in my editor" | "auto" + "enable", but not plugins |
| "update my npm dependencies automatically" | dependency updates, not a marketplace |
