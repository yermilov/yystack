---
name: skill-authoring
description: >-
  Write, structure, and review great Agent Skills (SKILL.md files) so an agent reliably triggers and
  follows them. Use when creating, writing, editing, improving, reviewing, shortening or debugging a
  skill / SKILL.md / plugin skill — when a skill won't trigger, fires when it shouldn't, is too
  long, or must work on both Claude Code and Codex. Triggers include «як написати скіл»,
  «створити/покращити скіл», «чому скіл не тригериться», "write a skill", "make a SKILL.md", "my
  skill never triggers", "stop a skill auto-firing", "my workflow skill skips steps". Do not use for
  plugin PACKAGING — manifests, version bumps, marketplace wiring, README tables (that is
  plugin-dev), nor for building or running evals; this skill is about the SKILL.md itself. Covers
  the description, invocation flags, the three kinds of skill, progressive disclosure and
  anti-patterns.
---

# Skill authoring

How to write an **Agent Skill** that an agent you've never met, on a prompt you never saw, reliably
triggers, follows, and benefits from — thousands of times. This is the prescriptive **writing/design**
guide: how to make the prose itself good.

> This skill practices what it preaches — its own description, structure, and length are meant as a
> worked example. If you change it, keep it that way.

Length verdict (§2): 2026-11-14 — what stays inline is §1's flag table and host status (they decide
how to gate a skill), §2's tier rules and Step-0 block (copied verbatim by authors), the §6 table (the
index every review uses), and each section's rulings; their evidence is in `references/precedents.md`.

## The one job

A skill has exactly three jobs, in order. Everything below serves them; anything that doesn't is cut:

1. **Trigger** when (and only when) it's relevant — this lives in the `description`.
2. **Guide execution** without bloating the context — this is the body + bundled files.
3. **Generalize** to the messy, unseen cases — not just the few you tested.

It is not "a big prompt in a file": it's a **tiny routing contract + a focused operating procedure +
optional tools/references discoverable only when needed.**

## The three kinds of skill

Decide which kind you're writing before you start — it sets the shape, the length, and what to bundle:

1. **Knowledge skill** — documentation the agent *reads to understand a domain better*: the concepts,
   conventions, and mental model it then reasons from. There's no procedure to run; the value is
   comprehension. Keep it reference-like, and push bulky specs/tables to `references/`.
2. **Task skill** — a *saved prompt plus the knowledge to apply it well*. Open with the few sentences a
   user would actually type to get the thing done, then expand below with the troubleshooting, edge
   cases, and detailed guidance — the hard-won learnings that make the model do it **better** than
   running that prompt cold. The opening prompt is the contract; everything under it is know-how.
3. **Workflow skill** — a *step-by-step procedure* for something non-trivial, with branches,
   conditions, and loops. Each step is essentially its own task skill (a prompt + how to do it well),
   and the skill must **tell the running agent, in its own first step, to register the steps as TODO
   items** — §2 has the shape, the length rule and the forcing device. Use when order and completeness
   matter and a single prompt would skip steps.

Most skills are one kind; some blend. The kind sets your defaults — knowledge leads with prose +
references, a task skill with its prompt, a workflow skill with its ordered steps and a TODO list — so
the structure guidance below (§2) applies *through* the lens of the kind you picked. They also
**compose into a layered library**: a knowledge skill (`github`) is the foundation, a task skill
(`create-pr`) builds on it, a workflow skill (`review-pr`) orchestrates several, each referencing the
others **by name** across the installed set. Grow small composable skills rather than one monolith;
the God Skill (§6) is what you get when you don't.

**When NOT to use this skill:** for packaging and wiring a plugin (that is `plugin-dev`), for building
or running an eval harness (use whatever eval tooling your host provides — §7 here says only *what* to
test). This one is about writing the prose well.

## 1. Activation — the description is the trigger, the flags decide who may pull it

The agent sees every skill's `name` + `description` — budget permitting, see the cap rule below — and
does **not** always read the body. So the description is the classifier, not marketing copy, and
since agents _under_-trigger (they can often answer directly, and they economise on tokens), it has
to make "open this" obvious. A strong one names: the **task verbs** users actually say · the
**object/domain** · the concrete **situations** that should trigger · **synonyms, file types, product
names** · and a **boundary** naming who handles the nearest near-miss (usually a sibling skill).

**Formula:** `[Do X, Y, Z] for [domain/artifact]. Use when [user asks A, B, C] or mentions [keywords / synonyms / file types]. Do not use for <near-miss> — that's <sibling skill, host tool or the user>. [Optionally, what it covers — LAST, because a budget squeeze cuts from the end and this is the only part you can afford to lose.]`

```
Good: Analyze failing Playwright tests, inspect traces, isolate selector/timing issues, and propose
      fixes. Use when the user asks about Playwright failures, flaky E2E tests, trace.zip files,
      locators, or test timeouts. Do not use for unit tests with no browser — that's unit-test-debug.
Bad:  Helps with testing.   ← no artifacts, no verbs, no situations; fires on everything or nothing.
```

- **Be a little pushy** — "Use this whenever the user mentions X, even if they don't say 'skill'."
  The default failure is under-triggering, so lean toward inclusion.
