---
name: deep-research
description: >-
  Convene a multi-vendor research council — drive the user's own logged-in ChatGPT and Gemini web
  UIs in a browser, cross-examine their answers anonymously, and write a chairman's brief with
  verified sources. Use when the user asks for deep or outside research on a contested or
  high-stakes question across several models — "get a second opinion from other models", "ask
  ChatGPT and Gemini", "cross-check with other AIs", "run a council", «зроби рісерч з іншими
  моделями», «спитай інші моделі» — or when a decision is expensive to get subtly wrong. On a bare
  "deep research this", offer the council beside the host's single-agent research tool. Not for a
  quick factual lookup, a second opinion on code in front of you, or a video's content (that's
  `watch-video`). Needs a browser profile signed in to the vendors; spends paid quotas, so it runs on
  an explicit ask and proposes otherwise.
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

## When to run it — and the consent it needs

**A council spends the user's paid quotas and real time** (Quick ≈10 min · Standard ≈20–30 min · Deep
Research ≈75–120 min). So:

- **An explicit ask for other models** ("second opinion", "council", "ask ChatGPT and Gemini",
  "cross-check with other AIs") → it runs. A bare "deep research this" is not that ask when the host
  has its own single-agent research tool: offer the council in one line as the multi-model option, and
  run whichever the user picks. What scales with the topic is the **depth tier**, never whether the council happens —
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
have none) cannot run it at all — say so. A choice that blocks the run (a login, scope you cannot
settle): ask where the host can ask; where it cannot, put the choice in your report and stop. A
choice that does not block: state the assumption you made and continue.

## Step 0 — register the run

Register these as todo items now, before doing anything else, in whatever todo/plan tool this host
gives you — and while work remains keep exactly one in progress:
1. Pre-flight — browser connected, each vendor logged in (avatar seen), banners dismissed
2. Pre-flight — read each tier and set the mode (ChatGPT High by default; Gemini Pro or Thinking)
3. Phase 0 — topic-safety pre-check (and AUP rephrasing where the topic needs it)
4. Phase 0 — frame, council size, depth, output format; write `00_question.md`
5. Phase 1 — self-grounding note `01_self_grounding.md`
6. Phase 2 — Stage 1 prompt to every member; save each `02_*_round1.md` as it lands
7. Phase 2 — diagnose Round 1 (it decides whether Phase 3 runs)
8. Phase 3 — deliberation round (conditional)
9. Phase 4 — Chairman synthesis into `brief.md`
10. Phase 4 — verify every load-bearing citation; drop the unverified
11. Phase 4 — pre-handoff check, all five lines (name each in the close)
12. Phase 5 — output and handoff
13. Phase 5b — operationalize time-bound recommendations (conditional)
Register the conditional steps too: one a branch makes moot is completed WITH THAT REASON, never left
open (a pre-flight that finds no browser completes 2–13 with that reason). No such tool? SEARCH for one
first — on hosts with deferred tools it exists but is not loaded, and its name differs per host;
anything that creates items and marks them in progress and completed IS that tool. It must be the
SESSION's own planner, never an external tracker. If there truly is none, keep the list in your
replies and account for every item at the end. Invoked from another workflow, these items ADD to the
caller's list; the calling item stays open until your last one closes.

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
5. **Read the tier and pick the mode — the two vendors' "Pro" mean different things** (verified as of
   2026-09; layouts change, trust the current screen for WHERE the control is):
   - **ChatGPT:** default to the strongest thinking model at **High** reasoning effort, not the
     heaviest "Pro" setting — Pro hung for hours in one measurement (`references/landmines.md`), so
     re-test it before relying on it. If a run stalls, re-ask at High in a fresh chat.
   - **Gemini:** **Pro** is a *model* here, and the right pick for technical/research questions; the
     thinking model for prose-heavy ones. Deep Research is a separate toggle, not a model.
   - **A free tier on either vendor** → no council on it: search and model choice are too limited.
     Tell the user, and run with the other vendor only if they agree.

   Read `references/ui-tactics.md` before Phase 2: tier tables, the click-paths for Search and Deep
   Research, and the extraction snippets.

