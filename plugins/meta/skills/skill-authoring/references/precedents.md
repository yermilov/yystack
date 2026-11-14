# Precedents — the measured cases behind the rules

> Reference for the `skill-authoring` skill. Every **ruling** here is already stated inline in
> `SKILL.md`; this file holds only the **evidence** — what each failure looked like and what it cost.
> Read a section when you need to justify a rule to someone, when you're deciding how hard to apply
> it, or when a rule seems wrong and you want to know what produced it. You never need this file to
> know *what to do*.

## 1. The hub is the skill with no boundary (§1)

Seen in a real plugin whose skills all wrap one backend: every sibling's `Do not use for…` named the
hub skill, and the hub's own description named none of them. So a "what should I do next?" phrasing
could fire the full **do-the-work** skill instead of its read-only counterpart — mutating state to
answer a question.

Why the hub is both the likeliest and the worst offender: likeliest because a hub reads as "obviously
the main one", so nobody thinks it needs a boundary; worst because the classifier already defaults to
it, and the hub is typically the skill that **changes state** while its siblings only read.

That hub's description was also only a quarter of the character budget — there was no cap pressure to
discover the gap. The fix was free and had simply never been looked for.

## 2. The authoring skill audited everyone but itself (§1)

A marketplace-wide grep for `/do not use for|not for\b/i` turned up two things. The big number: only a
minority of skills had any boundary at all — "no boundary" is the default defect, not the exception
(one library at one date, which does not establish the share anywhere else).
And the embarrassing one: **this authoring skill shipped without a `Do not use for…` for months**,
against an obvious near-miss (`plugin-dev` — same plugin, both about "skills and plugins").

A rule you only apply to *other* skills isn't enforced, it's decorative.

## 3. The 1124-character description, and the grep that lied (§1)

A shipped skill sat at **1124 characters**, past Codex's 1024-char loader cap. Rewriting it as a
classifier rather than a capability list brought it to **904 with every trigger intact** — the excess
was capability prose, not triggers.

The audit that found it also nearly derailed: a line-grep for `description:` bleeds past the
description into the keys that follow it and over-reports the length. That **falsely flagged three
skills as over-cap** and sent a whole pass down a rabbit hole. Parse the frontmatter as YAML,
resolving folded (`>`/`|`) and continued values, then print each length.

## 4. Severed permission — the login that stopped working (§2)

Caught in review. A skill said: *"sign in through single sign-on yourself; stop only if a typed
password or a 2FA code is demanded."* A refactor moved the **sign-in permission** into a reference and
kept the **credential warning** in the body. An agent that hadn't opened the reference would have
blocked at every login wall — refusing work it was explicitly allowed to do.

The failure mode is what makes this class dangerous: it is **silent**. The agent produces no wrong
answer to investigate; it just quietly does less.

## 5. Branch condition in a reference — four sessions lost to a rule that existed (§2)

A task-running skill's body described only the **one-connected-device** case. The
**two-devices-connected** routing was added later, to a reference file.

Over the following days at least **four sessions** skipped a verification step they were fully
authorised to perform, each reporting that the choice "requires an interactive question." The
reference had answered it the whole time — but the agent decides whether to open a reference *before*
reading it, and it decides from the body. A body that appears not to cover your case reads as a skill
that is silent on it.

**The test:** for each branch an agent can actually land on, ask *"reading the body ALONE, does it
know what to do — or does it merely learn that a file exists?"*

## 6. All-or-nothing gate — 19 hours of coverage destroyed to protect a standard (§6)

A monitoring skill carried a completeness rule: read all 16 channels or write nothing. Three
consecutive runs hit a broken login and each **correctly** reported *"created no assessments, signals or ground-truth
marks"* — discarding everything they had gathered.

The series lost roughly **19 hours of coverage** which, being time-series, can never be backfilled —
over a window in which the event being monitored for actually occurred.

The split that fixes it: **recording** partial input is always allowed and must carry an explicit
coverage line (`partial pass: 7/16, missing: …`); only the **derived conclusion** — the score, the
level, the verdict, the published number — waits for full coverage. Then a downstream reader can tell
"no signal" from "nobody looked", which the blackout version makes indistinguishable.

## 7. Read the command, it looks fine; run it, it yields nothing (§8)

A skill instructed `wdutil info` for macOS Wi-Fi statistics. The binary is present and the command
still looks right on the page — but the bare call now prints only a **usage message**, because it
requires elevation.