- **Name the nearest sibling in one `Do not use for…` line** — or, where no skill covers the
  near-miss, what does (a host tool, the user). One line, never an enumeration of every non-case —
  that is noise.
- **A *mutual* near-miss needs a *reciprocal* boundary.** When two skills genuinely collide — a
  symmetric pair, or a broad skill and the narrow one it shadows — put a `Do not use for… — that's
  <sibling>` on *each* description, not just the one you happen to be editing. A one-sided boundary
  still lets the unmarked sibling win the trigger from the other direction.
- **Rank the boundary-less by cross-reference DIRECTION — fix the hub first.** The skill every
  sibling points *at* while pointing at nobody is both the likeliest gap (a hub reads as "obviously
  the main one") and the worst one (the classifier already defaults to it, and the hub is typically
  the skill that CHANGES STATE while its siblings only read). Worked case: `references/precedents.md` §1.
- **Audit the marketplace for MISSING boundaries, not just for length — and include this skill in the
  sweep.** Length has an obvious failure signal (the loader truncates); a missing boundary has none —
  it fails silently, as a near-miss skill quietly winning the trigger. Count it off the **parsed
  description**, never a file grep: a `Do not use for…` in the BODY reads as a boundary that isn't
  there, and real boundaries phrase themselves freely ("Do NOT use it
  to…", "— that's `<sibling>`"), so any pattern is a shortlist and reading is the verdict. Treat "no
  boundary" as the default defect, not the exception, and audit yourself first (`references/precedents.md` §2).
- **Write the description last,** once the body is stable — the behaviour you built, not the aspiration.
- **Trigger-test it:** list ~10 prompts that _should_ fire and ~10 that _shouldn't_ (typos, slang,
  indirect phrasings, near-misses sharing a keyword). If the description can't separate them, rewrite it.
- **There is a ceiling: keep the description under 1024 characters.** Codex's skill *validator* fails
  a longer one outright ("Description is too long … Maximum is 1024"); its *runtime* is more insidious
  — it accepts the skill and **truncates** (verified as of 2026-08 on Codex CLI; don't infer one from
  the other, and re-check on a new major version). **And under the cap is not safe either:** the runtime fits all installed skills
  into a *skills context budget*, shortening descriptions and dropping whole skills to make them fit,
  so your length competes with your neighbours' for the right to be seen. Since **every cut comes off
  the tail**, put the routing there first — verbs, `Use when`, then the boundary — and let any
  capability sweep be the last clause, as the only part you can afford to lose; keeping it short is
  what actually protects the rest. Length is a smell anyway: a classifier needing 1100 characters is listing what the skill
  *can* do instead of what should *trigger* it; most good ones land at 500–900. Measure with the
  bundled `audit-frontmatter.ts` (invocation under Bundled resources), never a `description:`
  line-grep, which bleeds into later keys and has falsely flagged skills as over-cap
  (`references/precedents.md` §3).

### Who may invoke it — two flags, three combinations

The description decides *whether* a skill is a candidate; two frontmatter flags decide *who is allowed
to pull the trigger*. Both default to off, which is why most authors never meet them:

| Frontmatter                      | User | Model | Description in context      |
| -------------------------------- | ---- | ----- | --------------------------- |
| _(neither — the default)_        | yes  | yes   | always                      |
| `disable-model-invocation: true` | yes  | no    | **no** — only the `/` entry |
| `user-invocable: false`          | no   | yes   | always                      |

Setting both is the one unreachable combination — it leaves nobody who can run the skill.

