---
name: deep-research
description: >-
  Put one question to ChatGPT and Gemini through the user's own logged-in web UIs, cross-examine
  their answers anonymously, and write a chairman's brief with verified sources (an LLM council).
  Use whenever the user wants OTHER AI models' views, even on a plan, claim or document in front of
  you: "second opinion from ChatGPT and Gemini", "what do other models think", "ChatGPT's and
  Gemini's take on this", "have several AIs debate", "cross-check with other AIs", "run a council",
  «спитай інші моделі», «зроби рісерч з іншими моделями»; and on a bare "deep research this", to
  offer the council beside the host's own deep-research tool. Not for a quick lookup, a review by
  you alone, reading one web page, or a video (`watch-video`). Needs a browser signed in
  to both vendors; it spends their paid quotas, so it runs on an explicit ask and only proposes
  otherwise.
---

# Deep research — an LLM council

Pose one question to ChatGPT and Gemini (and optionally Claude.ai) through their **web UIs** — where
the user's paid models, search and Deep Research modes live — then cross-examine them anonymously and
write the synthesis yourself as **Chairman**. Inspired by
[karpathy/llm-council](https://github.com/karpathy/llm-council): the same Stage 1 / Stage 2 / Stage 3
shape, adapted from an API to the browser.

A single model's answer is one sample from one distribution: you don't see its disagreements, its
uncertainty, or where it is bluffing. Independent voices surface those; the brief records them. Most of
this skill is **operational discipline** — when to go deep, how to anonymize cross-review so the models
don't compliment each other, when to stop, how to recover when a UI misbehaves.

Reply in the user's language.

(Length: ~380 lines because it is a 15-step workflow whose branch conditions must stay inline; each
step's depth is in `references/`.)

## When to run it — and the consent it needs

**A council spends the user's paid quotas and real time** (the timings per depth tier are in Phase 0 step 4). So:

- **An explicit ask for other models** ("second opinion", "council", "ask ChatGPT and Gemini",
  "cross-check with other AIs") → it runs. A bare "deep research this" is never that ask: offer the
  council in one line as the multi-model option (beside the host's own deep-research tool, if it has
  one) and run whichever the user picks. What scales with the topic is the **depth tier**, never whether the council happens —
  don't quietly downgrade an explicit ask to a solo web search.
- **No explicit ask, but the question is hard** — experts disagree, being subtly wrong is costly, or
  the topic post-dates your knowledge → **propose** the council (one line: why, which tier, how long)
  and run it on a yes. A user who has told you to convene it on your own judgement has given that yes
  in advance; say in the report that you did.
- **Quick factual lookups, conversational asks, or the user already has a firm view** → answer
  directly; no council.

**Unattended run? Check before you skip.** "Nobody is watching" does not mean "no browser" — scheduled
environments often carry a logged-in browser. Run the pre-flight first and decide on what you find:
browser present and both vendors logged in → run the council as you would interactively; browser
absent or a login expired → stop, report it as such ("the council needs a logged-in browser; this run
had none — run it from a browser session, or settle for a quick search?") and never silently fall back
to a solo search. **Record every skip** in one line with its reason.

**Host differences.** The workflow needs a browser-automation tool with access to a signed-in profile
and, for some steps, the host's clipboard. Hosts without browser automation (some coding-agent hosts
have none) cannot run it at all — say so. Its trigger runs so far are Claude Code only; Codex routing
is untested (`references/trigger-tests.md`). A choice that blocks the run (a login, scope you cannot
settle): ask where the host can ask; where it cannot, put the choice in your report and stop. A
choice that does not block: state the assumption you made and continue.

## Step 0 — register the run

Register these as todo items now, before doing anything else, in whatever todo/plan tool this host
gives you — and while work remains keep exactly one in progress:
1. Pre-flight — the browser-automation tool is connected
2. Pre-flight — each vendor logged in, by avatar, on the USER's account; banners dismissed
3. Pre-flight — read each tier and set the mode (ChatGPT High by default; Gemini's research-grade model)
4. Phase 0 — topic-safety pre-check (and AUP rephrasing where the topic needs it)
5. Phase 0 — frame, council size, depth, output format settled (asked where unclear, else assumed and stated)
6. Phase 0 — `00_question.md` written (the first checkpoint)
7. Phase 1 — self-grounding note `01_self_grounding.md`
8. Phase 2 — Stage 1 prompt to every member (name each in the close: what was left out of it, read-back
   before Send, conversation URL recorded, Gemini told to ignore prior context, `02_*_round1.md` saved)
9. Phase 2 — diagnose Round 1 (it decides whether Phase 3 runs)
10. Phase 3 — deliberation round (conditional)
11. Phase 4 — Chairman synthesis into `brief.md`
12. Phase 4 — verify every load-bearing citation; drop the unverified
13. Phase 4 — pre-handoff check, all five lines (name each in the close)
14. Phase 5 — output and handoff
15. Phase 5b — operationalize time-bound recommendations (conditional)
Register the conditional steps too: one a branch makes moot is completed WITH THAT REASON, never
left open — an unfinished list at the end must mean something really is unfinished.
No such tool? SEARCH for one first — on hosts with deferred tools it exists but is not loaded, and
its name differs per host. Anything that creates items and marks them in progress and completed IS
that tool, whatever it is called. Search by that capability, then by any name you remember: one empty
result is evidence about the name; two are a real absence on this host — say so plainly, it is not
your mistake. It must be the SESSION's own planner, never an external tracker (Jira, Linear, a task
app): your bookkeeping is not their backlog. If there truly is none, keep the list in your
replies — state it once, name each item as you start it, account for every one at the end.

A pre-flight that finds no browser completes 2–15 with that reason. Invoked from another workflow,
these items ADD to the caller's list; the calling item stays open until your last one closes.

## Pre-flight (≤ 2 minutes, never skip)

1. Confirm the browser-automation tool is connected — positively. On a host that defers tools, search
   for and load the browser and clipboard tools first; a capability is missing only when that load
   comes back empty. Two empty probes settle it as a fact about this host: say so, and don't improvise
   with a different kind of automation.
2. Open `https://chatgpt.com` and `https://gemini.google.com` in fresh tabs.
3. **Verify login by the avatar / account name, not by the absence of a login form** — ChatGPT shows a
   usable-looking UI to anonymous visitors. Anonymous on either → stop and ask the user to sign in.
   **Never sign in yourself.** If a second connected browser could drive a vendor, check whose account
   it is first — a council on someone else's account spends their quota.
4. Decline non-essential cookies and dismiss first-load banners.
5. **Read the tier and pick the mode** (seen 2026-11-14; layouts change, so trust the current screen
   for WHERE the control is):
   - **ChatGPT:** default to the strongest thinking model at **High** reasoning effort, not the
     heaviest "Pro" setting — Pro hung for hours in one measurement (`references/landmines.md`), so
     re-test it before relying on it. If a run stalls, re-ask at High in a fresh chat.
   - **Gemini:** the picker names its entries by task; take the one for detailed research (or code and
     analysis, for a technical question) at the highest reasoning level offered. Deep Research is a
     separate tool, not a model.
   - **A free tier on either vendor** → no council on it: search and model choice are too limited.
     Tell the user, and run with the other vendor only if they agree.

   Read `references/ui-tactics.md` before Phase 2: tier tables, the click-paths for Search and Deep
   Research, and the extraction snippets.

## Phase 0 — Frame and confirm

1. **Restate the question** in one or two sentences; surface ambiguity. Note which parts of the
   material are confidential: Phase 2 sends the prompt to two outside vendors.
2. **Topic-safety pre-check — narrow scope.** Stop and reframe only when the *content itself* is
   policy-relevant: the list in `references/AUP_TRIGGERS.md` § «When this reference can't save you»
   (weapons/CBRN detail, drug synthesis or dosing how-to, working malware or phishing, fabricated
   quotes from named people, self-harm or eating-disorder methods, any sexual content involving
   minors, targeted attack research on a specific living person). Then offer the user two options:
   (1) reframe to a legitimate angle ("the policy debate around X", "high-level threat modelling"),
   or (2) drop the council for a primary source (a doctor, a lawyer, a security professional). Never
   send the unreframed question to the members instead: asking other AIs for what you would not
   write yourself is the same request.
   **Do NOT pre-reject benign topics on a hunch** — tax, legal, financial, medical-information and
   immigration questions are normal council material. For those, read `references/AUP_TRIGGERS.md`
   before drafting the prompt: it covers the four categories a usage-policy classifier most often
   misreads and five rephrasing rules ("trends in X" not "procedure for X"; understand the form, don't
   ask how to fill it "so that…").
3. **Council size** — ChatGPT + Gemini by default; add Claude.ai only when the stakes justify the time.
   It runs under the same rules, with no recipe of its own here: verify its login by the account
   avatar, read its last answer the same way, and trust the current screen for where things are.
   It is the same model family as you, so weigh its agreement with you accordingly.
4. **Depth** — **Quick** (chat answers, no cross-review, ~10 min) · **Standard** (default: chat answers
   + one cross-review round + synthesis, ~20–30 min) · **Deep Research** (DR mode on both, 1–2 cross-reviews,
   full brief, ~75–120 min including a likely mid-flight retry). Tell the user the time up front so the
   run isn't killed early.
5. **Output** — a one-shot decision → a tl;dr plus a short brief; a topic they'll re-read → a full brief
   file; a procedure they'll repeat → propose turning it into a skill.

Ask before Phase 1 if anything is unclear — wrong scoping costs the most. Then immediately write
`<output>/council/<slug>/00_question.md` (framed question + scope): the first checkpoint, which survives
a refusal, a browser crash or an exhausted quota.

## Phase 1 — Self-grounding

Do your own pass — web search plus what you know — into `01_self_grounding.md`: the actual question,
what you think the answer is with a confidence per claim, and the 2–4 places you're most likely wrong.
**Do not feed this note to the council** — the point is to see what they bring without your framing.

## Phase 2 — Stage 1: the open question, in parallel

Pose the same question to every member in fresh chats, in parallel. **Record each conversation URL
as you create it** (a lost tab is recovered by navigating back to it, never by re-asking), and tell Gemini to ignore prior context:
it carries memory from the account's past chats. Don't sit and wait: set the user's
expectation on timing and check back. **Keep the session alive while you wait.** A Deep Research
council outruns an hour by design and its middle is pure waiting, so if your host or task system ends
sessions that go quiet, send its liveness ping at every poll of a pending answer, in this phase and
every later one, roughly every 15 minutes. A swept session loses the whole council.

**In Deep Research mode the vendors may talk back before they start**: ChatGPT can ask clarifying
questions and Gemini can show a research plan to approve. Answer or approve only what
`00_question.md` already settles; anything else is a question for the user, not a guess.

### Sending the prompt

**What leaves goes to two other companies.** The prompt, and any document or file you attach, is
stored by each vendor under the user's account and may be used under its terms. Before sending, strip
credentials, keys and tokens, other people's personal data, and anything the user marked private. When
the question cannot be asked without confidential material (an employer's code, a client contract,
someone's health record), say what would leave and send it only on the user's explicit yes, in this
session or in the request itself.

**Before any typing or paste, wait for the real editor (ChatGPT can show a fallback UI whose editor is
wiped when the app loads), focus the target tab, and read the composer back before Send.** On some
browser bridges typing lands in whatever tab is in front, and right after a navigation it can drop
characters while reporting success; either way a prompt can go to the wrong member or arrive mangled.

Both vendors use React-managed rich editors; setting a value programmatically does not reach them. In
order of preference:

1. **Clipboard + paste** (any length) — write the prompt to the clipboard with the host's clipboard
   capability, click the composer, send the paste keystroke (`cmd+v` / `ctrl+v`), then **re-read the
   Send button's position** (the box grows under long text) and click it.
2. **URL pre-fill — ChatGPT only**, for short prompts (≲1 300 non-Latin / ~2 000 ASCII chars; the URL
   limit is ~8 KB — as of 2026-08): `https://chatgpt.com/?q=<url-encoded>` pre-fills without submitting. ⚠️ It does
   **not** work on Gemini. Read the composer back before Send, and if the query string is still in
   the address bar, strip it with `history.replaceState({}, '', location.pathname)`.
3. **One paragraph with plain typing** — a prompt with **zero line breaks** typed into the composer
   works on both vendors (a `\n` submits early on ChatGPT and is swallowed on Gemini). Use section
   markers ("1)", "—") instead of line breaks. This is the path for a host where the clipboard and
   page scripts are unavailable.
4. **File upload** for multi-file context or very large prompts — write the prompt to a file the upload
   tool may read, upload it, type a one-line instruction.

**Fallback only:** injecting text with `execCommand('insertText')` from a page script. Each injection
raises usage-policy risk ("one AI driving another through a non-standard channel"), and a prior run
that used it landed on a usage-policy refusal (`references/prompt-delivery.md`). **Skip it entirely after any usage-policy refusal in this run, and
on a sandboxed cloud host** (a refusal there can block every later page-script call): ask the user to
paste instead. Otherwise use it once, only if 1–4 all failed — and if it fails too, ask the user to paste.
📖 Rationale and snippets → `references/prompt-delivery.md`.

### Capturing responses

The selectors, slice sizes, completion signals and the clipboard path for ChatGPT Deep Research are
in `references/ui-tactics.md` §5. The rulings:

- **Read the last answer element only**, through a page variable read in slices; never a whole-page
  read, which mixes in earlier turns, truncates and freezes mid-stream. A suspiciously empty read is a
  claim about the instrument until a second instrument agrees.
- **ChatGPT Deep Research cannot be read by any script** (it sits in a cross-origin iframe): copy it
  through the clipboard.
- **Judge completion per vendor**, not by one rule: on Gemini neither length nor the Stop button can be
  trusted, only the text of the last answer.
- **Gemini A/B tests** ("Which response is more helpful?") hide two answers: capture both, attribute
  them separately, and feed their contradiction into round 2 (on a Quick run, which has no round 2,
  weigh it in the synthesis instead).

**Write each response to disk the moment it lands** (`02_chatgpt_round1.md`, `02_gemini_round1.md`) —
no paraphrasing into chat first. The disk file is the source of truth.

### Diagnose Round 1 before going on

- **Quick tier** → skip Phase 3 and synthesize; complete item 10 with that reason. Otherwise:
- **Both substantive** (rule of thumb from past runs: ≳1 500 chars, specific; between that and the
  brief band, specificity decides) → Phase 3.
- **Both brief** (≲1 000 chars, conversational, echoing the framing) → either the topic is too soft for a
  council (skip Phase 3, synthesize) or the prompt was too open (go straight to a sharp adversarial
  Round 2 — the pushback becomes the content-generating step). Don't pretend a thin Round 1 was
  substantive.
- **Asymmetric** → the substantive answer is the spine; push the brief one with its specific points.

## Phase 3 — Stage 2: anonymous cross-pressure

**Decide first whether a round is worth it:** real disagreement on a load-bearing claim → run it;
stylistic difference only → skip, and note the unanimity in the brief (flag it if it looks suspicious).
An asymmetric Round 1 is handled in «Diagnose Round 1» above.

**Template** — quote 1–3 load-bearing points from one member (read the file from disk; 3–6 sentences
each, not the whole answer) into the other's chat:

```
Pushback from another expert reviewing the same question.
Engage with each — where do they go wrong, if anywhere? If they are right,
steelman the argument and tell me what to add to my recommendation. If they
are wrong, refute specifically with concrete reasoning.

Pushback 1 — [topic]:
"[their claim, ~3–6 sentences, stripped of vendor-identifying phrasing, as a confident assertion]"

Pushback 2 — [topic]:
"[same shape — one block per point, 1–3 in all]"

Where do these go wrong, if at all? Be specific. If you change your earlier
position, say so explicitly.
```

Rules: **anonymize** (never "ChatGPT said" — identity triggers sycophancy between sibling models);
**frame as a challenge**, not an invitation; **one cross-review by default**. Rounds are counted
overall: Stage 1 is round 1, the cross-review is round 2. A second cross-review (round 3) runs only in a
Deep Research council, and only when round 2 moved a member off a load-bearing position without
settling it (a new disagreement, not the old one restated). Save each answer at once
(`03_*_round2.md`, `04_*_round3.md`). The Phase 2 keep-alive applies to every wait here too.

**Stop after the cross-review** when you see a position change that settles the point, convergence on a
merged answer, hardened disagreement (present it as such — another round won't move it), or fake
convergence (stop and flag it as performative), unless the round-3 condition above holds. Honest
disagreement is more useful than forced consensus.

## Phase 4 — Stage 3: Chairman synthesis

The synthesis is your read of the council, not a vote. **Synthesize from the files on disk**, not by
re-reading the browser. Use the template in `references/brief-template.md` for `brief.md`: header
(question, council, depth, rounds, date) · tl;dr · agreed · disagreed and converged · what the Chairman
checked or pushed back on · recommendation · open questions · sources (verified only).

**Chairman discipline:**
- **Verify every load-bearing citation** with your own search; both members hallucinate sources,
  and DR footnotes that misquote their page or point at nothing have turned up in past runs. Open each
  URL and find the quoted claim on it; `link-rot-checker`, if installed, checks that a list of links
  is live. Drop the unverified — an empty source list beats a wrong one.
- **Disagree with the council when you have grounds**, and say so; don't launder consensus.
- **Don't smuggle your prior in** — if your self-grounding note was wrong, say that.
- **Keep it lean** — 1–2 dense pages.

**Pre-handoff check** — before Phase 5, confirm each line and fix what fails. With Bun available,
`bun run "<skill dir>/scripts/check-brief.ts" "<output>/council/<slug>/brief.md"` (`<skill dir>` is the
directory you loaded this SKILL.md from) checks the mechanical
part (sections, header fields, rounds against the files, a URL on every source; exit 1 = findings);
the source-content and judgement lines stay yours:
- every section of the template is present, or says why it is empty;
- every source in «Sources» was opened by you and carries the claim it is cited for;
- a unanimous council is flagged as such, with your read on whether it looks performative;
- each place you overruled the council names your grounds;
- the header states the real council, depth and rounds — a downgraded run is not called DR.

## Phase 5 — Output and handoff

Hand over `brief.md` the way your host hands over files, with a 3–5 sentence tl;dr in chat. Chat-only
request → the brief inline. Raw round files exist for audit; don't dump them unless asked.

**5b. Time-bound recommendations** ("before winter", "every quarter, check X"): offer to schedule a
reminder with whatever scheduler or task system the user has — offer, get a yes, then create it. A
council insight that isn't scheduled usually doesn't change behaviour.

## File layout

`<output>` is the host's working or output directory, the one it hands files back from.

```
<output>/council/<slug>/            ← <slug>: short kebab-case, < 50 chars
├── 00_question.md          ← the ask + scope, frozen after Phase 0
├── 01_self_grounding.md    ← your private pre-council note
├── 02_<member>_round1.md   ← Stage 1, raw
├── 03_<member>_round2.md   ← Stage 2, if used
├── 04_<member>_round3.md   ← a second cross-review, Deep Research only
└── brief.md                ← Stage 3 — the headline
```

## Usage-policy refusals

**Diagnose the flavour first** (a rule of thumb from past runs, not a measured threshold). A refusal
in the first 3–4 tool calls is **substance-side** — the
wording of what you asked; reframe it with `references/AUP_TRIGGERS.md`. A refusal 8–15 calls in, deep
in an extract/paste loop, is **pattern-side** — the hygiene below is the fix.

**Hygiene:** save extracted text to a file at once and read back only the slice you need; quote
selectively into cross-review prompts; never round-trip the same content (extract → quote → paste →
extract); keep injection out of the run (clipboard first); checkpoint to disk after every step; don't
paraphrase member output back to the user mid-run — "round 1 done, ~3 500 chars saved" is enough.

**When one fires anyway:** don't retry the same action; inventory what is on disk; tell the user plainly
what survived; then offer (a) a lightweight synthesis from the disk files plus search, no more browser,
(b) the raw files for them to read, (c) a narrower re-run of one phase, or (d) when refusals repeat
despite the hygiene above and the host has subagents, a re-run of Phases 1–4 inside one, where a
refusal costs the subagent rather than this session. If the same trigger repeats
across runs, record it in `references/landmines.md`.

## Other landmines (one line each — measured cases in `references/landmines.md`)

- **Sibling sycophancy** — GPT and Gemini can share the same wrong consensus; treat the other as an
  adversary to check, not a peer to respect.
- **Gemini's Send no-ops, or sticks after Stop** → `references/ui-tactics.md` §7 (click coordinates
  from a fresh screenshot; reload the conversation URL and re-send).
- **ChatGPT DR can fail mid-flight after 30–60 min** — change model → try again → start, once. A second
  failure: tell the user before spending more quota.
- **Quota exhausted** → say so; run DR on the other vendor or wait. Never quietly downgrade to chat mode
  and still call it a DR council.
- **Long-idle tabs drop their connection** and the answer stalls — scroll the answer area, or reload the
  conversation URL (history is kept).
- **Gemini can hang on "continue" turns** — synthesize from what you have and note the partial coverage.
- **Page-script calls have a ~45 s cap** on some browser bridges (2026-08) — keep each under ~25 s; after a timeout
  re-run only what didn't complete.
- **Login expiry mid-run** → stop and ask the user; never re-authenticate yourself.

## What this skill is not

- Not a replacement for a domain expert when the question needs one — the brief says "ask a
  [doctor / lawyer / …]" when that is the right next step.
- Not a decision-maker: the brief informs; the user decides.
- Never a way to move money, trade, or take any irreversible action — whatever the council recommends.
- Not a video reader: when a source is a video, `watch-video`, if installed, gets its content.

## Bundled resources

- `references/ui-tactics.md` — per-vendor tier tables, Search/DR click-paths, extraction snippets. Read
  before Phase 2.
- `references/prompt-delivery.md` — why clipboard first, the file-upload steps, the injection snippet.
  Read when the default delivery fails.
- `references/AUP_TRIGGERS.md` — wording that trips usage-policy classifiers on benign legal, tax,
  medical and form-filling topics, and how to rephrase. Read before drafting a prompt on those topics.
- `references/brief-template.md` — the brief's exact structure. Read at Phase 4.
- `scripts/check-brief.ts` — the mechanical half of the pre-handoff check (Bun; read-only).
- `references/landmines.md` — the measured case behind each landmine above. Read when one bites, or
  before you trust a workaround that contradicts a line here.
- `references/trigger-tests.md` — the prompts that should and should not load this skill, and the
  run record. Read when you change the description.