An agent hitting a usage dump most naturally concludes the *tool* is missing or broken and abandons
the whole step, rather than re-running with `sudo`. Privilege requirements, renamed flags, and moved
output formats all rot silently this way, and prose review cannot see any of them.

Hence: execute each prescribed command on a real machine, and when one needs elevation or has a
no-privilege alternative, **say which and prefer the alternative** — the version that runs unprompted
beats the version that stalls on a password prompt, especially on an unattended run.

## 8. Source for the Claude 5 reversals (§3)

Anthropic, "The new rules of context engineering for Claude 5 models" (published 2026-07-24; read in
full 2026-08-08).

Headline finding: **over 80% of Claude Code's system prompt was removed** for Claude Opus 5 and Claude
Fable 5 **with no measurable loss on their coding evaluations**.

The mechanism they name for the cost of over-constraint is worth quoting precisely, because it is not
a token-budget argument: reading transcripts of their own internal usage they saw *several conflicting
messages in a single request* — "leave documentation as appropriate" from one surface against "DO NOT
add comments" from another — and while Claude can generally still infer intent, it "must think more
carefully about these overlapping and conflicting messages before deciding what to do." The waste is
**reasoning spent reconciling your surfaces**, not bytes.

Their per-surface guidance, condensed:

- **System prompt** — heavily tied to product context; the place to spend effort if you build your own
  agent harness, and essentially never edited by a Claude Code user.
- **CLAUDE.md** — lightweight; briefly say what the repo is for, then spend most of the tokens on
  **gotchas inside the codebase** (e.g. "types live in one monolithic file and nowhere else"). Avoid
  stating the obvious things an agent can see from the file system. Push detail into a skill and
  reference it.
- **Skills** — "lightweight guides to let Claude find information when needed." Avoid
  over-constraining except in highly important areas. Split long skills into many files. Best when
  they encode opinions/knowledge particular to you, your team, or your product.
- **References** — prefer files that are **in code**, as high-fidelity instruction in a language the
  model knows well. Explicitly: "a HTML mockup of a design will generally produce better results than
  a description of the design or a screenshot." A spec may be a detailed **test suite**, or a function
  in a different codebase to port. **Rubrics** let verifier agents check your taste in a domain.

The post also said a `/doctor` command applies these practices to skills and CLAUDE.md files. Run, it
did not — §12 records what the command actually did.

**This section is generation-specific — re-verify it when a new model family ships.** Several of these
reversals invert advice that was correct for older models; the next generation may move them again.

## 9. One family of workflow skills registered its steps; no other workflow did (§2)

An audit of a mature marketplace. A heading scan **shortlists** candidates — three or more
numbered step headings, or a `## Workflow` section — and a second sweep asks which skills say
anything at all about tracking the run:

(The original was a shell loop counting numbered `##`/`###` step headings per file, plus a recursive
grep for todo vocabulary; today `scripts/audit-markers.ts` lists which skills carry a Step-0 marker,
and the inventory, not any scan, decides which skills are workflows.)

**The scan is a shortlist, not a classifier — read the matches.** It returned a few dozen files, and
reading them separates genuine procedures from *knowledge* skills that merely number their sections
(this guide is one).

**Then get the second sweep right, because the first attempt at it was wrong.** Searching only for
`todo list|todo item` returned three irrelevant files and looked like a clean zero; widening it to
`TODOs` surfaced **a handful of skills that had carried the instruction all along** — one family
sharing a template, each opening its `## Workflow` with the same line, *"Register these as TODOs and
work the list."* No workflow skill outside that family had anything, including the ones that run
unattended on a schedule, where a silently skipped step is least likely to be noticed.

So the honest finding is not "nobody did it" but **"one family did it and it never generalized"**:
one template, and every other workflow written after the same authoring guide skipping it. The
guide's sentence addresses the **author**, and the author is not present at run
time; only a template put the words where the running agent would read them. (The owner's own read
was the stronger "not one of my workflow skills follows the scheme" — the audit is what narrowed it.)

Nothing about the runs looked wrong, which is the cost: with no registered list, a run that did three
of seven steps produces the same shape of report as one that did all seven, and the skipped steps are
invisible to the agent itself, to the reader, and to any later review.

