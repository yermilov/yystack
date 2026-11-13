# UI Tactics — ChatGPT & Gemini web operation

> **UI language.** Control labels are given in English. A localized UI shows them translated, so
> match a control by its position and role first; labels also drift between releases.

Operational details for driving `chatgpt.com` and `gemini.google.com` with a browser-automation tool. Read it before Phase 2. UI layouts shift every few months — always trust a fresh screenshot over what's written here.

## Table of contents

1. Verifying login state
2. ChatGPT — model picker by tier
3. Gemini — model picker by tier
4. Enabling Search vs Deep Research
5. Capturing responses (last answer element; clipboard for ChatGPT DR)
6. Bridge content filter — what triggers it and how to work around
7. Recovery from stuck states
8. Round 2 challenge prompt — why the template is worded as it is

---

## 1. Verifying login state

Don't trust the absence of a login form as proof of login. ChatGPT in particular shows a usable-looking chat UI when anonymous, with `Sign in` / `Sign up for free` buttons in the top-right and `Log in` at the bottom of the sidebar. An accessibility-tree read will report a "profile menu" button regardless — that button might just be the sign-in trigger.

**Verify by avatar / username:**
- ChatGPT logged-in: the bottom-left of the sidebar shows the user name + plan tier (e.g., "<User Name> / Plus"). The top-right has *no* `Sign in` / `Sign up` buttons.
- Gemini logged-in: the top-right has a Google account avatar and `PRO` / `ULTRA` badge. The page greets the user by first name, in the account's language ("Hello, <name>").

If anonymous on either platform, **stop and tell the user**. Never try to log in.

## 2. ChatGPT — model picker by tier

**What the control looks like depends on the account and the month.** Measured 2026-08 on a Pro account: the composer shows the current effort as a word (`Pro`, `High`, …) and clicking it opens a reasoning-effort SLIDER — there was no separate model menu (`landmines.md`). The table below is an older reading of a model picker, kept for accounts that still show one. Either way the target is the same: the strongest thinking-capable setting at **High** effort, by default not the heaviest `Pro` option. Find the control by its role; layouts move.

| Tier | Picker shows | Council pick |
|------|--------------|--------------|
| Free | `Auto` only (no choice) | Don't run council on free tier — Search is unreliable. Tell the user. |
| **Plus** | `Instant` (everyday), `Thinking` (complex) | **`Thinking`** |
| **Pro** | `Instant`, `Thinking`, plus heavier `Pro` options (labels rotate) | **`Thinking` at High effort.** ⚠️ Not the heaviest `Pro` option — measured hanging ~2.5 h with no output on council prompts (2026-08-22, `landmines.md`) |

Tier label is visible at the bottom of the left sidebar under the user name (`Plus`, `Pro`, etc.). Take a screenshot if uncertain — model labels rotate every few months.

**Default behavior in Thinking modes:** Web search is on-demand by default — the model decides when to search. For the council, this is fine. To force search-on, use the tools menu (see §4).

## 3. Gemini — model picker by tier

The right side of the prompt input has a mode dropdown. Default label: `Thinking` or `Pro` depending on what was last selected.

| Tier | Dropdown contents | Council pick |
|------|---------------------------|--------------|
| Free | `Fast`, maybe `Thinking` | Don't run council — limited capability. |
| **Pro** | `Fast`, `Thinking` (the reasoning mode), `Pro` (the strongest model, tuned for math and code), an Ultra entry (locked, requires upgrade) — as of 2026-09 | **`Pro`** for technical/research/code questions. **`Thinking`** for prose-heavy, conceptual, social-science, or general-knowledge topics. |
| **Ultra** | Adds higher-tier models | Pick the highest-tier reasoning model available; compare to `Pro` if uncertain. |

Note: on Gemini, "Pro" is a **mode label**, not the same thing as the subscription tier (also called "Pro"). The dropdown shows mode options regardless of subscription. The `Pro` mode is positioned (as of 2026-09) for "complex math and coding" — accept that framing, it's accurate.

**Grounding (web search) is on by default in Pro and Thinking.** No need to toggle separately for chat-mode council.

## 4. Enabling Search vs Deep Research

### ChatGPT

- The `+` (paperclip-plus) button to the left of the chat input opens the tools menu.
- Toggles relevant for the council:
  - `Search the web` — explicit search-on for the next reply.
  - `Deep research` — switches to DR mode for the next reply. ChatGPT may ask 1–3 clarifying questions before kicking off; answer only if obvious from the original ask, otherwise pause and confirm with the user.

### Gemini

- The `Tools` chip below the prompt input toggles tools.
- The `Deep Research` chip (sometimes also under `Tools`) is a separate toggle from the model dropdown — pick it before sending. Gemini may produce a research plan first and ask to confirm — approve or edit only what `00_question.md` already settles; any other change to the plan is the user's call (SKILL.md Phase 2).

