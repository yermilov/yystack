# Trigger tests for `skill-authoring`

> Reference for the `skill-authoring` skill (§7). Read it when you change this skill's
> `description`, and re-run the prompts below against the new text. It doubles as the shape to copy
> for your own skill: about ten prompts that should fire, about ten that should not, and the reason
> for each near-miss.

Run each prompt in a fresh session with the marketplace installed, and record whether this skill
loads. A prompt passes when the result matches the column it is in. Record each run below.

**Runs:** none yet. The set was written on 2026-11-14 from the description and has not been run.
Until a dated row appears here (host, fired x/10, stayed silent y/10), the description's routing has
been reviewed but not measured.

## Should fire

| Prompt | What it exercises |
| --- | --- |
| "write a skill that summarises our standup notes" | the core verb + object |
| "make a SKILL.md for our deploy checklist" | the file name as the keyword |
| "my skill never triggers, what's wrong with the description?" | a symptom, not a verb |
| "this skill keeps auto-firing when nobody asked for it" | the opposite symptom (§1 flags) |
| "the agent skips half the steps of my workflow skill" | the workflow kind (§2 Step-0 block) |
| "shorten this SKILL.md, it's 900 lines" | length (§2) |
| "review my skill before I publish it" | a review, not a write |
| "як написати скіл для перевірки рахунків?" | a native-language phrasing |
| "чому мій скіл не тригериться?" | a native-language symptom |
| "does this skill work on Codex too?" | portability (§9) |

## Should NOT fire

| Prompt | Why not — and what should fire instead |
| --- | --- |
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

## What a failure means

- A should-fire prompt that does not fire: a verb, symptom or phrasing is missing from the
  description (§1). Add the user's words, not a synonym you prefer.
- A should-not prompt that fires: the boundary is missing or one-sided. Name the sibling in a
  `Do not use for… — that's <sibling>` clause, on both skills when the collision is mutual (§1).
