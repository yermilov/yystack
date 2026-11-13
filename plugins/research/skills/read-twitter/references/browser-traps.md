# Browser instrument traps — check the instrument before believing the reading

Read this before a long browser session on X, or when a reading looks empty, frozen or too short. Each
trap is a way a browser tool reports success while measuring nothing; the one-line rulings are in
`SKILL.md` § Trust the instrument. Measurements are dated and per-driver — re-check on yours.


The failure that costs the most here is not a page you could not read; it is a reading you
believed from an instrument that never moved.

- **`resize_window` returns success and changes nothing on this host.** Asked for 1440×1300, got
  "Successfully resized", and `innerWidth`/`innerHeight` stayed 1728/907. **Always read
  `innerHeight` back.** You cannot force more content to mount by resizing.
- **The CDP call times out at ~45s even with only ~11–13s of declared sleeps** — the grabs and
  X's own rendering cost real time on top. Keep any loop inside a `javascript_tool` call short and
  resumable. **An ordinary timeout like this one is not the same as the renderer HANGING** (see
  below) — here the page is still alive and state survives: re-read it and continue rather than
  restarting or navigating away.
- **The chrome MCP redacts some values, and there are TWO different messages with TWO different
  defangs — using the wrong one leaves you staring at an empty result.** Both mean the MCP
  redacting, never a broken page:
  - **`[BLOCKED: Base64 encoded data]`** — a bare media id, or one of X's own internal hrefs.
    Defang by returning `{kind, id: id.split('').join('.')}` and stripping the dots on your side.
  - **`[BLOCKED: Cookie/query string data]`** — fires on **any** returned text containing `?`, `&`
    or `=`, secret or not, and it blocks the **entire call result**, not the offending substring.
    Measured 3× while reading fetched source, where a single line `const MEDIA_PROXY =
    "/api/media?u="` was enough to lose the whole return. ⚠️ **The dot-defang does NOT help here** —
    strip the punctuation instead: `.replace(/[?&=]/g,' ')`, and `.replace(/https?:\/\/\S+/g,'[url]')`
    if URLs are riding along. ⚠️ The allowlist filter in the GitHub-source subsection below,
    `.replace(/[^A-Za-z0-9 ,.:=(){}[\]<>+*/_-]/g,' ')`, is **not** a drop-in substitute here: it
    strips `?` and `&` but deliberately **keeps `=`** (verified — `a?b=c&d /` → `a b=c d /`),
    because code is unreadable without it. Use it for source listings; use the `[?&=]` strip when
    `=` alone is what is tripping the redactor.
- **⚠️ COLLAPSED `<details>` CONTENT IS ABSENT FROM `innerText`, AND OPENING THEM ON THE LIVE DOM
  DOES NOT FIX IT — reparse the raw HTML instead.** Measured 2026-09-06 on collusion.wiki, where
  every substantive section (both appendices, all the "Key facts" disclosures) sat in `<details>`:
  `innerText.length` was **6 342** against `htmlLen` **155 428**, and `get_page_text` likewise
  returned only ~6 KB. Setting `d.open = true` / `setAttribute('open','')` on the live nodes left
  `innerText` at 6 342 — **measured twice**. So the page looks thin and is not. Do not touch the live
  DOM at all; parse a fresh copy in memory:
  ```js
  const h = await fetch(location.pathname).then(r => r.text());
  const doc = new DOMParser().parseFromString(h, 'text/html');
  doc.querySelectorAll('details').forEach(d => d.setAttribute('open',''));
  window.__S = doc.querySelector('#section-id').innerHTML
    .replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
  ```
  🔴 **And never mass-click to expand.** `[...document.querySelectorAll('[aria-expanded="false"]')]
  .forEach(b => b.click())` hit 42 elements and **closed the tab outright** — the next call answered
  `Tab … no longer exists`, taking every `window` accumulator with it. This is the same failure class
  as the "Show more" text-match hunt above, and it generalises to a rule: **expanding content is a
  parsing job, never a bulk-clicking job.**