**The sequel, one day after those blocks shipped: the very first observed run dropped the list
anyway.** A remote-control session opened the task-runner skill, reached the new block, and reported
verbatim — *"No TodoWrite tool in this session — I'll track the lifecycle items inline"* — then
worked without one. The tool was there **that day**. That host exposed the capability under
**different names** (`TaskCreate` / `TaskUpdate` / `TaskList`) **and deferred them**: absent from the
initial tool list, loaded only on an explicit tool-search, so an agent scanning for a familiar handle
saw nothing and concluded the host had none. Registering the same list by hand in a later session on
that host took one search and four calls.

**⚠️ Read that as dated, not standing — the same host later had no todo tool at all, and the rule
below turns on which case you are in.** Measured on a build eight weeks on, from the session's own
advertised tool list rather than from a search: **294 tools and not one todo tool**, identical across
every permission mode; setting the vendor's opt-in environment flag and re-running the identical probe
returned **298 including the three handles**. Both names are compiled into the binary either way, so
inspecting the shipped bundle proves nothing about your session — only the advertised list does. So
the capability is not merely renamed-and-deferred; on that host it is **gated off by default**, and a
careful search then returns nothing because there is nothing.

Which is the trap this precedent creates for its own readers. The finding above was written as a fact
about a host, and it is the shape §8 warns about — an accurate observation of external state, recorded
without a date, that the next agent obeys without testing. Its literal descendant, *"an empty result is
evidence about the name, not about the host,"* tells an agent facing a REAL absence that its own
correct answer is a mistake, and the honest report becomes indistinguishable from the failure the block
was written to stop. **The repair is to make the negative decidable rather than deniable: search by
capability, then by the exact handles, and treat two empty results as a real absence — reported
plainly, with the fallback taken and every item accounted for.** A rule that can only ever conclude
"you searched wrong" is not a recognition test.

Two rules come out of it, and the second is the one that bites. **Name the capability, not the
handle** — "the host's todo/plan tool" — which is only §9's portability rule applied to the block you
just mandated. And **say what "no such tool" means**: search for it first, and give the fallback
explicitly, because the alternative the runner improvises ("I'll track it inline") is indistinguishable
in the report from having tracked nothing at all. A mandate the runner cannot execute does not fail
loudly; it fails as a polite sentence about tracking things inline.

**The third act, three weeks on: the block was there, was worked in full, and still hid a skipped
check.** A review workflow had registered all seven of its steps and completed every one. But its
step "review it against both standards" was, in the body, **seven independent checks** — frontmatter,
truth, executability, contradictions, structure & weight, workflow conformance, safety — and it had
been registered as **one** item. At least one of the seven, whether the reviewed file carried the
newest structural requirement, was never run. The owner found that by asking, not by reading the run,
because there was nothing to read: an item closed after four checks and an item closed after seven
are the same tick. Registering the list had made the *steps* auditable and left the thing that
actually got skipped one level below the resolution of the record.

Which yields the granularity rule in §2, and the reason it is not pedantry: the block's whole value is
that an unfinished list means unfinished work. Any item that can be honestly closed while part of it
went undone breaks that equivalence, and it breaks it silently — the failure mode this entire
precedent is about, reproduced by the fix for it. The cheap test is the one in §2 (*could this item be
closed while a named sub-check was never performed?*), and the cheap repair is that each item closes
naming what it checked, so "clean" carries its own evidence.

**And the phrasing kept drifting, which is why §8 now says to fix the marker when you write the
rule.** Two weeks after the blocks shipped, one marketplace carried **three** rival sentences — 16
skills with "Register them in this session's own todo/plan tool", 6 with "Register these as TODOs", 4
with "Register these as todo items now". Of its 36 workflow-shaped skills, 20 carried some
instruction and the narrow `todo list|todo item` pattern found **15 of those 20**: a 25% miss rate on
a mandate its own author could not grep for. Nothing was wrong with any of the three wordings — only
with there being three.

**Then the fix reproduced the failure one level up.** The reviewer who named the marker picked the
two forms that read best rather than the two the corpus used — and immediately shipped a mandate that
the library's own workflow skills did not satisfy, i.e. the §8 rollout gap, created by the change
that added the rule against it. Re-measuring and adopting the two phrasings already in use took the
coverage to 20 of 20 with no edits to anyone else's skill. Hence: **choose the marker from what
conforming skills already say.**