A single vendor's DR answer took 5–30 minutes on Pro/Ultra tiers (as of 2026-08); the body's ≈75–120 min is the whole Deep Research council, cross-review and retries included. **On ChatGPT Plus tier, DR can take 1+ hour and may fail mid-flight** with "Research failed" — see §7 for the retry workflow. Set the user's expectation accordingly when running on Plus, and don't kill the run prematurely. Don't wait synchronously — check back with a page read periodically.

## 5. Capturing responses — the last answer element (Gemini) vs clipboard (ChatGPT DR)

**Gemini DR responses are in the regular DOM**, so a page read can reach them — through the last `model-response`, not `body.innerText` (§5a).

**ChatGPT DR responses render inside a cross-origin iframe** (`<iframe title="internal://deep-research" src="...">`). `document.body.innerText` does NOT contain the report text — its length stays at ~3000 chars regardless of how much report content is rendered. `iframe.contentDocument` is also CORS-blocked. **For ChatGPT DR you must extract through the system clipboard** (see §5b).

### 5a. Gemini — read the LAST answer element

⚠️ **Superseded in part (2026-08-23):** `body.innerText` was later measured TRUNCATING (3.6k of 26k) and freezing mid-stream, so it is **not** the reliable reader this section once called it. Read the last `model-response` with a page-text read (SKILL.md *Capturing responses*). The slicing below is kept only as a way to cut a text you already have into filter-safe windows:

```js
// Save once when the answer is complete — the last answer element, not document.body
const nodes = document.querySelectorAll('model-response');
window._raw = nodes[nodes.length - 1]?.textContent ?? '';   // the whole answer — no footer trimming needed
```

Then dump `window._raw` in windows of 500–1000 characters for Latin text, ≤700 for non-Latin (see §6 for why small windows).

**Streaming completion (Gemini): judge from the text of the last answer, not from signals.** An earlier version of this section required body length stable ~10 s AND no Stop button; both were later measured lying (length froze mid-stream; the Stop selector stayed truthy after completion — `landmines.md`). Poll the last `model-response` and decide on its content.

**For ChatGPT DR, the body-length signal does NOT work** (cross-origin iframe). Use visual signals instead:
- The header "Research completed in Xh Ym · N citations · M searches" appears above the report card when done.
- The progress bar at the bottom of the planning card disappears when done.
- The stop button (small black square) becomes a download/expand icon when done.

### 5b. ChatGPT DR — clipboard extraction pattern

Because the deep-research report sits in a cross-origin iframe, you cannot extract the text via JS. The reliable workflow:

1. **Expand the report to fullscreen.** Click on the body of the report card (not the header icons — those are easy to miss-click). Specifically, click somewhere in the middle-left of the visible report text. The card opens in a fullscreen reader.
2. **Focus inside the iframe.** Triple-click a paragraph in the report body. This puts cursor focus inside the iframe document.
3. **Select all + copy.** Send select-all then copy (`cmd+a`, `cmd+c` on macOS; `ctrl+a`, `ctrl+c` elsewhere) as key presses.
4. **Read the clipboard.** Use the host's clipboard-read capability (on a host with app-level permissions, grant clipboard read for the browser first).

```js
// Concrete sequence (pseudo-code):
// 1. click at coordinate inside report card body       → opens fullscreen
// 2. triple-click at coordinate on a paragraph         → focuses iframe
// 3. key select-all (cmd+a / ctrl+a)                  → selects all
// 4. key copy (cmd+c / ctrl+c)                        → copies
// 5. read the clipboard (host capability)                  → returns full text
```

If the clipboard returns the **prompt** instead of the response, the focus was on the outer ChatGPT page, not the iframe. Re-do step 2 (triple-click inside the report area) and try again. The iframe focus is sticky — once you're in it, subsequent select-all and copy work on its content.

The clipboard text is plain text without markdown formatting (bold/italic stripped, but section headers preserved as plain lines). Citation footnote numbers come through as inline numbers like `[1]`. Save directly to `02_chatgpt_round1.md` and re-add markdown structure (bold for emphasis, headers as `###`) when writing the brief.

## 6. Bridge content filter — patterns that get blocked

Some browser bridges have a content filter that returns `[BLOCKED: Cookie/query string data]` when the output looks like cookie strings or query parameters. In practice, the trigger is anything that pattern-matches `key=value` or `key: "value"` densely. Common in:

- TypeScript object literals (`{ title: "X", date: "...", tags: [...] }`)
- URL examples (`/en/blog/foo?ref=bar`)
- JSON snippets in responses
- Code blocks with config-style content
- Long lists of `attribute="value"` HTML

### Workaround pattern

```js
// 1. Save full text to a window var so each chunk dump is small
// The last answer element — NOT [data-message-author-role], which has returned only the citation chips
// of a complete answer. ChatGPT: the last div.markdown; Gemini: the last model-response.
const nodes = document.querySelectorAll('div.markdown, model-response');
window._raw = nodes[nodes.length - 1]?.textContent ?? '';

// 2. Locate section headers (less likely to trigger filter)
const idx1 = window._raw.indexOf('1.');
const idx2 = window._raw.indexOf('2.');
// ...
```