- **For a NON-x.com page, try `mcp__workspace__web_fetch` first — it is cheaper, but it truncates
  the tail.** On that same report it returned all 95 162 characters in one request (spilled to a
  file, read by a subagent) while cutting off the end of the page, so the appendices still needed the
  reparse recipe above. The division that worked: **`web_fetch` for the body, the browser for the
  tail.** ⚠️ **A per-source recipe in `references/source-recipes.md` / `references/x-native.md` OVERRIDES this bullet** — on a
  host where a fetcher is documented to return a generated summary rather than the page's bytes
  (`claude.com/blog` / `anthropic.com/research` today), "try the fetcher first" is the wrong move,
  not the cheap one. Check that section before applying this default.
- **`window` accumulators do not survive a navigate or a reload.** Anything you are collecting
  across pages belongs in `sessionStorage`, or folded into a single object before you leave.
- **⚠️ `mcp__remote-devices__Claude_Browser__preview_start` REUSES the tab — it returns the same
  `tabId` (`seed`) rather than opening a new one, despite its own description saying it "opens an
  additional tab".** Measured 2026-09-20: a second `preview_start` on a different URL navigated the
  existing `seed` tab and destroyed every `window.__*` accumulator on it. Same class as the bullet
  above, but firing exactly where the tool's own documentation says it should not. **RETURN the
  state from the tool call before the next `preview_start`** — that is the fix on this driver,
  because the remote browser exposes no second-tab tool: `tabs_create`/`navigate` belong to
  `claude-in-chrome` and are not reachable from a Cowork session (check your own `allowed-tools`
  before reaching for them). ⚠️ `sessionStorage` is NOT a substitute here, and this is where it
  matters most: it is scoped to the origin, and the whole point of a second `preview_start` is
  usually a different one (`github.com` → the attachment's S3 host, or → `x.com`), where the old
  origin's store is simply not readable — the same constraint spelled out in the GitHub tree bullet
  above. Keep it for a same-origin navigation or a later return to that origin; otherwise return the
  state. Same class as the bullet above.
- **An X status page renders only the tweet article — `n=1` with no replies is not "empty".**
  The article can take ~16s to mount (measured: 0 at 7s, 1 at 16s, spinner still up). Wait and
  re-poll before concluding a page is broken.
- **`window.scrollBy` did not scroll an X status page — measured there, not confirmed on every
  layout.** X scrolls an inner container, not `document.body`, on the status page tested:
  `document.body.scrollHeight` was **827** on a fully-mounted post page, and `window.scrollY`
  stayed **70** after six `scrollBy(0, 1400)` calls. The call succeeds and does nothing, which
  reads exactly like "no new articles to load" — the same false-convergence trap called out
  elsewhere in this skill. Use `computer(action=scroll, coordinate=[x,y],
  scroll_direction="down")` instead; it drives a real input event and actually moves the feed.
  Re-measured 2026-09-05 on a different status page (`x.com/anshuc/status/2096008083826725132`):
  eight `scrollBy(0, 1400)` calls with 1.8 s sleeps left `scrollY` at **53** and `scrollHeight` at
  **959** on every iteration, article count frozen at 1; the `computer` scroll took it to
  `scrollY 1053 → 2053 → 3053` and 1 → 19 → 26 → 32 articles.
  ⚠️ **On the PROFILE FEED (`x.com/<handle>`) the same call is worse, because it works FIRST and
  fails later.** Measured the same day: four `scrollBy` iterations advanced normally to `y = 7577`,
  `docH = 8483`, 7 posts — then five further iterations changed neither `y` nor the count, with no
  error. Switching to `computer(action=scroll)` immediately gave
  7 → 20 → 32 → 37 → 43 → 50 → 59 → 65 — **at `scroll_amount=10` with `repeat`**, per the cap in the
  next bullet; the run that measured this reported asking for 15–20, which the tool would have
  rejected outright. So **«scrolling stopped adding cards» is a claim about the
  scroll METHOD, not about the end of the feed** — retry with `computer` before writing "reached the
  bottom". And note `docH` SHRINKS as you go (8119 → 7357 → 5648 in one measured run) because X
  virtualises what you have passed; a falling `scrollHeight` is normal, not a page collapsing.
- **`scroll_amount` is CAPPED AT 10 — `repeat` is what you raise instead.** `scroll_amount: 12`
  fails with `MCP error -32602 … too_big, maximum: 10`, which looks like a malformed call rather
  than a ceiling. `repeat` is not capped, so `scroll_amount=10, repeat=8..10` is roughly one screen
  of self-thread per call.
- **🔴 In-browser video SEEKING is not an alternative to the `ffmpeg` path — on the Cowork host the
  video element never decodes at all.** Measured 2026-09-02: all three `<video>` nodes on a status
  page sat at `readyState: 0`, `videoWidth/Height: 0`, empty `buffered`, `error: null`,
  `networkState: 2` — unchanged after clicking Play and ~40 s of waiting, while the UI drew the
  poster and a duration, so the player *looks* healthy. Setting `currentTime` fires no `seeked` and
  changes no pixels. **Two negative controls:** a direct mp4 variant opened in its own tab behaved
  identically (counter frozen at 0:00), and the `/status/<id>/video/1` lightbox rendered black — so
  this is neither X-specific nor MSE-specific. ⚠️ Scope it honestly: this is measured **on Cowork**,
  and a run elsewhere did report working seeks. That is exactly why the recipe below is the one in
  this file — **pulling the mp4 and sampling it with `ffmpeg` does not depend on the browser
  decoding anything**, so it works on both. Do not add a seek-and-screenshot recipe back: a session
  that followed one here got a single frame out of ~1060 and concluded the video "cannot be read".
- **2026-08-25, dated observation (transient host state, not a standing rule) — the default
  browser hung dead on `x.com` for ~5 minutes
  straight**: `javascript_tool` (CDP `Runtime.evaluate`) timed out at 45s, `screenshot` at 30s,
  `read_page`/`get_page_text` at 45s. **Negative control:** `example.com` in the same browser
  failed the exact same way → the hang was browser-wide, not `x.com`-specific. **Positive
  control:** a second connected browser read the same URLs fine throughout. After it "woke
  up", a second, quieter failure mode appeared: `navigate` to `x.com` reported success **twice**
  while the tab stayed on the previous URL (`example.com`) — so on this host a successful
  `navigate` is **not** proof of a real transition; always re-read `location.href` / the Tab
  Context after it. **Re-verified 2026-08-30**: the same device (now labeled "Browser 2" — labels
  swap between the two connected browsers, so match by `deviceId`) navigated to and read the same
  tweet URL normally, first try, no hang — confirming this was a transient host state that
  self-resolved, not a standing property of the browser.
- **`javascript_tool` does not await the Promise your top-level expression returns — code shaped
  as an async IIFE (`(async () => { ... })()`) hands back `{}` as soon as the IIFE call returns
  (immediately), with no error, while the async function's body is often still mid-flight past its
  first `await`.** This reads as "the page returned nothing", when the code is actually still
  running (or has barely started) — hit twice in one run. Write the loop at the **top level** with
  `await`, exactly as the tool's own description says, instead of wrapping it in an async function
  expression: e.g.
  `const sleep=ms=>new Promise(r=>setTimeout(r,ms)); for (...) { await sleep(x) } JSON.stringify(out)`.
- **A long async scroll loop inside one `javascript_tool` call can leave the automation path
  unresponsive for far longer than any single call's own timeout — a different failure from the
  ordinary timeout further up, needing a different recovery.** A
  `for (6) { scrollBy; await sleep(2500) }` loop (six 2.5s sleeps = 15s) left the tab dead: every
  subsequent call — `screenshot`, `javascript_tool`, `computer` — failed with `Script injection
  timed out` / `Runtime.evaluate timed out after 45000ms` for roughly **90 seconds** afterward,
  well past any single call's own ~45s timeout — this is a hang, not a slow call to re-read and
  resume. **Recovery: `navigate` to the same URL** — reloading the tab revives it, but this DOES
  cost you any `window` accumulator (bullet above), so fold state into `sessionStorage` before a
  loop that might hang. Prefer several short `computer(action=scroll, …)` calls over one long
  in-page JS polling loop for exactly this reason.