**Drift did not stop when the marker was named — it reappeared in a form the marker missed.** Two
months after the two-form rule shipped, the same library held three skills carrying a fully
working Step-0 block in a *fourth* phrasing (`"Register these now, before <X>, in this session's own
todo/plan tool"` — neither documented sentence as a substring). `grep -L` flagged all three, and it
was **right to**: once the marker is mandatory, carrying a working block in an undocumented wording
is a real conformance failure, not a false alarm. What the flag does not tell you is *which* failure,
and that is the trap — read it as "no Step-0 block here" and you write a second block on top of a
working one. It means **the marker is missing**, so the repair is a one-sentence rewording. The
tempting alternative — admit a third form so the flags go away — is the one to refuse: each
admission is unbounded and dissolves the property that made the marker checkable at all. Repair the
skills, not the pattern.

**And the audit command has one portability trap of its own: `grep -L`'s EXIT STATUS is not
portable, while its output is.** Measured 2026-08-30 on one machine: BSD `grep -L <pattern> <file>`
and `ugrep -L` — which some agent harnesses transparently substitute for `grep` — printed the **same**
file list and returned **opposite** exit codes (BSD 1 / ugrep 0 for a non-matching file). A sweep
wired to `$?` therefore inverts depending on which implementation is on `PATH`, silently, while still
printing the correct answer on screen. This bit the review that wrote the rule: its own negative
control reported the audit broken when only the control was. Read the filenames.

**The `Length verdict (§2):` hand-grep has two more traps, which is why `scripts/audit-markers.ts`
now does it.** The pattern must be anchored (`^Length verdict …`): unanchored, any file that merely
quotes the rule passes. And the parentheses must be bracketed (`[(]§2[)]`) to mean the same literal
in both regex dialects; written bare, they are grouping under ERE, and the audit then reports every
conforming file as missing. The script sidesteps both, and also skips a verdict that sits only
inside a code fence.

**A second miss in the same pass came from the standard itself moving.** Several of the rules the
review was meant to apply had been added to this guide *after* the file under review was written —
and after its previous review. An agent applying "the standard" from memory applies the rules it
already knew, and nothing about that looks like a skipped check. Where a review is periodic, make the
drift mechanical: record which version of the standard each review ran against, and diff the
standard's history since that version before starting the next one.

**Measured afterwards, and the number is the point: the block works, and "search for it" was still
not enough.** Eighty-five completed runs of one task-runner workflow were read from the host's own
transcripts — tool calls, not self-report; the in-flight run doing the reading is excluded. Before
the search line shipped, **4 of 52** registered anything. After it, **33 of 33** did, a median 14
seconds after opening the skill, and 573 of 578 items were closed by the end. That is one workflow
on one host, and does not establish the rate for other skills or hosts. So the device holds there;
what follows is the residue, not a retraction.

In **3 of those 33** the runner still announced *"No todo tool in this session, so I'll track the run
inline"* — and then, half a minute to two minutes later, searched again, found the tool and registered
the list properly. The recoveries are what identify the real defect. One of the three had already
searched the **capability** words ("todo list plan tracking"), which returns the tool on that host; it
read the results and concluded there was none anyway. Another searched by exact handle for the name it
remembered (`TodoWrite`) and took the empty result as proof. A third narrated the correction outright
— *"`TaskCreate`/`TaskUpdate` **is** this session's todo tool — registering the run there now instead
of inline"* — which is the whole failure in one sentence: it had the answer on screen and did not
recognise it.

So the instruction that fails is not *look*, it is *know what you are looking at*. Telling a runner to
search hands it a result set it has no test for, and the wrong test is the one it arrives with: a
remembered handle. **Give the recognition rule with the search** — anything that creates items and
marks them in progress and completed IS the tool, whatever it is called; an empty result for one
remembered name is evidence about the name only. **But give it a floor too, or you have replaced one
unfalsifiable belief with another**: name the exact handles as the second search and say that two
empty results settle it, so an agent on a host where the capability is genuinely gated off can reach
"there is none" and be believed — by itself as much as by its reader. That keeps §9's "name the capability, not the handle"
intact, because a recognition test is not a handle: it is what makes the capability identifiable on a
host whose handle you cannot know.

**The heading scan is a shortlist in BOTH directions, and the rollout that trusted it proved it.**
A later pass read every skill in the same marketplace instead of only the scan's hits. About one in
five of the real workflows had never been shortlisted: their steps sat under `## The flow`, a
non-English "steps" heading, a numbered bold list or plain prose. The marker grep also had a false
positive. The authoring guide itself quotes both marker sentences, in its template and in prose about
them, so `grep -L` treated it as conforming although it has no runtime step list at all. Two rules
follow. **The inventory has to cover every skill, not the scan's output**, or "unlisted" silently
means "not a workflow". **And a conformance check has to ignore a marker inside a code fence or
backticks**, or any skill that *discusses* the block passes as one that *has* it.