**These two keys are Claude Code frontmatter; Codex reads neither** (checked 2026-11 against Codex
CLI's own migration notes — re-check on a new major version). Those notes list
`disable-model-invocation` as having no Codex equivalent. They map `user-invocable` to
`policy.allow_implicit_invocation` in the skill's `agents/openai.yaml` and call that mapping
"similar intent, not equivalent semantics". So for a skill shipping to both hosts, the confirmation
stop in the body is the only gate both hosts read. Set the flag where it exists, and keep the stop in
the body either way.

- **`disable-model-invocation: true` is the mechanical fix for the Surprise Skill (§6).** A skill that
  deploys, publishes, spends money, messages someone, or rewrites history should be *unable* to
  auto-fire, not merely discouraged in prose. The cost: its description leaves context, so the model
  can no longer *suggest* it at the right moment. Take that trade only when the timing is genuinely
  the user's call; to recommend-but-not-act, stay model-invocable and put the stop in the body.
- **`user-invocable: false` is for knowledge that isn't an action.** If the skill name doesn't
  complete "I want to ___ now", it shouldn't be in the `/` menu — knowledge skills are the usual
  candidates, task and workflow skills almost never.
- **Reach for a flag before you reach for stronger wording.** Piling `NEVER auto-run this` into a
  description is the All-Caps Tyrant fix for a problem the frontmatter already solves.

## 2. Structure & progressive disclosure

Three context tiers — design for the loading path:

| Tier                               | Loaded     | Holds                                             |
| ---------------------------------- | ---------- | ------------------------------------------------- |
| `name` + `description`             | always     | routing only                                      |
| `SKILL.md` body                    | on trigger | mental model, workflow, decision rules, signposts |
| `scripts/` `references/` `assets/` | on demand  | everything bulky or rarely-needed                 |

The biggest structural mistake is putting tier-3 material in tier 2. Once a skill triggers, its body
**stays in context for the rest of the session**, so every wasted line is paid for repeatedly.

- **Length:** most bodies want ~100–250 lines; treat 300+ as a warning sign; **~500 is where
  length stops being free and has to be paid for section by section.** Past it, add a layer of
  hierarchy and point outward, then run one falsifiable test on every section still inline: **could
  its depth move to a reference, leaving one line of ruling behind?** If it could, that section is
  bloat and the body fails. The only answer that passes is that moving it would strand a ruling
  or a branch condition, which §2 forbids moving. "It is all important" is not that answer, and a
  body that cannot name a surviving section has not been examined — it has been excused. A
  `SKILL.md` over 500 lines then owes **a one-line verdict** recording that the test was run and why
  what is left had to stay, naming those sections, so the next reviewer can check the argument
  instead of re-deriving it; at 500 or
  fewer nothing is owed. Per §8 that mandate is a string, so it has a fixed marker and an exact
  cutoff: a line starting `Length verdict (§2):`, against `wc -l` over the whole file, frontmatter
  included. The bundled `audit-markers.ts` checks it and ignores a verdict that is only quoted inside
  code (a hand-grep's traps: `references/precedents.md` §9). Workflow skills budget per step instead —
  see the subsection at the end of this section.
- **Body skeleton that works:** `When to use` (+ when not) → `Goal`/success state → `Workflow` →
  `Decision rules` (If X, do Y) → `Output` → `Quality checks` → `Bundled resources`.
- **Signpost with activation conditions**, never "see the references": write `Read
  references/schema.md only when creating or validating the event schema.` The agent shouldn't have
  to browse the tree to guess what matters.
- **Never split a permission from its prohibition.** Many rules have two halves — *"do X yourself,
  but stop at Y"* (delegate-when-bulky vs don't-delegate-the-small-stuff, retry vs escalate,
  proceed-by-default vs the one case that needs asking). Leave the restrictive half inline and push
  the permitting half into `references/` and you have made the skill **stricter than you wrote it** —
  a **silent** failure: no wrong answer to investigate, the agent just quietly refuses work it was
  allowed to do. **Move both halves, or restate both inline and move only the evidence.** (`references/precedents.md` §4.)
- **⚠️ Progressive disclosure is for DEPTH, never for the BRANCH CONDITION.** The agent decides
  whether to open a reference *before* it has read it — and it decides from the body. So a rule that
  tells it **which way to go** has to be in the body; only the *why*, the precedent and the worked
  detail belong outside. The failure is invisible in review, because the rule demonstrably exists: an
  agent meeting the second case reads a body that appears not to cover it and stops, without ever
  opening the file that answers it. **Test for it:** for each branch an agent can actually land on,
  ask *"reading the body ALONE, does it know what to do — or does it merely learn that a file
  exists?"* If the second, hoist one line of ruling into the body and leave the evidence behind.
  (What it cost: `references/precedents.md` §5.)

### A safeguard goes NEXT TO the action, not in the preamble — and deliberate duplication is the mechanism

A warning several screens above the step it governs mostly does not fire: the model reaches that
step with momentum already built (an external measurement and its boundary:
`references/precedents.md` §11). So put the warning **inside the step it governs**. If a step is
long, or a browser, test suite or build sits between the warning and the action, restate it right
before the action. A rule about one command in `CLAUDE.md` belongs beside that command too.

**Deliberate duplication of a safeguard is allowed and often required.** Keep one short warning at
the point of the mistake and the full explanation once, in a reference. This is the single exception
to §3's *say it once*, and it is narrow: the one line that changes what the agent does, at the moment
it would do it — never a second copy of a procedure or a rule's explanation. Do not "remove the
duplication" there: the distance to the action is the mechanism you would be breaking.

### Workflow skills — the step list has to be executable, not decorative

A workflow skill's body *is* a procedure, so several defaults change for this kind.

**Make a copyable TODO block the first step — the guidance you are reading never reaches the agent
that RUNS your skill.** "Register each step as a TODO" is advice to *you*; the runner reads only the
file you shipped, to which a numbered body is skimmable prose. Put the forcing device *in the skill*,
as its first step (after any `When to use` / `Definition of done` preamble), naming the items:

```
## Step 0 — register the run
Register these as todo items now, before doing anything else, in whatever todo/plan tool this host
gives you — and while work remains keep exactly one in progress:
1. <step 1 title>   2. <step 2 title>   3. …
Register the conditional steps too: one a branch makes moot is completed WITH THAT REASON, never
left open — an unfinished list at the end must mean something really is unfinished.
No such tool? SEARCH for one first — on hosts with deferred tools it exists but is not loaded, and
its name differs per host. Anything that creates items and marks them in progress and completed IS
that tool, whatever it is called. Search by that capability, then by any name you remember: one empty
result is evidence about the name; two are a real absence on this host — say so plainly, it is not
your mistake. It must be the SESSION's own planner, never an external tracker (Jira, Linear, a task
app): your bookkeeping is not their backlog. If there truly is none, keep the list in your
replies — state it once, name each item as you start it, account for every one at the end.
```

**Keep one of the two marker sentences verbatim**: `Register these as todo items` (the block above)
or `Register them in this session's own todo/plan tool` (the same rule written as prose). It is a
string mandate (§8), so `audit-markers.ts` can find it. The heading and the rest of the wording are
yours. Keep every other line of the block too. Each one stops a failure that has actually happened:
a host whose planner is renamed or deferred, a search that finds the tool and does not recognise it,
an absence that can never be concluded. `references/workflow-skills.md` §1 says which line stops which.

**One item per thing that can be independently skipped — a step holding N checks is itself a
checklist.** The block cures skimming at the level it enumerates and nowhere below: register a step
whose body is eight separate checks as ONE item, and a run that did three reports the same shape as
one that did eight. Test every item: *could it be closed while a named sub-check was never
performed?* Then split it — but **bound the splitting** at *skippable with consequence and invisibly
so*, not *decomposable*; below that line the item stays whole and **its close carries the
enumeration**. Unlike the marker, this is a **property**: no string detects it, so its audit is that
per-item test plus checklist item 9 (§8 says why the distinction matters).

**Length: a workflow skill is the legitimate exception to the ~100–250 default** — not to the
over-500 test. It carries N steps, each a small task skill, so budget **per step** rather than counting the
file. The tier-2 cost doesn't change, so past 500 lines a workflow owes the same per-section test and
the same `Length verdict (§2):` line as anything else — applied per step: **one file per deep step**,
keeping the step, its order, its branch conditions and its rulings inline.

📖 **`references/workflow-skills.md` before you write the step list** — why each line of the block
is there, the body skeleton for this kind, and the nesting wording for both shapes of todo tool (your steps add to
the caller's list, never replace it, and the **calling item is the gate**: back to pending while
yours run, complete when your last one does).

## 3. Write for an LLM reader

Brief a competent, fast, literal-ish, context-budgeted colleague — not a lawyer, not a human README.

- **Imperative voice.** "Use the fetch API for requests," not "it may be advisable to consider fetch."
- **Explain the _why_ when it changes behaviour.** Understanding the reason lets the model generalise
  to edge cases you forgot. The _kind_ of reason tells it how hard the rule is: a _parser contract_ is
  hard; a _style preference_ it may adapt; a _usually-better_ heuristic it bends when the case demands.
- **Use a constraint hierarchy instead of all-caps everywhere:** **Must** (security, data loss, legal,
  machine-readable format, irreversible) · **Default** (unless the task calls for else) · **Prefer**
  (soft heuristic) · **Avoid** · **Never** (unsafe / contract-breaking). **When everything screams,
  nothing matters** — and piling on `NEVER DO X` can raise P(X) by weighting "X" in context.
- **Trust judgment where judgment is the product.** "Default to 3–5 recommendations; fewer if one
  dominates, more if options differ materially" beats "always produce exactly five." Over-constraint
  paralyses; a strong heuristic + the model's pre-training does better on the cases you can't foresee.

### Under-constrain on purpose — what changed with the Claude 5 generation

Anthropic cut most of Claude Code's system prompt for the Claude 5 models with no measurable loss
(source, dated: `references/precedents.md` §8 — read it when you're deciding how far to cut). What
matters for a skill author is *why* over-constraint costs: not tokens, but **conflict**. Two surfaces
saying opposite things make the model spend its reasoning reconciling you instead of on the task. So
the default flipped: write the **least** instruction that still gets the behaviour, and let the model
read the surrounding context.

- **A skill is a lightweight guide for finding information when needed — not a repository of
  everything.** The "central repository" instinct is named as a myth: authors stuff every known
  practice into one file assuming the model won't find it otherwise. Over-constrain only in genuinely
  high-stakes areas (the hierarchy above); everywhere else state the goal and stop.
- **Check a skill against its NEIGHBOURS, not just against itself.** The expensive failure is two
  surfaces that each read fine alone — a skill and the repo's `CLAUDE.md`, or two sibling skills —
  issuing opposite instructions into the same request. When you add a rule, read what will be loaded
  alongside it and **delete the loser** rather than shipping both and hoping.
- **Say it once.** If an instruction belongs in a tool/script description, a `--help`, or an enum, it
  does not also belong in the body — and a rule or procedure stated in two places of one file is two
  rules waiting to diverge. Duplication was a workaround for older models weighting the end of their
  context window; now it is pure conflict surface. The one exception is a one-line safeguard repeated
  at the step it guards (§2) — and that exception is the whole of it.
- **Don't expect the host's tooling to rightsize your prose.** Host "doctor" commands at most report
  which skills are unused or costly; none shortens a line for you. Rightsizing is by hand (what was
  checked, and when: `references/precedents.md` §12).
- **This guidance is generation-specific.** Several of these reversals invert advice that was *correct*
  for older models. Re-verify when a new model family ships — and stamp what you write the same way.

## 4. Generalize, don't overfit

Optimise for the distribution of prompts you'll never see, not your three demo prompts.

- Encode **intent and decision rules**, not exact keystrokes: define a **"Definition of Done"** and
  let the agent find the intermediate steps.
- In examples, use **generic placeholders** (`<user_id>`, `[ENV_VAR]`) so the agent doesn't hardcode
  your mock data into a real project. Don't bake in names/paths/dates/tool-versions unless required.
- **An example CAGES as much as it teaches — prefer a better interface to another example.** A worked
  example narrows the model to the shape you demonstrated, so first ask whether an **expressive
  interface** carries the same information: a parameter named for its meaning, an `enum` of the legal
  values, a `--help` stating the contract. (Anthropic's Todo tool needs no example: `status:
  pending|in_progress|completed` plus "keep exactly one item `in_progress`" already specifies it.)
  Keep examples where the lesson is a **judgment boundary** you can't encode structurally — and there
  pick ones that **differ along axes** (short/long, clear/ambiguous, happy/edge). Five examples that
  teach the same thing are four too many.
- Add **graceful degradation**: say what to do when the primary path fails ("if the endpoint is
  unreachable, fall back to the cache and say so").
- **Match freedom to fragility.** Generality is for *judgment*; the inverse holds for **fragile,
  irreversible** operations — a prod migration, a deploy, a destructive command. There, give the
  **exact** command (`run exactly: pnpm migrate --env prod`), not a paraphrase like "migrate as
  appropriate." Don't let "encode intent, not keystrokes" talk you out of precision where a wrong
  guess can't be undone.

```
Overfit: When the user uploads sales_q4.xlsx, pivot by region and rep.
General: When analysing a spreadsheet, first identify the grain of each row, the metric columns, and
         the likely dimensions; if the user didn't name dimensions, pick the decision-relevant ones
         and say which.
```

## 5. Bundle deliberately

Put each thing in the form the agent uses most reliably — don't dump everything into prose just
because SKILL.md is Markdown.

- **inline** — short, always-needed-after-trigger: the core workflow, decision + safety rules, output shape.
- **`references/`** — long, read-only, only-some-tasks-need-it: schemas, style guides, API docs, error
  catalogs, and the measured precedent behind a rule whose ruling stays inline (§2).
- **`scripts/`** — deterministic work where exactness matters or the model makes mechanical mistakes
  (validate frontmatter, check the tree, convert formats, lint, parse logs). Give them `--help` and
  **verbose, LLM-readable errors** so the agent can debug a failure instead of staring at exit-1. Not
  for judgment ("decide the positioning"). Three rulings, each of which has already cost a run:
  - **TypeScript run with bun is the default language.** Python when the work needs a library only
    Python has; anything else — bash included — only for a reason you write down in the file.
  - **A script may be a pure transformation; it may not supervise a long-lived process, keep state
    between invocations, or retry.** Any of those three makes it a program, and a program belongs in
    a real codebase with types, tests and a review history — not under `skills/`. This is a test of
    shape, **not of size**: a long converter is fine where a short orchestrator is not.
  - **A documented command must reach a runnable form using only what the agent already has** — from
    any working directory. Two acceptable shapes: a name already on `PATH`, or an explicit
    placeholder the agent replaces with a **literal** value it knows (the directory it loaded the
    skill from). Both are forbidden from depending on unset state: never a repo-relative path, and
    never a variable like `$SKILL_DIR`, which is **not set** in the agent's shell — a command built
    from it resolves to `/scripts/…` and fails exactly like the bare path it replaced. Mark a
    placeholder as one, and quote it, so a substituted path containing spaces still runs. Do not
    assume a plugin's `bin/` reaches `PATH` — that is host-specific. When you fix an invocation,
    **replace** the old form rather than leaving both.
- **`assets/`** — reusable non-instruction files: templates, logos, themes, sample outputs.

**Prefer a reference in CODE form over the same thing in prose** — an artifact the model can read in
a language it knows beats a description of that artifact. An **HTML mockup beats a written
description of a design, or a screenshot of it**; a **test suite is a better spec** than a spec
document; a function from another codebase is a portable "do it like this"; a **rubric** is the
reference form for *taste*, letting verifier agents check output against your standard instead of you
re-explaining it. Reach for prose only when no artifact form exists.

**Strong opinion:** every non-trivial skill ships **at least one validation mechanism** — a script, a
checklist, a rubric. Without a way to check the output, a skill is just vibes in Markdown. Note that
this checks the skill's OUTPUT and is not a test of the script itself; scripts under `skills/` have
no test runner, which is a reason to keep them small rather than a reason to relax.

📖 **`references/skill-scripts.md` before you add or grow a `scripts/` file** — why the language
order is what it is, the bash failures that read as successes, what an unfindable command cost, and
how to write an error a model can act on.

## 6. Anti-patterns → the fix

| Anti-pattern           | Symptom                                          | Fix                                                                                                   |
| ---------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| **Invisible Skill**    | great when invoked, never auto-fires             | description too vague / internal jargon → rewrite with verbs + artifacts + situations                 |
| **Keyword Trap**       | fires on irrelevant tasks                        | broad noun ("data", "docs") → add domain + action + one negative boundary                             |
| **God Skill**          | one skill for "frontend development"             | bloats & confuses → split into focused skills                                                         |
| **Context Dumpster**   | works but slow/expensive                         | body holds everything → cut to workflow + rules + links; move rest to `references/`                   |
| **All-Caps Tyrant**    | obeys dumb rules even when adaptation is obvious | separate hard constraints from defaults (§3 hierarchy)                                                |
| **Conflicting Neighbour** | agent hesitates, or honours the opposite half of two rules | a sibling skill / `CLAUDE.md` says the opposite → find the contradiction across everything loaded together and DELETE the loser; don't add emphasis (§3) |
| **Example Cage**       | agent only ever produces the demonstrated variant | a usage example narrowed the exploration space → replace it with an expressive interface: enum, named parameter, `--help` (§4) |
| **Demo-Prompt Skill**  | perfect in the README demo, fails in real use    | replace example-specific steps with general rules; test on messy prompts                              |
| **Dead Reference**     | "see the reference" but the agent never does     | list each file **with an activation condition**                                                       |
| **Severed Permission** | agent refuses work the skill actually allows     | a rule's *"you may"* half moved to `references/` while its *"but never"* half stayed inline → keep both halves in the same file (§2) |
| **Script Nobody Runs** | useful helper ignored                            | make it explicit/required: "after editing, run the bundled validator; fix failures before responding", with the invocation in §5's placeholder form |
| **Black Box Script**   | bundled script fails silently                    | verbose, LLM-readable stdout/stderr                                                                   |
| **Lint Leakage**       | restates Prettier/ESLint/TS rules                | say which command to run + what a failure means; don't restate the rulebook                           |
| **Setup Bloat**        | inlines `brew/npm install …` + env setup steps   | assume the tools are installed; move install/setup to a reference the agent reads only *on failure*   |
| **Rotten Date**        | silently wrong over time                         | isolate volatile facts, stamp "verified as of …", tell the agent to re-check when freshness matters   |
| **Surprise Skill**     | auto-runs destructive/expensive/private actions  | confirm first in the body, plus the host's invocation flag where one exists (§1) — _a skill may be powerful; it must not be sneaky_ |
| **Decorative Checklist** | a workflow skill's steps get skimmed — the agent does 1, 3 and 7 and calls it done | numbered prose is not a checklist → open the skill with the copyable Step-0 TODO block (§2) |
| **All-or-Nothing Gate** | a completeness rule makes runs record *nothing* | see below                                                                                             |
| **Self-Confirming Check** | a capability check that can only ever answer "no", so a fallback becomes the only path | see below                                                                                             |

**All-or-Nothing Gate — write the completeness rule so it gates the CONCLUSION, not the RECORDING.**
*"Do not write anything unless you have all N sources"* reads as rigour and behaves as data loss: the
run that falls short discards what it did gather. Split it in two — **recording** partial input is
always allowed and carries an explicit coverage line (`partial pass: 7/16, missing: …`); only the
**derived conclusion** (the score, the verdict, the published number) waits for full coverage. Then a
reader can tell "no signal" from "nobody looked". (What it cost once: `references/precedents.md` §6.)

**Self-Confirming Check — never write a capability test whose failure looks like its own answer.**
*"If tool X isn't in your tool list, fall back"* is not a test on a host that **defers** tools:
nothing is listed until the host's tool search loads it, so the check always answers "absent". Make
the probe positive: name the search/load step as part of the test, and treat the capability as
missing only if the load itself comes back empty.

The mirror image is worse: **a check with no floor tells a correct agent it is wrong.** A skill that
asserts a capability exists and offers no way to conclude otherwise makes a genuine absence read as
agent error. Give every absence a floor — "two empty probes close the question; that is a fact about
this host, not your mistake" — and date the host claim, because host state changes (both cases:
`references/precedents.md` §10).

## 7. Test it — anecdotes aren't evals

You don't know a skill helps until you compare **with-skill vs. no-skill** on the same prompts.

- **Lightweight (most skills):** ~10 should-trigger + ~10 should-not (the near-misses are the
  valuable ones) + a handful of real task prompts, each with its expected behaviour and what it must
  _not_ do. Run baseline vs. with-skill (vs. the previous version if you're improving one): did it
  trigger? avoid false triggers? produce leaner output? use bundled files right? stay safe?
- **Heavyweight (shared/production skills):** blind A/B against a rubric (task success, correctness,
  completeness, brevity, intent, tool use, safety, recoverability). Worth building a harness once
  rather than hand-scoring every time.

This skill's own set is `references/trigger-tests.md`. Copy its shape for yours.

## 8. Maintenance & safety

- **A stale skill is worse than none** — it actively commands deprecated behaviour. Isolate volatile
  facts (API versions, prices, policies), stamp them verified-on, and review skills like dependencies.
- **Write every measurement with its BOUNDARY attached — "what this does not establish" — or it
  reads as a conclusion and gets obeyed as one.** A number in a skill file has no author standing
  beside it to say how far it generalises, so the next agent takes the widest reading available
  (`references/precedents.md` §13). After each measured claim, finish the sentence *"…which does not
  establish …"*; in a table, add a column **What it does not establish** — a shape worth stealing for
  any skill whose output is a finding.
- **When you review a skill, RUN the commands it prescribes — don't read them.** Prose review cannot
  see this rot: the command still exists and still looks right while privilege requirements, renamed
  flags and moved output formats have quietly broken it. Execute each on a real machine, and where one
  needs elevation or has a no-privilege alternative, **say which and prefer the alternative** — the
  version that runs unprompted beats the one that stalls on a password prompt on an unattended run.
  (The case that proves it: `references/precedents.md` §7.)
- **A skill's own statement of scope is a TESTABLE claim — check the body against it.** When a skill
  says some class of detail "lives elsewhere" (project specifics in a memory file, mechanics in a
  sibling skill, setup in a reference), grep the body for that class before believing it. The
  disclaimer is exactly what stops anyone looking, which is why this is the cheapest high-yield check
  in a review — and the damage is **directional**: it misleads the reader working in a *different*
  project, who follows another project's hardcoded paths as if they were their own. Reconcile it in
  whichever direction is true — narrow the claim, or move the detail out and leave a placeholder.
- **A fix aimed at one STEP does not bind the other steps that can produce the same bug — after you
  patch, grep your OWN file for every route to that failure** (`references/precedents.md` §14). Grep
  for the endpoint, flag or tool the fix names and ask which other steps reach it. Patch them in the
  same change, or point them all at one canonical recipe. If the warning would then appear in three
  places, the fix belongs one layer down — in the server, the tool schema, or a default — where it
  retires every copy at once.
- **A mandatory rule needs an audit and a rollout, or it binds only the skill you were editing.**
  Say, in the same change, **how conformance is detected** and **who gets swept**:
  - **A requirement that IS a string** (a block, a heading, a named section) gets a **fixed marker**,
    chosen when you write the rule: at most two forms, taken from what conforming skills already
    say. Pair it with the **inventory of skills the rule applies to** — the grep is a shortlist, the
    inventory is the verdict. The check ignores a marker inside code, or a skill that only quotes it
    passes (`audit-markers.ts` does this for this guide's markers). Repair later drift in the skills,
    never by widening the pattern. Why each of these, and the `grep -L` traps of a hand-run check:
    `references/precedents.md` §9.
  - **A requirement that is a PROPERTY** no string can express — "each item covers one
    independently-skippable thing", "the branch condition is in the body" — has no marker, so **say
    so and name the check that enforces it instead**: a line in the pre-ship checklist, and a named
    check in whatever review the library runs. Inventing a marker for a property is worse than none;
    it makes the grep pass while the property is absent.
  - **Rollout is the second half, and it is the one that silently doesn't happen.** Enumerate every
    plugin — not the ones you happened to be editing — or, if that is a job of its own, file it as
    its own work item in the same change. A mandate landed on one skill is a mandate nobody else has.
- **A periodic re-review is the point, not a chore.** Skills drift out of conformance as this guidance
  itself changes — the Claude 5 reversals (§3) invalidated advice that was correct when written. Sweep
  the library on a cadence: run the bundled `audit-frontmatter.ts` and `audit-markers.ts` (no host
  command rightsizes prose for you, §3), then go by hand for what they can't see. **Record
  the COMMIT this guide was at when each review ran, and open the next one by diffing the endpoints —
  `git diff <sha>..HEAD -- <path/to/this/skill>`** — otherwise a reviewer applies the rules it
  already knew, and a skill written before a rule silently conforms to nothing: a skipped check no
  report can show. Anchor on a SHA. Do not use `log -p`, which replays rules later withdrawn, or a
  package version, which is not a revision. Then look for what no diff shows — a missing `Do not use for…` (§1), a ruling
  stranded in a reference (§2), rules contradicting a neighbouring skill or `CLAUDE.md`.
- **Principle of least surprise:** the skill's behaviour must not surprise someone who only read its
  description. Destructive, irreversible and external actions get the confirmation stop of §1.
- No malware, exploit code, or instructions that exfiltrate data or evade controls. (Role-play/persona
  skills are fine.)

## 9. Portability — one skill, both Claude and Codex

The **`SKILL.md` is already the portable unit**: every host this guide covers reads the same
`name` + `description` + markdown body. Portability is mostly (a) not baking one host's assumptions
into the body, and (b) shipping the wrapper each host expects.

**Default: make every skill work on BOTH Claude Code and Codex** — single-host is the exception you
must justify. Only fork when a step is genuinely impossible on a host, and even then **gate just that
step** and keep the rest portable. Same for the non-skill surfaces (hooks, manifests): prefer the one
artifact both accept — e.g. a hook script emitting the cross-host `{"hookSpecificOutput":{...}}` JSON
— over a single-host build.

**Write the body host-agnostic.**

- **Name capabilities, not tools.** Say "the shell", "the browser", "a subagent" — not one host's
  handles (Claude's `Task`/`Skill` tools, "Claude Code"). The same instruction then lands anywhere.
- **Gate what isn't universal.** Subagents (some hosts have none), a specific MCP tool, a slash command,
  a screen — these differ per host. Either offer a fallback ("research via subagents _if available_,
  else inline") or put the divergent steps in a clearly-labelled platform section.
- **Don't hard-depend on harness specifics** — fixed paths, a tool being callable _this_ turn (MCP
  tool lists are connection-cached), or one host's permission model.

**Shipping the wrapper is packaging — `plugin-dev` owns it; don't keep a second copy here.** Two
writing-side consequences are yours. First, the skill's `description` lives once, in `SKILL.md`, and
both hosts read that same file. Never copy it into a manifest; a manifest's plugin description is
`plugin-dev`'s. Second, repo memory is per-host (**`CLAUDE.md`** / **`AGENTS.md`**), so host-specific
pointers go in each.

**Test on both.** Trigger + run the skill on each host you ship to; a tool or capability that exists
on one but not the other is the usual portability failure.

## Pre-ship checklist

1. Can a stranger agent tell from the **description** alone when to fire it — verbs, artifacts,
   situations, synonyms, one boundary? Did you trigger-test ~10/~10?
2. Is the **body lean** (~100–250 lines), tier-3 material moved to bundled files, references
   **signposted with conditions**? Over 500 lines: a `Length verdict (§2):` line naming the sections
   that had to stay? For anything you moved out: did **both halves** of each paired
   rule travel together, so nothing is left only-prohibited inline? Reading the body ALONE, does the
   agent know **which way to go at every branch** (§2)? Does each safeguard sit **at the step it
   guards**, not only in a preamble (§2)?
3. **Imperative + why**; hard rules marked **Must/Never**, the rest **Default/Prefer**; no wall of caps?
   Could any rule here be **cut and left to judgement** (§3)? Does anything **contradict a neighbouring
   skill or `CLAUDE.md`** — or restate what a tool description already says?
4. Encodes **intent + Definition of Done**, generic placeholders — and does every worked example earn
   its cage, or would an expressive interface (enum, named param, `--help`) do the job (§4)?
5. Bundling matches form (scripts=deterministic, references=read-only knowledge, assets=files); each
   reference in its **highest-fidelity form** (code/tests/mockup over prose, §5); **≥1 validation** present?
6. Ran **with-skill vs. baseline** on real prompts?
7. Volatile facts dated; destructive actions stopped for confirmation in the body, plus the host's
   invocation flag where one exists (§1); nothing sneaky?
8. Shipping to more than one host? Body names **capabilities, not host-only tools**; tested on each
   host (§9). Packaging — manifests, versions, marketplace wiring — is `plugin-dev`'s checklist; run
   that one too.
9. **Workflow skill?** Does it open with the copyable **Step-0 TODO block** carrying a marker
   sentence verbatim (`audit-markers.ts`), does every item resolve to a named place in the body (and vice-versa), is no
   item a **bundle of independently-skippable checks**, and is every deep step's evidence in
   `references/`? Length is judged **per step** — and past 500 lines the body carries a
   `Length verdict (§2):` line.

## Bundled resources

- **`references/precedents.md`** — the measured cases behind the rulings above, plus the full source
  and per-surface guidance for the Claude 5 reversals (§3). Read a section when you must justify a
  rule, when you're judging how hard to apply it, or when a rule looks wrong and you want to know what
  produced it. **You never need it to know what to do** — every ruling is inline.
- **`references/workflow-skills.md`** — why each line of the Step-0 block is there, the body
  skeleton for a workflow skill, and the nesting mechanics for both shapes of todo tool. Read it when
  you write or fix a workflow skill's step list, or when yours can be invoked by another skill.
- **`references/skill-scripts.md`** — the depth behind §5's `scripts/` bullet: why TypeScript+bun is
  the default language, the line a script may not cross, and how a documented command reaches a
  runnable form from any working directory. Read it before you add or grow a `scripts/` file.
- **`references/trigger-tests.md`** — should-fire and should-not-fire prompts for this skill. Read it
  when you change the description, and re-run them.
- **`scripts/audit-frontmatter.ts`** — the frontmatter audit: the 1024 cap, missing boundaries,
  name↔directory, unparseable YAML. Run it before shipping a description change and at the start of
  any library-wide sweep (§1).
- **`scripts/audit-markers.ts`** — the two string mandates: the `Length verdict (§2):` line over 500
  lines, and which skills carry a Step-0 marker outside code (a shortlist for your workflow
  inventory, §8). Run it before shipping a body change past 500 lines or a workflow skill.

  Both take the marketplace root, print `--help`, and exit 1 on a defect a machine can be sure of, so
  read the exit code, not just the counts:

  ```bash
  bun run "SKILLDIR/scripts/audit-frontmatter.ts" "MARKETPLACE_ROOT"
  bun run "SKILLDIR/scripts/audit-markers.ts" "MARKETPLACE_ROOT"
  ```

  Substitute both placeholders with literal paths first. `SKILLDIR` is the directory you loaded this
  `SKILL.md` from, which you already know, and `$SKILL_DIR` is not set in your shell (§5).

## In this marketplace

- Skills live in `plugins/<plugin>/skills/<name>/SKILL.md`. Study the ones already here as voice
  exemplars — rich trigger lists (add native-language phrasings if your users write in another
  language), a "when NOT to use" boundary, explain-the-why prose, concrete examples.
- **Shipping is packaging: follow `plugin-dev` and this repo's `CLAUDE.md`** for the version-bump
  discipline, both manifests, and the `README.md` skill list. §9 has only the writing-side half.
- **Where the repo's `CLAUDE.md` narrows §5's script-language order** (some marketplaces ship Bun +
  TypeScript only, with no Python or bash exception), the repo rule wins for skills in that repo.
