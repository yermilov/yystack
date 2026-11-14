# Landmines — the measured cases behind SKILL.md «Other landmines» and «Usage-policy refusals»

> **UI language.** Control labels are given in English. A localized UI shows them translated, so
> match a control by its position and role first; labels also drift between releases.

The dated measurements behind each one-line ruling in SKILL.md. Read when a ruling there does not
cover what you see, or before arguing with one. The rulings live in SKILL.md and the
how-to in `ui-tactics.md`; each entry here is the evidence and its limits. A measurement on one host and date
is not a standing contract: re-test before relying on it, and when a re-test disagrees, replace the
entry rather than stacking a rebuttal on it.

## Usage-policy refusals

**Running Phases 1–4 inside a subagent** (SKILL.md option (d)) isolates a refusal but costs long
opaque waits, no mid-flight visibility, and, when a refusal fires inside it, usually the synthesis
while the raw rounds survive. That is why it is a last resort, not the default.

**A refusal can poison a sandboxed host's session.** On one sandboxed cloud host (2026-08), an
`execCommand` injection was refused by a safety classifier, and every later batch containing page-script
calls was blocked for the rest of the run. One-paragraph typing still worked there.

## Reading answers

**`[data-message-author-role]` returns citation chips, not the answer** (ChatGPT, 2026-08-22). On two
completed answers the selector returned 372 characters (three source names) while the full answer was
on screen; `querySelectorAll('p')` inside it found 1. A run trusting it would have reported a failed
council. The last `div.markdown` returned the whole answer.

**`document.body.innerText` truncates without a mark** (2026-08-23): it stopped at ~3.6k characters
of a 26k answer and froze mid-stream on Gemini. A truncated read looks like a complete short answer.

**Gemini's progress signals freeze while it is still streaming** (2026-08-23): `body.innerText.length`,
`model-response.innerText` and the Stop-button selector (which stays truthy after completion) all
stopped moving. Only the text of the last `model-response` told completion apart from a stall. An
**empty** `model-response` for several minutes on a follow-up turn was a stall; reloading `/app/<id>`
recovered it.

**Gemini A/B tests hide two answers** (2026-08-22): `body.innerText` froze at ~1 700 characters while
`querySelectorAll('message-content, model-response')` returned both variants in full. They
contradicted each other (two numeric limits for one rule) and each held exactly one error, so pushing
on the divergence beat either variant.

**ChatGPT DR renders in a cross-origin iframe** (2026-08): `body.innerText.length` stayed ~3 000
whatever the report size, and `iframe.contentDocument` is blocked. Only the clipboard path worked.

**The bridge filter and size cap** (2026-08): results dense in `key: "value"` came back
`[BLOCKED: …]`; each return was capped at ~1.5 KB, which is ~750 visible Cyrillic characters.

## Driving the composer

**`?q=` pre-fill works on ChatGPT, not on Gemini** (2026-08-23, two sessions). On
`chatgpt.com/?q=<encoded>` the prompt lands in the composer after a short delay. On
`gemini.google.com/app?q=…` the composer stays empty. On 2026-11-13 ChatGPT removed the query string
itself after the prompt landed; when it does not, the encoded prompt echoes into every later tab read
(~1.2k tokens each), hence the `history.replaceState` strip. Keep the real path: the
reload-the-conversation recovery depends on it.

**Gemini submission** (2026-08-23, one host): Enter did not send and a `ref`-based click on Send
no-op'd; a coordinate click from a screenshot taken after the text was in place worked. Typed `\n` was
swallowed (`line one\nline two` → `line oneline two`), and right after a navigation the composer
dropped every space and digit while the typing call reported success. A day earlier, the same browser
had Gemini behind a site-permission wall that did not reproduce, which is why none of this is
Gemini's permanent contract.

**Typing ignored its tab** (2026-09-10, one bridge): clicks and screenshots respected the named tab,
typing went to the foreground one. Text meant for Gemini landed in ChatGPT twice, and that council's
cross-round never happened.

**Plain typing submits early on ChatGPT**: the first `\n` acts as Enter, so a seven-section prompt
arrived as its intro paragraph, and the reply looked responsive while answering a question it never
received.

**A second connected browser** drove `gemini.google.com` fine because it was signed in to a different
person's account; a council through it would spend their quota.

## Models and modes

**ChatGPT's heaviest "Pro" setting hung** (2026-08-22, two prompts on one account): both browsed
(27 and 23 sites), emitted a reasoning trace, then produced nothing for ~2.5 h with the Stop button up;
reloading did not help. Re-sent at High, both returned complete cited answers in 3–4 minutes.

**ChatGPT DR failed mid-flight** (2026-08, mid-tier paid plan): "Research failed" after ~50 min; the retry through
"Change model → Try again → Start" finished in ~25 min (cached search reused), ~75 min in all.

**Gemini memory bleeds into fresh chats**: with chat history on, a Round 1 answer named a specific
product model that the prompt never mentioned; it came from an earlier chat in the same account. A
fresh ChatGPT chat did not do this.

**Gemini hung on "continue" turns** (Thinking mode, long generations): the second answer container
stayed empty and the tab stopped answering screenshots after 30 s.

## Bridges

**Page-script calls are capped at ~45 s** on some bridges (a remote-debugging evaluate call). Long
loops in one call exceeded it even when each step was short; the completed steps stuck.

**The browser closed the automation tab group mid-run** and page-script calls timed out repeatedly
while long generations were open; both conversations survived server-side and were recovered from
their recorded URLs.