## 10. Two capability checks that could only answer "no", and one that could only answer "yes" (§6)

**The self-confirming half.** Measured 2026-08-23 on a task skill backed by an MCP tool that the host
*defers*: nothing is in the tool list until a tool-search loads it, so the skill's check — *"if the
tool isn't in your tool list, fall back to the browser"* — answered "absent" on every run. Every
unattended run therefore fell through to a browser sign-in no unattended run can complete. The
reviewing agent's own verdict names why it lasted: **the failure read as a confirmation**, so the
check appeared to be correctly detecting a problem that was not there. Nobody debugs a check that is
agreeing with itself.

**The mirrored half, and the reason the rule insists on a date.** The same library's todo-tool
guidance ran the other way — it asserted the capability existed and offered no way to conclude
otherwise, so agents meeting a genuine absence were told they had not looked hard enough. On ONE
host that claim has been in three different states, which is the whole argument for stamping it:

| Measured | State |
| --- | --- |
| 2026-06 | present, but under unfamiliar handles and **deferred** — a search for the remembered name found nothing |
| 2026-08-23 (v2.1.241) | **absent by default** — 294 advertised tools and no todo tool in any permission mode; the vendor's opt-in environment flag returned 298 including the three handles |
| 2026-08-30 (v2.1.251) | **present again** — the same three handles advertised, on a host where that opt-in flag is enabled |

Nothing about the skill changed across those three rows; the host did. A rule written on any one of
them, undated, is wrong for two-thirds of its life — and each time it is wrong it converts a correct
agent into one that distrusts its own reading. Hence both halves of the ruling in §6: **make the
probe positive** (name the load step, and treat only an empty *load* as absence), and **give the
absence a floor** (two empty probes settle it, and that is a fact about the host, not the agent's
mistake) — then date the row so the next reader knows to re-measure rather than to obey.

## 11. Distance to the action — the external measurement behind §2's safeguard rule (§2)

Anthropic, «An alignment assessment of recent cybersecurity incidents» (2026-09-09): a scope reminder
placed **last in context** stopped the behaviour **90%** of the time; the *same* reminder inserted
**three turns before** the action stopped it **40%** of the time. That is a measurement on models taking
harmful actions in a CTF setting — **it does not establish** any particular rate for agents reading a
`SKILL.md`. Carry it as an order of magnitude and an argument for putting the safeguard at the step.

The in-library shape it justified: a browser-automation skill repeats a one-line warning about a scroll
call that silently does nothing at the step where the call is made, and keeps the full measurement once,
hundreds of lines below — saying in the file that the distance is why the line is repeated. A long
workflow skill does the same for a keep-alive cadence its middle steps would otherwise drift past.

## 12. "The doctor will rightsize it" — what the host command actually did (§3)

The vendor post announcing the Claude 5 practices said `/doctor` applies them to skills and memory
files. Run, it gave an *installation* checkup. What existed was a separate skills view — on Claude Code
2.1.226 a `/skill-doctor`, "which loaded skills are unused and costing context", already folded into
the usage screen (checked 2026-08-11). Useful for finding skills nobody triggers; **it does not
establish** anything about a skill's prose, and it shortened nothing.

## 13. Measurements obeyed past their boundary (§8)

Two shapes, both measured in one window:

- A session concluded "images do not render on this host at all" from **one** failed page; a later run
  went blind for a whole session on that line.
- A `curl` refusal on one host became "the GitHub API does not work", when the true scope was *this
  host, this tool, and not the same on the next session*.

Neither claim was false about what was observed; both were read at their widest.

## 14. A fix that bound one step, and the same 400 from the next (§8)

On a long workflow skill (2026), a step that posts to an API grew a correct, emphatic ⚠️ that one
request field is mandatory — in **that step only**. A later step in the same file still said "paste the
contents into a comment" and named neither the field nor the endpoint. Agents kept hitting the
identical 400 from the second step; the run that finally diagnosed it put the cost plainly: the same
bug, from the same instructions, will simply happen again. A grep of the file for the endpoint name
would have listed both steps.