## Phase 0 — Frame and confirm

1. **Restate the question** in one or two sentences; surface ambiguity.
2. **Topic-safety pre-check — narrow scope.** Stop and reframe only when the *content itself* is
   policy-relevant: operational weapons/CBRN detail; drug synthesis or dosing how-to; working malware,
   live exploits, phishing; fabricated quotes from named public figures; self-harm methods; any sexual
   content involving minors; targeted attack research on a specific living person. Then offer the user:
   (1) reframe to a legitimate angle ("the policy debate around X", "high-level threat modelling"),
   (2) members only, no Chairman synthesis, or (3) drop the council for a primary source (a doctor, a
   lawyer, a security professional).
   **Do NOT pre-reject benign topics on a hunch** — tax, legal, financial, medical-information and
   immigration questions are normal council material. For those, read `references/AUP_TRIGGERS.md`
   before drafting the prompt: it covers the four categories a usage-policy classifier most often
   misreads and five rephrasing rules ("trends in X" not "procedure for X"; understand the form, don't
   ask how to fill it "so that…").
3. **Council size** — ChatGPT + Gemini by default; add Claude.ai only when the stakes justify the time.
4. **Depth** — **Quick** (chat answers, no cross-review, ~10 min) · **Standard** (default: chat answers
   + one cross-review round + synthesis, ~20–30 min) · **Deep Research** (DR mode on both, 1–2 rounds,
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

Pose the same question to every member in fresh chats, in parallel. Don't sit and wait: set the user's
expectation on timing and check back. **Keep the session alive while you wait.** A Deep Research
council outruns an hour by design and its middle is pure waiting, so if your host or task system ends
sessions that go quiet, send its liveness ping at every poll of a pending answer, in this phase and
every later one, roughly every 15 minutes. A swept session loses the whole council.

**In Deep Research mode the vendors may talk back before they start**: ChatGPT can ask clarifying
questions and Gemini can show a research plan to approve. Answer or approve only what
`00_question.md` already settles; anything else is a question for the user, not a guess.

### Sending the prompt

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
raises usage-policy risk ("one AI driving another through a non-standard channel"), and stacking three
or more reliably triggers a refusal. **After any usage-policy refusal in this run, skip it entirely** —
on one sandboxed host a refusal blocked every later page-script call for the rest of the run;
ask the user to paste instead. Otherwise use it once, only if 1–4 all failed — and if it fails too, ask the user to paste.
📖 Rationale and snippets → `references/prompt-delivery.md`.

### Capturing responses

- **Read the LAST answer element only** (last `div.markdown` on ChatGPT, last `model-response` on
  Gemini): a page script returning that element's `textContent`, or the host's page-text read when it
  can be scoped to an element. A whole-page read mixes in every earlier turn. Generic reads lie: `body.innerText` truncates and freezes mid-stream, and
  a role-attribute selector can return only the citation chips of a complete answer. A suspiciously
  empty read is a claim about the instrument until a second instrument agrees.
- **ChatGPT Deep Research renders in a cross-origin iframe** (as of 2026-08) — no script can read it. Expand the report
  to fullscreen, triple-click inside it, select all, copy, and read the clipboard.
- **Completion:** on ChatGPT chat, length stable ~10 s and no Stop button is workable. **ChatGPT Deep
  Research** is done when the "Research completed in…" header appears above the report; page length
  is useless there (the iframe keeps it flat). **On Gemini, neither
  length nor the Stop-button selector can be trusted** — judge from the text of the last answer itself.
- **Long dumps get filtered** — some browser bridges block chunks that look like `key: "value"` code and
  cap each return at ~1.5 KB: store the text in a page variable and pull slices of ≤1 000 characters
  for Latin text, ≤700 for non-Latin (2 bytes a character).
- **Gemini A/B tests** ("Which response is more helpful?") hide two answers — capture both, attribute
  them separately, and feed their contradiction into Round 2.

**Write each response to disk the moment it lands** (`02_chatgpt_round1.md`, `02_gemini_round1.md`) —
no paraphrasing into chat first. The disk file is the source of truth.

### Diagnose Round 1 before going on

- **Both substantive** (≳1 500 chars, specific) → Phase 3.
- **Both brief** (≲1 000 chars, conversational, echoing the framing) → either the topic is too soft for a
  council (skip Phase 3, synthesize) or the prompt was too open (go straight to a sharp adversarial
  Round 2 — the pushback becomes the content-generating step). Don't pretend a thin Round 1 was
  substantive.
- **Asymmetric** → the substantive answer is the spine; push the brief one with its specific points.

## Phase 3 — Stage 2: anonymous cross-pressure

**Decide first whether a round is worth it:** real disagreement on a load-bearing claim → run it;
stylistic difference only → skip, and note the unanimity in the brief (flag it if it looks suspicious);
one member much weaker → push only that one with the stronger one's points.

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
**frame as a challenge**, not an invitation; **one round by default**. Save `03_*_round2.md` at once. The Phase 2 keep-alive applies to every wait here
too.

**Stop after one round** when you see explicit position change, convergence on a merged answer, hardened
disagreement (present it as such — a third round won't move it), or fake convergence (stop and flag it
as performative). Honest disagreement is more useful than forced consensus.

## Phase 4 — Stage 3: Chairman synthesis

The synthesis is your read of the council, not a vote. **Synthesize from the files on disk**, not by
re-reading the browser. Use the template in `references/brief-template.md` for `brief.md`: header
(question, council, DR, rounds, date) · tl;dr · agreed · disagreed and converged · what the Chairman
checked or pushed back on · recommendation · open questions · sources (verified only).

**Chairman discipline:**
- **Verify every load-bearing citation** with your own search; both members hallucinate sources,
  and DR footnotes that misquote their page or point at nothing have turned up in past runs. Open each
  URL and find the quoted claim on it; `link-rot-checker`, if installed, checks that a list of links
  is live. Drop the unverified — an empty source list beats a wrong one.
- **Disagree with the council when you have grounds**, and say so; don't launder consensus.
- **Don't smuggle your prior in** — if your self-grounding note was wrong, say that.
- **Keep it lean** — 1–2 dense pages.

**Pre-handoff check** — before Phase 5, confirm each line and fix what fails:
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
└── brief.md                ← Stage 3 — the headline
```

## Usage-policy refusals

**Diagnose the flavour first.** A refusal in the first 3–4 tool calls is **substance-side** — the
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
- **Gemini carries memory from the account's past chats; a fresh ChatGPT chat is sterile** — verify
  Gemini's extra specificity, or tell it to ignore prior context.
- **ChatGPT may load a degraded fallback UI** whose editor is wiped when the real app hydrates — wait for
  the real editor before typing.
- **On some browser bridges (as of 2026-09) typing goes to the foreground tab whatever tab you
  named**, and right after navigation it can drop characters while reporting success — focus the target tab and read the composer back before Send.
- **Submit on Gemini by clicking coordinates from a screenshot taken after the text is in place** —
  the method that worked when Enter and element-reference clicks no-op'd (one host, 2026-08). A Send button stuck after Stop → reload the
  conversation URL and re-send.
- **Record every conversation URL as you create it**; recover a lost tab by navigating back, never by
  re-asking.
- **ChatGPT DR can fail mid-flight after 30–60 min** — change model → try again → start, once. A second
  failure: tell the user before spending more quota.
- **Quota exhausted** → say so; run DR on the other vendor or wait. Never quietly downgrade to chat mode
  and still call it a DR council.
- **Long-idle tabs drop their connection** and the answer stalls — scroll the answer area, or reload the
  conversation URL (history is kept).
- **Gemini can hang on "continue" turns** — synthesize from what you have and note the partial coverage.
- **Page-script calls have a ~45 s cap** on some browser bridges — keep each under ~25 s; after a timeout
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
- `references/landmines.md` — the measured case behind each landmine above. Read when one bites, or
  before you trust a workaround that contradicts a line here.
