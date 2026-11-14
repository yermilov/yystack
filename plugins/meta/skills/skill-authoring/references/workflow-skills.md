# Workflow skills — the depth behind SKILL.md §2's rules

> Reference for the `skill-authoring` skill. Every **ruling** about workflow skills is already inline
> in `SKILL.md` §2 — the mandate, the marker sentences, the granularity test, the length rule. This
> file holds what you consult: why each line of the Step-0 block is there, the body skeleton, and
> the nesting wording for both shapes of todo tool. Read it when you are writing or fixing a
> workflow skill's step list; you never need it to know *whether* to write one.

## 1. Why the block has to be in the skill, not in this guide

"Register each step as a TODO" is advice to the **author**, and the author is not present at run
time. The agent that runs a skill reads only the file you shipped, and a numbered body reads to it as
skimmable prose. Every line of the copyable block exists because a real run failed without it:

| Line of the block | What it prevents |
| --- | --- |
| "Register these as todo items **now, before doing anything else**" | the list written retroactively at report time, which records intentions rather than work |
| "keep exactly **one** in progress" | a list marked all-done in one sweep at the end |
| naming the items **1..N** in the block itself | the runner inventing its own coarser list |
| "register the **conditional** steps too, completing a moot one with that reason" | a branch quietly dropping items, or skipped steps left open — either way an unfinished list stops meaning unfinished work |
| "**SEARCH** for the tool first" | a host that defers or renames its planner reading as a host that has none |
| "**anything that creates items** and marks them in progress/completed IS that tool" | the search running, returning the planner, and the runner not recognising it — measured 2026-08-12 in 3 of 33 runs of one workflow on one host, after the search line alone shipped (`precedents.md` §9) |
| "**two** empty results are a real absence on this host — say so plainly" | the opposite failure: a host that really has no planner, where an agent told only "you searched for the wrong name" can never conclude so, and its honest report reads as not having looked |
| "the **SESSION's** own planner, never an external tracker" | run bookkeeping written into somebody's real backlog — an outward action nobody asked for |
| the reply-list **fallback** | the runner improvising "I'll track it inline", which is indistinguishable in the report from tracking nothing |

## 2. Where the block lives, and what you may change in it

The block to copy lives once, in `SKILL.md` §2 — copy it from there and replace the angle-bracket
parts. The heading is yours to pick, and so is the sentence that opens the block: a `## Workflow`
section starting "Register these as TODOs and work the list" reads fine. Skills that open that way
carry `Register them in this session's own todo/plan tool` a line later, and that sentence is what
makes them conforming — copy that shape, not just the opening. What is not free is the rest of the
block: the conditional-step, planner-search, floor and fallback lines are the load-bearing part.

## 3. Granularity — why the bound is half the rule

Split an item while omitting part of it would change the outcome *and* nothing in the record would
show it. Stop there. Below that line the item stays whole and its **close** carries the enumeration:
"all four measurements taken", "loss test skipped: no gateway reachable". Splitting protects what a
reader must be able to audit; the close-verdict protects the rest.

A list split past the point of consequence is the All-Caps Tyrant in list form — when every line is a
checkpoint, none is.

## 4. Nesting — the wording for both shapes of todo tool

Write the rule as the **outcome**, never as one API's call, because the two shapes place your steps
differently and a skill that names one is wrong on the other host:

- **Replacement API** (the whole plan is submitted at once): resubmit the plan complete, with the
  caller's remaining items intact. Your steps can sit anywhere you like.
- **Item-oriented API** (items are created one at a time): there is **no insertion point**. New items
  get later ids and land at the **tail**, after the caller's closing items. Say that is expected, so
  the runner doesn't read it as a mistake and start renumbering.

Either way the **calling item is the gate**: it returns to `pending` while your steps run and
completes when your last one does. Where the tool has dependency links, use them both ways — the
calling item blocked by your steps, and the caller's remaining items blocked by the calling item.
Position never carries the order; the gate does.

## 5. Body skeleton for a workflow skill

`When to use` (+ when not) → `Definition of done` → **the Step-0 block** → one `## N. <step>` section
per step, each opening with its own one-line prompt and then the how-to-do-it-well → branch/decision
rules → `Output` → `Bundled resources`.

Keep the mapping legible both ways: every item resolves to a named place in the body, and no step
section is missing from the list. One heading per step is the default; folding or splitting is fine
while the numbering lines up.

## 6. Paying for the steps with `references/`

A long workflow still pays tier-2 cost: the body stays in context all session. So one file per deep step, keeping inline the step, its order, its branch conditions and
its rulings, and moving out the evidence, the long alternate paths and the platform detail —
signposted by the step that opens it ("Read `references/browser.md` before your first browser call").
