# UI Tactics — ChatGPT & Gemini web operation

> **UI language.** Control labels are given in English. A localized UI shows them translated, so
> match a control by its position and role first; labels also drift between releases.

The how-to for driving `chatgpt.com` and `gemini.google.com` with a browser-automation tool. Read it
before Phase 2. The dated measurements behind these steps live in `landmines.md`; this file says what
to do. Layouts change every few months: trust a fresh screenshot over a description here.

## Table of contents

1. Verifying login state
2. ChatGPT — the reasoning-effort control
3. Gemini — the model picker
4. Enabling Search vs Deep Research
5. Capturing responses (last answer element; clipboard for ChatGPT DR)
6. Bridge content filter — what triggers it and how to work around
7. Recovery from stuck states
8. Round 2 challenge prompt — why the template is worded as it is

---

## 1. Verifying login state

Don't trust the absence of a login form as proof of login. ChatGPT shows a usable-looking chat UI to
anonymous visitors, with `Sign in` / `Sign up for free` in the top-right and `Log in` at the bottom of
the sidebar, and an accessibility-tree read reports a "profile menu" button either way.

**Verify by the account itself** (as seen 2026-11-14):
- **ChatGPT:** the account avatar sits at the bottom of the left sidebar, and there are no `Sign in` /
  `Sign up` buttons anywhere. Open the account menu to read the name and plan when you need the tier.
- **Gemini:** the Google account avatar sits at the bottom of the left rail, and the model picker in
  the composer offers paid models. A signed-out page offers a `Sign in` button instead.

In both cases confirm the account is the USER's (the name in the account menu), not another person's
profile on a shared browser. If anonymous on either platform, **stop and tell the user**. Never try to
log in.

## 2. ChatGPT — the reasoning-effort control

Seen 2026-11-14: the composer shows the current effort as a word (`Medium`, `High`, …). Clicking it
opens a small popover with a "reasoning effort" slider of several steps, plus a link to more models.
The setting persists into new chats in the same browser, so set it once per session.

**Council pick: the strongest thinking-capable setting at High**, not the heaviest `Pro` option (the
ruling is SKILL.md pre-flight step 5; the measurement is in `landmines.md`).

A **free** account offers no real choice and limited search: don't run the council on it; tell the user.

Web search is on demand in the thinking modes (the model decides when to search), which is fine for
the council. To force it on, use the tools menu (§4).

## 3. Gemini — the model picker

Seen 2026-11-14: the composer has a model picker whose entries are named by **task** (quick answers,
everyday help, detailed research, code and analysis, and a top "hardest tasks" entry that may be
locked), each showing the model behind it, plus a separate **reasoning level** submenu. Entries and
model names rotate between releases.

**Council pick:** the entry meant for detailed research, or for code and analysis on a technical
question, at the highest reasoning level offered. Take the top entry when the account unlocks it. A
**free** account (only the fast entries) → no council on Gemini; tell the user.

Grounding (web search) is on by default in the research-grade entries, so chat-mode council needs no
separate toggle.

## 4. Enabling Search vs Deep Research

### ChatGPT

- The `+` button to the left of the composer opens the tools menu.
- `Search the web` forces search for the next reply.
- `Deep research` switches the next reply to DR mode. ChatGPT may ask 1–3 clarifying questions before
  it starts: answer only what `00_question.md` already settles; anything else is the user's call
  (SKILL.md Phase 2).

### Gemini

- Deep Research is a **tool**, separate from the model picker: select it before sending. It sat under
  the composer's tools control in 2026-08; the 2026-11-14 check did not open that menu, so find it by
  role on today's screen.
- Gemini may show a research plan to confirm first: approve or edit only what `00_question.md`
  already settles; any other change to the plan is the user's call.

Timing: a single vendor's DR answer took 5–30 minutes on paid tiers (2026-08); on ChatGPT Plus it can
take over an hour and fail mid-flight (§7). The body's ≈75–120 min is the whole DR council. Don't wait
synchronously: check back with a read at each keep-alive ping.

## 5. Capturing responses

Read the **last answer element**: the last `div.markdown` on ChatGPT chat, the last `model-response` on
Gemini. Never `body.innerText` and never `[data-message-author-role]`: both have returned a confident
partial read of a complete answer (`landmines.md`).

### 5a. Store once, read in slices

```js
// Run once when the answer is complete.
const nodes = document.querySelectorAll('div.markdown, model-response');
window._raw = nodes[nodes.length - 1]?.textContent ?? '';
window._raw.length;
```

On a Gemini A/B test the two variants are both in the DOM: `document.querySelectorAll('message-content,
model-response')` returns them, so store each variant separately rather than the last node only.

