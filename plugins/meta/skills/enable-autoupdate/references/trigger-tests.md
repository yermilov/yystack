# Trigger tests for `enable-autoupdate`

> Reference for the `enable-autoupdate` skill. Read it when you change this skill's `description`,
> and re-run the prompts below against the new text. The near-misses aim at the siblings that share
> its keywords: `marketplace-health` (status), `plugin-dev` (version bumps) and updating the host
> itself, which no skill owns.

Run each prompt in a fresh session with the marketplace installed, and record whether this skill
loads. A prompt passes when the result matches the column it is in. Record each run below.

**How it was run:** a fresh `claude -p` per prompt from an empty directory, `--plugin-dir` on the
working tree, `--max-turns 2`, MCP servers cut off, and writes, shell, web, subagents and workflows
disallowed (so no prompt could change a real config). "Fired" = a `Skill` call whose skill is exactly
`enable-autoupdate` or `<plugin>:enable-autoupdate`.

**Runs:**

| Date | Host · model | Description | Fired | Silent | Note |
| --- | --- | --- | --- | --- | --- |
| 2026-11-14 | Claude Code · claude-fable-5-2 | previous | 11/11 | 9/10 | "turn off auto-update" loaded this skill; the skill now covers turning it off, so that prompt moved to should-fire |
| 2026-11-14 | Claude Code · claude-fable-5-2 | interim | 11/12 | 9/9 | the settings-key prompt went once to the host's settings skill; re-run 3/3 it fired here (1 miss in 5 runs) |
| 2026-11-14 | Claude Code · claude-fable-5-2 | interim | 11/12 | 9/9 | the description's last sentence (which named the env override) was cut for length; the DISABLE_AUTOUPDATER prompt stopped firing |
| 2026-11-14 | Claude Code · claude-fable-5-2 | meta 0.7.44 | 12/12 | 9/9 | off phrasings added; the override restored as a user phrase |
| 2026-11-14 | Claude Code · claude-fable-5-2 · isolated | meta 0.7.51 (883 chars) | 12/12 | 10/10 | boundary now hands "bring a stale install current" to marketplace-health; a pull-it-now near-miss added |
| 2026-11-14 | Claude Code · claude-fable-5-2 · full | meta 0.7.51 (883 chars) | 12/12 | 10/10 | |
| 2026-11-14 | Claude Code · claude-fable-5-2 · isolated | meta 0.7.51 (883 chars) | 13/13 | 10/10 | + the "pin my Codex marketplace" prompt |
| 2026-11-14 | Claude Code · claude-fable-5-2 · full | meta 0.7.51 (883 chars) | 13/13 | 10/10 | |

**Full** = the runner's other installed plugins loaded too; **isolated** = `--setting-sources
project`, only this plugin. Rows without either were not recorded.

What these runs do not establish: Codex routing (not run — Codex routes from the INSTALLED copy),
other models, or stability beyond the one prompt re-run three times.

## With the skill vs without it

| Date | Host · model | Prompt | With the skill | Without it |
| --- | --- | --- | --- | --- |
| 2026-11-14 | Claude Code · claude-fable-5-2 · isolated, read-only tools | "I installed a third-party plugin marketplace called acme-skills in Claude Code… Its plugins never update… How do I make it update by itself? Give me the exact change." | loaded the skill; the settings diff with `source` to be copied verbatim from `known_marketplaces.json`; the UI-registry conflict and not hand-editing that file; the global override check | the same settings block "from memory", hedged ("less sure of this exact field"); no registry conflict; the override named |

| 2026-11-14 | Claude Code · claude-fable-5-2 · isolated, read-only tools | "Stop my acme-skills plugin marketplace in Claude Code from auto-updating — I want it to stay on the version I have now. What exactly do I change?" | loaded the skill; UI toggle or a settings diff with `false` and the source copied verbatim; told not to hand-edit `known_marketplaces.json`; checked every scope including the managed-settings path | the UI toggle, then offered hand-editing `known_marketplaces.json` as the file route, unsure of the field |

Reading: the skill turns hedged answers into sourced ones, adds the registry-conflict step, and
keeps the agent off the host's own state file. That does not establish the Codex branch (no Codex
run: it needs the published copy installed).

## Should fire

| Prompt | What it exercises |
| --- | --- |
| "pin my Codex marketplace acme-skills so it stops changing under me" | the Codex turn-off path (re-add pinned with `--ref`) |
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
| "turn off auto-update for my acme-tools marketplace" | the same key set to `false` |

## Should NOT fire

| Prompt | Why not — and what should fire instead |
| --- | --- |
| "I pushed a new version to the acme-skills marketplace — pull it into my Claude Code now" | a one-off refresh of a stale install → `marketplace-health` |
| "is auto-update on for my marketplace?" | a status question → `marketplace-health` |
| "am I on the latest version of my plugins?" | → `marketplace-health` |
| "why didn't my new skill show up after I pushed?" | diagnosis first → `marketplace-health` |
| "bump the plugin version so clients pick up my change" | authoring → `plugin-dev` |
| "add a new plugin to my marketplace" | → `plugin-dev` |
| "create my own skills marketplace" | → `clone-marketplace` |
| "update Claude Code itself to the latest version" | the host binary, not a marketplace |
| "enable auto-save in my editor" | "auto" + "enable", but not plugins |
| "update my npm dependencies automatically" | dependency updates, not a marketplace |