Then dump section by section in chunks of ~500–1000 chars (≤700 for non-Latin text). If a chunk is blocked, halve it (binary-search style) until you find the offending range, then skip just that range and stitch around it. The text outside code-block ranges is almost always clean prose.

If a chunk keeps getting blocked, re-read the same last-answer element with the host's page-text read instead of a script return — it travels by a different path.

**Don't try to defeat the filter** by encoding (base64, char-shuffle, etc.) — those are also blocked. Just slice smaller and accept that some code chunks won't extract; reconstruct intent from prose around them.

## 7. Recovery from stuck states

### Gemini — submit button stuck in "Stop response" mode

Symptom: response stream is technically done, but the bottom-right button still shows the stop icon (white square in dark circle), and pressing Enter on a fresh prompt does nothing. The textbox keeps the prompt text but doesn't submit.

Cause: usually triggered by clicking the stop button mid-stream when the response was actually about to finish. UI state machine doesn't transition out cleanly.

**Recovery:**
1. Navigate to the same conversation URL (e.g., `https://gemini.google.com/app/<conversation-id>`). The conversation history is preserved on Google's side, so reload restores all prior turns.
2. Click into the prompt textbox.
3. Re-send the prompt by the delivery order in SKILL.md «Sending the prompt», clipboard first. Its
   rules for the page-script fallback apply unchanged, including never after a usage-policy refusal.
4. Submit by a **coordinate click** on the Send button, from a screenshot taken after the text is in place — Enter and element-reference clicks have no-op'd here (SKILL.md, *Other landmines*).

This worked cleanly in a real run after several other recovery attempts (clicking stop button repeatedly, dispatching synthetic KeyboardEvents) failed.

### ChatGPT — anonymized session shows "fake login"

Symptom: a page read reports a profile button and the chat input is usable, but the user is actually anonymous (no session). Telltale: top-right shows `Sign in` / `Sign up for free`.

**Recovery:** Stop. Ask the user to sign in. Don't proceed with an anonymous session — Search and Thinking are restricted/unavailable.

### ChatGPT DR — "Research failed" (research failed)

Symptom: after 30–60 min of active research, the report card shows the title "Research failed" instead of the report. All plan items remain unchecked. Below the failed card, the standard action icons (copy, like, dislike, share, **"Change model"**, more) are visible.

**Recovery — retry the same DR:**
1. Click the **"Change model"** icon (looks like a circular refresh arrow, 5th of 6 in the action row). It opens a small popover above with a textarea for "Ask to change the response" and a button **"Try again • <current thinking model>"**.
2. Click **"Try again"**. ChatGPT shows the original plan again with three buttons: "Edit", "Cancel", "Start".
3. Click **"Start"**. The retry starts fresh.

In one measured case (2026-08), the retry completed in ~25 min after the first attempt failed at ~50 min — a retry can be faster because cached search results from the first attempt are reused. Total wall-clock: ~75 min for one ChatGPT Plus DR with one retry.

Retry once. If the retry fails too, stop and tell the user (SKILL.md, *Other landmines*) — never a second retry without their explicit approval.

### Generic — long-running DR tab silently stalls

Symptom: DR has been running 30+ minutes, length/counter stopped changing, no error visible. Stop button still showing.

**Recovery:**
1. Take a screenshot — sometimes the response is fully rendered but stop button is stuck (see §5).
2. Scroll inside the response area to force a render.
3. **Navigate to the same conversation URL to refresh** — works for both Gemini and ChatGPT. If the DR completed server-side or moved to a later stage, the refresh reveals the true state. (Real run: ChatGPT counter appeared frozen at 533 queries; after refresh it showed the run was actually at 536 queries and finalizing — the websocket had dropped while the server kept working.)
4. If after refresh the run is still active, just wait longer — Plus tier ChatGPT DR can spend 20+ min in the writing/citation phase with no visible UI updates.

## 8. Round 2 challenge prompt — why the template is worded as it is

The template itself lives once, in SKILL.md Phase 3 — copy it from there.

Three properties of this template that earn their keep:

- **"another expert"** — generic, ungendered, no model-name giveaway. Critical for breaking sibling-model sycophancy.
- **"Where do they go wrong"** — assumes adversary, not peer. Forces engagement.
- **"If you change your earlier position, say so explicitly"** — gives the model permission to reverse without losing face. Real runs produced explicit position-change language ("I am officially changing my position on both fronts") only when this line was present.

When pasting one model's points to the other, paraphrase to remove platform-tells. Examples:
- Strip each vendor's house style: its signature hedges, its verdict-style labels ("100% correct", a bolded "**Verdict**"), and any self-reference to its own tools or modes.
- Strip the topic-specific jargon one member coined that the other never used — it identifies the source.

The pushback should be the *content* of the other model's argument, not its voice.
