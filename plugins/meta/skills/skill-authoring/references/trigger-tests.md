# Trigger tests for `skill-authoring`

> Reference for the `skill-authoring` skill (§7). Read it when you change this skill's
> `description`, and re-run the prompts below against the new text. It doubles as the shape to copy
> for your own skill: about ten prompts that should fire, about ten that should not, the reason for
> each near-miss, the runs with what they do not establish, and a with-skill vs baseline task run.

Run each prompt in a fresh session with this skill loaded from the working tree (installed only when
the installed copy matches it, `--plugin-dir`, or copied in), and record whether this skill
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
| 2026-11-15 | Claude Code · claude-fable-5-2 · isolated | meta 0.7.56 (893 chars, unchanged) | 10/10 | 14/14 | a CLAUDE.md near-miss added: the boundary named it, no prompt tested it |
| 2026-11-15 | Claude Code · claude-fable-5-2 · full | meta 0.7.56 (893 chars, unchanged) | 10/10 | 14/14 | the installed copy disabled; one copy loaded |
| 2026-11-15 | Codex CLI 0.169 · its built-in default model (`exec --json` does not name it) | meta 0.7.56 (893 chars; the installed copy is identical) | 10/10 | 9/14 | see the Codex note below |
| 2026-11-15 | Claude Code · claude-fable-5-2 · isolated | meta 0.7.57 (889 chars) | 10/10 | 14/14 | boundary rewritten as one clause per sibling |
| 2026-11-15 | Claude Code · claude-fable-5-2 · full | meta 0.7.57 (889 chars) | 10/10 | 14/14 | |
| 2026-11-15 | Codex CLI 0.169 · its built-in default model | meta 0.7.57 (889 chars, working tree) | 10/10 | 9/14 | the same five prompts as on 0.7.56 |
| 2026-11-16 | Codex CLI 0.169 · its built-in default model | meta 0.7.57 (889 chars), same-day control | 10/10 | 11/14 | still-doesn't-show-up, eval harness, subagent |
| 2026-11-16 | Codex CLI 0.169 · its built-in default model | variant: the "Load it BEFORE … even from memory" clause dropped (832 chars), 2 runs | 10/10 | 12/14, 10/14 | no steady gain: the clause is not the cause |
| 2026-11-16 | Codex CLI 0.169 · its built-in default model | variant: boundary right after the first sentence (772 chars), 3 runs | 10/10 ×3 | 13/14, 11/14, 12/14 | subagent and CLAUDE.md 0/3; eval harness 3/3; still-doesn't-show-up 1/3; README (harness) 2/3 |
| 2026-11-16 | Codex CLI 0.169 · its built-in default model | + "a skill's evals or an eval harness (the host's eval tooling)" (806 chars), 2 runs | 10/10 ×2 | 13/14, 12/14 | eval harness 2/2 |
| 2026-11-16 | Claude Code · claude-fable-5-2 · full | the 806-char text | 9/10 | 14/14 | "keeps auto-firing" missed: the restructure had dropped the word "auto-firing" (1/3 on re-runs; 4/4 once restored) |
| 2026-11-16 | Claude Code · claude-fable-5-2 · isolated | meta 0.7.59 (819 chars, as shipped) | 10/10 | 14/14 | |
| 2026-11-16 | Claude Code · claude-fable-5-2 · full | meta 0.7.59 (819 chars, as shipped) | 10/10 | 14/14 | the installed copy disabled; one copy loaded |
| 2026-11-16 | Codex CLI 0.169 · its built-in default model | meta 0.7.59 (819 chars, as shipped), 1 run | 10/10 | 14/14 | one run; earlier variants spread 2–3 prompts between repeats |

**The Codex row:** one `codex exec` per prompt, `--ignore-user-config`, a read-only sandbox, the
skill copied into the empty workspace as `.agents/skills/skill-authoring`; "fired" = a command that
opens its `SKILL.md`. User-level skills still loaded, so it is not fully isolated. With the full user
config the run measured nothing: that host was over Codex's skills budget and showed no
descriptions at all (`precedents.md` §16). Of the five should-not misses, "write a README for this
repo" is the harness: the skill was the only thing in the workspace, so the README described it.
The other four loaded this skill, sometimes beside the right one: "still doesn't show up", "run the
eval harness", "write a subagent definition", "tighten our CLAUDE.md" — all four named in its
`Do not use for` clause. One run per prompt: it does not establish that Codex weighs boundaries
less than Claude Code in general. Rewriting the boundary as one clause per sibling (meta 0.7.57) left the same five misses.
**The restructured description moved it** (meta 0.7.59: boundary right after the first sentence,
the load-first clause gone, shorter wording): the subagent and CLAUDE.md near-misses stopped loading
it in three runs out of three. Dropping the load-first clause alone did not; which of the other
changes did it is not isolated. Runs vary by 2–3 prompts between repeats of one description, so read
any single row with that spread. "Run the eval harness on my skill" loaded it in all 5 runs before
the final text and in 0 of 1 on it: not yet shown fixed.

What these runs do not establish: other models, repeat stability (each prompt ran once per row), or
whether a different boundary wording would keep Codex off those four.

## With the skill vs without it

Task prompts run with the skill available and with `Skill` disallowed; isolated, `--max-turns 6`,
read-only tools (no shell, no web). Recorded is what changed in the answer.

| Date | Host · model | Prompt | With the skill | Without it |
| --- | --- | --- | --- | --- |
| 2026-11-14 | Claude Code · claude-fable-5-2 | "Review this SKILL.md before I publish it…" + a deliberately weak `csv-cleaner` skill (vague description, caps, one dated incident turned into a rule) | loaded the skill; 8 ranked fixes: description, the overfit DD/MM rule, non-destructive save, defined duplicates and dates, a Definition of Done, caps and repetition, sampling large files; a corrected description | the same eight points in nearly the same order, plus a suggestion to bundle a script |
| 2026-11-15 | Claude Code · claude-fable-5-2 · ×2 each side | "Review this skill before I publish it" + an `invoice-sync` skill whose body says stop on any login and any duplicate while its reference allows SSO and same-vendor re-issues, with the sibling's boundary sitting in the reference | both halves found and named as cut from their prohibitions; added a confirmation stop before the ledger write (and `disable-model-invocation`), the credentials rule moved INTO the download step, failure paths, a Definition of Done, a Step-0 block, and said what it had not run | the same two contradictions and the misplaced boundary, found as plain contradictions; no confirmation stop; one run advised moving the credentials rule OUT of the steps, the opposite of §2's safeguard rule |

Reading: on a skill with textbook defects (the first row) this model already knew the guide's main
rules, and the skill changed little. On the subtler skill (the second row) the bare model still found
the contradictions, so finding them is not what the skill adds; what it added was the rules a bare
review does not reach for — a confirmation stop before an outward write, a safeguard at the step it
guards, failure paths. Two runs a side on one model: it does not establish the size of the
difference, its stability, or anything on other models.


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
| "tighten our CLAUDE.md — it's 400 lines and the agent ignores half of it" | repo memory, not a SKILL.md → the host's docs |

## What a failure means

- A should-fire prompt that does not fire: a verb, symptom or phrasing is missing from the
  description (§1). Add the user's words, not a synonym you prefer.
- A should-not prompt that fires: the boundary is missing or one-sided. Name the sibling in a
  `Do not use for… — that's <sibling>` clause, on both skills when the collision is mutual (§1).