Then return `window._raw.slice(a, b)` in windows of ≤1 000 characters for Latin text and ≤700 for
non-Latin (the bridge caps each return at ~1.5 KB, and non-Latin text is 2 bytes a character). If a
slice comes back with a `[TRUNCATED]` marker, take the next slice from where the unmarked text ended.
For a 40k+ answer, first map the offsets of its section headings and pull the load-bearing sections.
Write the assembled text to disk at once and synthesize from the file.

**Completion:**
- **ChatGPT chat:** length stable ~10 s and no Stop button.
- **Gemini:** neither length nor the Stop-button selector can be trusted. Read the last
  `model-response` and judge from its text.
- **ChatGPT DR:** the header "Research completed in …" appears above the report card, the planning
  card's progress bar disappears, and the stop square becomes an expand icon. Page length is useless:
  the report is in an iframe (§5b).

### 5b. ChatGPT DR — clipboard extraction

The DR report renders inside a cross-origin iframe (`<iframe title="internal://deep-research">`, seen
2026-08). No page script can read it. Instead:

1. **Expand the report to fullscreen** by clicking in the middle-left of the visible report text (not
   the header icons, which are easy to miss-click).
2. **Focus inside the iframe** by triple-clicking a paragraph of the report.
3. **Select all and copy** as key presses (`cmd+a`, `cmd+c` on macOS; `ctrl+a`, `ctrl+c` elsewhere).
4. **Read the clipboard** with the host's clipboard capability (on a host with app-level permissions,
   grant clipboard read for the browser first).

If the clipboard returns the **prompt**, the focus was on the outer page: triple-click inside the
report again. The text arrives plain (headings as plain lines, footnotes as `[1]`). Save it straight to
`02_chatgpt_round1.md`.

## 6. Bridge content filter — patterns that get blocked

Some browser bridges return `[BLOCKED: Cookie/query string data]` when a page-script result looks like
cookies or query parameters: anything dense in `key=value` or `key: "value"`, such as object literals,
URLs with query strings, JSON, config-style code and long `attribute="value"` lists.

Workaround: slice smaller. If a slice is blocked, halve it until you find the offending range, skip
just that range and stitch around it; prose outside code blocks is almost always clean. If a slice
keeps getting blocked, read the same last-answer element with the host's page-text read instead (it
travels by a different path). Don't try to defeat the filter by encoding (base64, shuffling): that is
blocked too.

## 7. Recovery from stuck states

### Gemini — submit button stuck in "Stop response"

Symptom: the stream is done, but the button still shows the stop icon and a new prompt won't submit.
Usually caused by pressing Stop just as the answer finished.

1. Navigate to the same conversation URL (`https://gemini.google.com/app/<conversation-id>`); history
   is kept server-side.
2. Re-send by the delivery order in SKILL.md «Sending the prompt», clipboard first. Its rules for the
   page-script fallback apply unchanged.
3. Submit by a **coordinate click** on the Send button, from a screenshot taken after the text is in
   place: Enter and element-reference clicks have no-op'd here.

### ChatGPT — anonymous session that looks logged in

A page read reports a profile button and the composer works, but `Sign in` / `Sign up for free` show
in the top-right. Stop and ask the user to sign in: search and the thinking modes are restricted.

### ChatGPT DR — "Research failed"

Symptom: after 30–60 min the report card is titled "Research failed" and every plan item is
unchecked.

1. Click the **"Change model"** icon in the action row below the card (a circular-arrow icon). A
   popover offers **"Try again • <current model>"**.
2. Click **"Try again"**; ChatGPT shows the original plan with "Edit", "Cancel", "Start".
3. Click **"Start"**.

Retry **once**. If the retry fails too, stop and tell the user: never a second retry without their
approval.

### Generic — a long DR tab that seems to stall

1. Take a screenshot: the answer may be complete with a stuck Stop button.
2. Scroll inside the answer area to force a render.
3. **Navigate to the same conversation URL**: if the run finished or moved on server-side, the
   reload shows it (a dropped websocket freezes the counters while the server keeps working).
4. Still running after the reload → wait; ChatGPT DR on Plus can spend 20+ minutes writing citations
   with no visible change.

## 8. Round 2 challenge prompt — why the template is worded as it is

The template lives once, in SKILL.md Phase 3. Three properties earn their keep:

- **"another expert"**: generic, no model-name giveaway. It is what breaks sibling sycophancy.
- **"Where do they go wrong"**: assumes an adversary, not a peer, and forces engagement.
- **"If you change your earlier position, say so explicitly"**: lets the model reverse without losing
  face. In the runs this skill was built from, explicit position changes appeared only with this line present
(a few councils, not a controlled comparison).

When quoting one member to the other, remove what identifies the source:
- each vendor's house style: its signature hedges, verdict labels ("100% correct", a bolded
  "**Verdict**"), and any reference to its own tools or modes;
- jargon one member coined that the other never used.

The pushback carries the *content* of the other model's argument, not its voice.
