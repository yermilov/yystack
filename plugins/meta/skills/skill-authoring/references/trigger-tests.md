# Trigger tests for `skill-authoring`

> Reference for the `skill-authoring` skill (§7). Read it when you change this skill's
> `description`, and re-run the prompts below against the new text. It doubles as the shape to copy
> for your own skill: about ten prompts that should fire, about ten that should not, the reason for
> each near-miss, the runs with what they do not establish, and a with-skill vs baseline task run.

Run each prompt in a fresh session with the marketplace installed, and record whether this skill
loads. A prompt passes when the result matches the column it is in. Record each run below.

Write realistic prompts: name the skill the user means. A prompt about "this skill" with nothing to
point at makes the model ask which one, which measures the prompt, not the description.

**How it was run:** a fresh `claude -p` per prompt from an empty directory, `--plugin-dir` on the
working tree, `--max-turns 2`, MCP servers cut off, and writes, shell, web, subagents and workflows
disallowed. "Fired" = a `Skill` call naming this skill. **Full** = the runner's other installed
plugins loaded too (they compete for the prompt); **isolated** = `--setting-sources project`, only
this plugin. The first four rows did not record which.

**Runs:**

| Date | Host · model | Description | Fired | Silent | Note |
| --- | --- | --- | --- | --- | --- |
| 2026-11-14 | Claude Code · claude-fable-5-2 | before the load-first clause | 6/10 | 10/10 | three prompts said "this skill" with no skill named; one went to another installed review skill |
| 2026-11-14 | Claude Code · claude-fable-5-2 | before the load-first clause | 6/10 | 10/10 | skills named; the model searched for the file, then answered from memory without loading this skill |
| 2026-11-14 | Claude Code · claude-fable-5-2 | + load-first clause | 10/10 | 10/10 | the description now says to load it before answering any question about a skill |
| 2026-11-14 | Claude Code · claude-fable-5-2 | meta 0.7.42 (909 chars) | 10/10 | 12/12 | boundary adds CLAUDE.md / slash commands / subagents; two near-misses added for it |
| 2026-11-14 | Claude Code · claude-fable-5-2 · isolated | meta 0.7.49 (878 chars), old prompts | 10/10 | 12/12 | one redundant phrasing dropped to bring it into the 500–900 band; no prompt in the wrong column |
| 2026-11-14 | Claude Code · claude-fable-5-2 · full | meta 0.7.49 (878 chars), old prompts | 10/10 | 12/12 | same |
| 2026-11-14 | Claude Code · claude-fable-5-2 · isolated | meta 0.7.49 (878 chars) | 10/10 | 12/12 | two should-fire prompts now name the skill they mean |
| 2026-11-14 | Claude Code · claude-fable-5-2 · full | meta 0.7.49 (878 chars) | 10/10 | 12/12 | same |
| 2026-11-14 | Claude Code · claude-fable-5-2 · isolated | meta 0.7.52 (893 chars) | 10/10 | 13/13 | reciprocal boundary with marketplace-health; a never-showed-up near-miss added |
| 2026-11-14 | Claude Code · claude-fable-5-2 · full | meta 0.7.52 (893 chars) | 10/10 | 13/13 | |

What these runs do not establish: Codex routing (not run — Codex routes from the INSTALLED copy, so
a run counts for this description only once the installed text matches it), other models, or repeat
stability (each prompt ran once per row).

## With the skill vs without it

One task prompt, run once with the skill available and once with `Skill` disallowed; isolated,
`--max-turns 6`, read-only tools (no shell, no web). Recorded is what changed in the answer.

| Date | Host · model | Prompt | With the skill | Without it |
| --- | --- | --- | --- | --- |
| 2026-11-14 | Claude Code · claude-fable-5-2 | "Review this SKILL.md before I publish it…" + a deliberately weak `csv-cleaner` skill (vague description, caps, one dated incident turned into a rule) | loaded the skill; 8 ranked fixes: description, the overfit DD/MM rule, non-destructive save, defined duplicates and dates, a Definition of Done, caps and repetition, sampling large files; a corrected description | the same eight points in nearly the same order, plus a suggestion to bundle a script |

Reading: on a skill with textbook defects, this model already knows the guide's main rules, so the
skill changed little. That does not establish its value on subtler defects (a severed permission, a
branch condition in a reference, a one-sided boundary) or on other models. The next task prompt
should carry one of those.


## Should fire

| Prompt | What it exercises |
| --- | --- |
| "write a skill that summarises our standup notes" | the core verb + object |
| "make a SKILL.md for our deploy checklist" | the file name as the keyword |
| "my skill never triggers, what's wrong with the description?" | a symptom, not a verb |
| "my invoice-check skill keeps auto-firing on any message that mentions money — how do I stop it?" | the opposite symptom (§1 flags) |
| "the agent skips half the steps of my release-checklist workflow skill" | the workflow kind (§2 Step-0 block) |
| "shorten my deploy-checklist SKILL.md, it's 900 lines" | length (§2) |
| "review my standup-notes skill before I publish it; its description is 'Summarise standup notes into decisions and owners'" | a review, not a write |
| "як написати скіл для перевірки рахунків?" | a native-language phrasing |
| «чому мій скіл invoice-check не тригериться, коли я пишу "перевір рахунок"?» | a native-language symptom |
| "I wrote a SKILL.md that calls a Claude Code hook — will it work on Codex too?" | portability (§9) |

## Should NOT fire

| Prompt | Why not — and what should fire instead |
| --- | --- |
| "I pushed my new deploy-checklist skill to our marketplace yesterday and it still doesn't show up in Claude Code" | an install that never picked up the change → `marketplace-health` |
| "bump the plugin version and add it to marketplace.json" | packaging → `plugin-dev` |
| "create a new plugin with two manifests" | packaging → `plugin-dev` |
| "is my marketplace up to date on this machine?" | install state → `marketplace-health` |
| "enable auto-update for my marketplace" | → `enable-autoupdate` |
| "write a README for this repo" | prose, but not a skill |
| "write a system prompt for my chatbot" | a prompt, not a SKILL.md |
| "fix the failing unit test in skills/parser.ts" | the word "skills" in a path only |
| "what skills does this candidate list on their CV?" | "skills" in its everyday sense |
| "run the eval harness on my skill" | eval tooling, which §7 leaves to the host |
| "review my pull request" | a code review, not a skill review |
| "write a subagent definition for a security reviewer" | a subagent, not a SKILL.md → the host's docs |
| "add a /deploy slash command to this repo" | a slash command → the host's docs |

## What a failure means

- A should-fire prompt that does not fire: a verb, symptom or phrasing is missing from the
  description (§1). Add the user's words, not a synonym you prefer.
- A should-not prompt that fires: the boundary is missing or one-sided. Name the sibling in a
  `Do not use for… — that's <sibling>` clause, on both skills when the collision is mutual (§1).
