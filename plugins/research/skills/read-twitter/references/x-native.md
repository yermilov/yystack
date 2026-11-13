# X-native recipes — the depth behind read-twitter's Steps 3–6

Read the section you need when the body sends you here: an X Article, the reply counter, the
self-thread search, the syndication endpoint, CDN media. Every ruling an agent needs to choose a branch
is in `SKILL.md`; this file has the measured mechanics. X's selectors and endpoints drift — the dates
say when each was true.

- **An X Article** (the long-form format) lives in `article.innerText`. Cache it in a `window`
  variable and slice it out in reads of ≤1200 characters.
  ✅ **No browser needed for the BODY and the FIGURES: `curl https://api.fxtwitter.com/<handle>/status/<id>`
  carries the whole article under `.tweet.article`.** Measured 2026-09-26 on @trq212
  `2103576349499855160` (the tweet is a 2-line teaser; the article is the material): `title`,
  `preview_text`, `cover_media`, and `content.blocks[]` — a draft.js block list, **81 blocks /
  11 233 characters, complete**, one `{type, text}` per paragraph (`header-one`, `header-two`,
  `unordered-list-item`, `unstyled`). Every figure is an `atomic` block with no text. Resolve it in
  three hops: `block.entityRanges[0].key` (a number) → the `content.entityMap[]` entry whose
  `key` (a STRING) equals it — the array is NOT in key order, and each entry is
  `{key, value: {type, data}}`, so the payload is at `entry.value.data.mediaItems[0].mediaId` →
  the `media_entities[]` item with that `media_id` → `media_info.original_img_url`, a plain
  `pbs.twimg.com/media/…` URL (`curl -o` it, `Read` it — 7 figures + a cover here). Blocks in order
  give each figure's position in the prose. ⚠️ **Only what that one sample contained is measured:**
  its entity types were `MEDIA` (images) and one `LINK` (`entry.value.data.url`, a plain hyperlink
  to a GitHub release). An article that embeds a tweet or a video, carries inline hyperlinks
  inside paragraphs, or contains a CODE block was NOT in the sample — for a code block a `MARKDOWN`
  entity holds the real content at `entry.value.data.markdown` while `block.text` is only a
  placeholder (from `codex review`'s reading of FxEmbed's `article.ts`, not reproduced here).
  Decode those from the payload yourself and say the path is untested, rather than assuming they
  are absent — and if the body reads shorter than the page's own length, fall back to the browser. It is also a third-party mirror, so quote
  figures against the image itself. ⚠️ **Check the article's own author for a blog twin** — the
  article's first lines said «interactive diagrams … on claude.dev/blog/spending-your-effort» and
  `curl -A "Mozilla/5.0"` on it returned 200 / 271 KB of static HTML whose text carried what the X
  copy dropped: the benchmark methodology caption and a footnote saying the numbers are internal
  runs with safety interventions off (i.e. not comparable to the public leaderboard). Same rule as
  «the linked material is a retelling»: read the fuller twin, tag which copy each caveat came from.
- **An X status page renders only the tweet article — `n=1` with no replies is not "empty".**
  The article can take ~16s to mount (measured: 0 at 7s, 1 at 16s, spinner still up). Wait and
  re-poll before concluding a page is broken.

- **`get_page_text` returns ONLY the root article on an X status page — never the replies.**
  Measured 2026-09-04 on a 1.4K-reply thread: after scrolling until two author self-replies were
  plainly visible in the viewport, `get_page_text` still returned the root post verbatim and
  nothing else (`Source element: <article>`). It is not a mounting delay — the extractor picks
  one article by construction (Readability takes the largest/main node). So an empty `## Thread`
  section derived from `get_page_text` is a fact about the TOOL, not about the thread. Harvest the
  self-thread with `computer(action=screenshot)` after each scroll, or with `read_page(depth=12)`
  over the `Timeline: Conversation` region; use `get_page_text` only for the root body — and only
  when the root is **not** a quote-tweet: Readability has no notion of Step 4's "stop at the nested
  `article`" rule, so on a quote-tweet root `get_page_text` merges the quoted post's text into the
  root body, duplicating and misattributing it exactly as Step 4 already warns against for a raw
  DOM-subtree walk. On a quote-tweet root, extract the body via Step 4's own nested-article-aware
  walk instead.

  ⚠️ **Replies specifically need a REAL scroll event — `window.scrollBy`/`window.scrollTo` via
  `javascript_tool` do NOT trigger X's reply-loading; `computer(action=scroll)` does.** Measured
  2026-08-29 on `x.com/thsottiaux/status/2076119366647894371` (671 replies): 18s wait + **three**
  passes of `window.scrollTo(0, document.body.scrollHeight)` with 4–6s sleeps between them still
  left exactly **1** `article` in the DOM, `docH` unchanged, spinner still up — looked exactly like
  "no replies" or "logged-in mode blocks them," which would have been a false answer. One
  `computer(action=scroll, coordinate=[700,500], scroll_direction="down", scroll_amount=8)` + 6s
  mounted the timeline, and the very next `window.scrollBy` pass then read **12** `article`s.
  Programmatic scroll doesn't fire the events X gates its reply-loading on. **This confirms Step
  5's existing procedure** (`computer(action=scroll)` first) — treat it as load-bearing, not
  optional: use `computer(action=scroll)` for **every** pagination step on a conversation page, not
  just the first — the `window.scrollBy` entry in `references/browser-traps.md` (it did not scroll
  an X status page at all) means a `window.scrollBy` "fine-tune" pass can
  silently do nothing and read as false convergence, dropping later self-thread posts or replies.
  Reserve `window`/`read_page` calls for reading what's already mounted, never for advancing it.
  ⚠️ **Wait a few seconds and re-poll after EACH `computer(action=scroll)` before checking whether
  the article count grew** — the measured recovery above needed a ~6s pause between the scroll and
  the next read; checking immediately after the scroll call, with no wait, risks reading the
  pre-load DOM and wrongly declaring convergence one scroll too early.
  (This is the same symptom the conversation_id fallback in Step 5 covers — see there.)

  ⚠️ **And even scrolled correctly, a status page's replies can still fail to mount within a long
  wait — don't conflate "didn't mount" with "nothing there", and check the reply COUNTER first.**
  If the engagement counter (see below) already reads `reply:0`, a stuck `article` count of 1 is
  the correct, complete state — say so plainly, not as a failure. Reserve "didn't mount" for when
  the counter reports a **positive** reply count and the DOM still won't grow; when the counter
  itself can't be read, say replies could not be verified rather than asserting either outcome.
  Measured on `x.com/un1c0rnioz/status/2084686552299634805` (logged-in Chrome, counter read
  `reply:875`): after ~70s + scroll-to-bottom + another 20s,
  `document.querySelectorAll('article').length` stayed at **1** (root only), `scrollHeight` stuck
  at 1146, one `[role="progressbar"]` that never resolved — the reply branch simply never arrived
  despite 875 replies existing. **If `article` stays at 1 after a real scroll and a genuine wait,
  AND the counter shows replies exist, write "replies didn't mount" — never "no noteworthy
  replies"**: the second is a false claim about the material, presented as fact, when it is really
  a claim about the tool.

  What still works on a page whose replies won't mount — read it rather than giving up on the post:
  the root article itself mounts in ~25s (`article` + `time[datetime]`);
  `[data-testid="removeBookmark"]` present → `bookmarked:true`; and the engagement counters under
  `[role="group"] [data-testid]` carry both the **count** and the signed-in account's own **state** on that post —
  the `testid` itself is the tell: `unlike` (not `like`) means it already liked it, `removeBookmark`
  (not `bookmark`) means it's already bookmarked. Example read: `reply:875`, `retweet:4.6K`,
  `unlike:48K`, `removeBookmark:19K`.
- **An OLD post that was just bookmarked, or whose replies suddenly restart months later: search
  `quoted_tweet_id:<root id>` first.** `x.com/search?q=quoted_tweet_id%3A<root id>&f=top` lists the
  posts that QUOTE the root, which is usually why it resurfaced — often the author re-posting it.
  Measured 2026-09-25 on @BrendanFalk `2033977481724891247` (posted 17.03.2026, bookmarked
  22.09.2026): one search returned 11 quotes, among them the author's own 21.09 hiring re-post
  `2102086742757224500` («If you're a context/harness engineer and think you could crush this
  interview, please DM me!», 160 likes). That explained both the late bookmark and a wave of 22.09
  replies to a six-month-old thread. Neither the status page nor `conversation_id:` shows it,
  because a quote is a new conversation.
  **To place each of the author's replies without scrolling:** `api.fxtwitter.com/i/status/<id>`
  returns `replying_to_status` for any post. Collect the author's reply ids with the
  `from:<handle> conversation_id:<root id>` search below, then fetch each parent the same way with
  `curl`. On the post above that took ~25 fetches, no browser scrolling, and gave every parent/answer
  pair.
- **Self-thread search:** `x.com/search?q=from%3A<handle>%20since%3A..%20until%3A..&f=live`.
  **The handle must be exact** — `from:emilkowalski_` returned 0 articles where
  `from:emilkowalski` returned 5. A wrong handle is the FIRST thing a 0-article search means; it is
  not the only thing (see the date-window trap immediately below), so rule the handle out before you
  conclude anything about the author.

  ⚠️ **An EMPTY date-scoped `from:` search is a statement about the INSTRUMENT until a positive
  control says otherwise — the window silently stops working past a few weeks back.** Measured
  2026-09-05 on @aug5thmusic: `from:aug5thmusic since:2026-07-19 until:2026-07-23` rendered
  `empty_state_header_text` = «No results for …» with 0 articles, for a tweet that demonstrably
  exists (`2079334917796946032`, `created_at 2026-07-20T22:37:31.000Z`, read the same run via
  `tweet-result` and rendered as a quoted post elsewhere). The account's older handle
  (`from:MusicTheoryPlus`, same user id) was equally empty, so this is not a handle error. The
  boundary was in weeks, not days: `until:2026-09-04` (~a day back) returned 3 results reaching to
  2026-08-06, while `until:2026-08-06` (~a month back) returned nothing. **So: before reporting «the
  author posted nothing in that window», show the same query CAN return something — widen `until:`
  toward today until it does.** Do not generalise this into "X search is broken"; as of 05.09.2026
  windows older than roughly 2–3 weeks came back empty on known-existing tweets.

  **The replacement that works is the PROFILE FEED, `x.com/<handle>`, scrolled with
  `computer(action=scroll)`** — the same run walked back from today to 2026-08-14 and collected 65
  posts that way. ⚠️ And read the `window.scrollBy` bullet under `references/browser-traps.md` before
  you script that scroll: on the profile feed it works for a few iterations and then silently stops
  loading, which reads as the end of the feed.

  ⚠️ **That form alone will NOT reconstruct a thread, and the way it fails looks like an answer.**
  Search results recycle the same 5-article window as the bookmarks list, so a thread posted in one
  burst returns whichever five items the window happens to mount — usually the author's replies to
  *other people*, not the numbered points. Measured 2026-08-21 on a 9-point `@ukrciv` thread: three
  successive day-scoped searches returned 5 items each, none of them a numbered point, and
  scrolling added nothing.

  The query that works combines three things — drop any one and you get the failure above:

  ```
  from:<handle> conversation_id:<root status id> since_time:<unix s> until_time:<unix s>
  ```

  1. **`conversation_id:<root status id>`** scopes to the conversation — but a conversation is
     *everyone's* replies, so on its own it returns strangers. Keep `from:<handle>` to get the
     author's own thread out of it.

     ⚠️ **`from:<handle> conversation_id:<root id>` — dropping only `since_time:`/`until_time:` —
     is ALSO the default way to find the artifact a dive is actually looking for, because it is
     usually sitting in the author's own self-reply, not in the root post.** (This is distinct from
     Step 5's fallback, which drops `from:` too, on purpose, to reach strangers' replies when the
     timeline is stuck — here you specifically want the author's own follow-up.) Verified 2026-08-28
     as a positive control, **5 for 5**, across five different status pages that each rendered only
     the root `article`:

     | author | status page | `from:<handle> conversation_id:<root id>&f=live` | what only the search surfaced |
     |---|---|---|---|
     | @redp314 | 1 article, 0 self-replies | 18 items | a self-reply with two screenshots of exact prompts + "cost ~30 min of an ordinary Claude Code subscription" |
     | @fleetingbits | — | 7 items | the method ("local webpage, made with Claude Code", what to prompt for) |
     | @benlaudesign | — | 4 items | the live project link https://ink-inky.vercel.app |
     | @noah_bino | — | 11 + 9 items | an App Store link (`carrier-pidge/id6762161637`), "100k users" |
     | @prasenx | — | 5 items | a GitHub link (`StarKnightt/night-street`) "with prompt and skills" |

     In all five cases the artifact the dive exists to find (a repo, a link, the prompts used) was
     sitting in the author's own self-reply, invisible on the status page. **Treat this as the
     default next step after Step 5 on a dive into someone else's tweet, not an emergency
     fallback** — the hit rate is too high to reserve for a broken page. Details worth keeping with
     the recipe: these searches returned **4–18** `article` nodes directly — the "every window
     still returns at most 5 items" limit two paragraphs below is a property of the self-thread
     RECONSTRUCTION search below, not of this conversation_id query; `since_time:`/`until_time:`
     were not needed at all here, `from:<handle> conversation_id:<root id>` alone was enough;
     scrolling after the search mounts still surfaces new items, so 3–4 scroll passes (~2s apart)
     are worth doing; and when the artifact lives outside the thread entirely (an app link, say), a
     second query form works — `from:<handle> (apps.apple.com OR app OR download)&f=live` — which
     is how the App Store link above was found.

     ⚠️ **On a viral demo post, even `from:<handle> conversation_id:<root id>` can come back
     near-empty — because the author's real explanation is a NEW top-level post, not a self-thread
     reply.** Measured 2026-09-04 on `@theo`'s 04.09 demo: the root carried one line, and
     `from:theo conversation_id:<root id>` surfaced only **two** words the author had said in that
     thread — correctly showing the self-thread was thin, but not that the author never explained.
     The actual answer (the prompt used, the run time) was a **separate top-level post published 6
     hours later** (a different status id, not a reply), discoverable from the root page only
     because it was quote-tweeted inside a two-word reply to a third party. **When the root is a
     demo/claim and the thread is asking "what was the prompt / how long / what harness", run BOTH
     `from:<handle> conversation_id:<root id>` (the self-thread) AND `from:<handle> since:<root
     date> -filter:replies` (top-level posts by the author after the root) before concluding the
     author never explained** — the first tells you whether the self-thread is thin, the second
     finds the follow-up when it is. ⚠️ `since:<date>` alone is day-granular, unbounded going
     forward, and includes replies — `-filter:replies` is what actually restricts it to top-level
     posts (untested here, since the run that found this found the follow-up via a quote-tweet
     link rather than by scrolling the raw `since:` results; if it over- or under-filters on a
     given account, fall back to plain `since:<root date>` and eyeball which results are replies).
     ⚠️ **On an older root or a prolific account, an unbounded `since:<root date>` can bury or drop
     a near-root follow-up under X's ranked/capped result view (the same ceiling Step 5 documents
     for reply timelines) — start NARROW and widen, don't search the whole open-ended range at
     once.** Bound it first to the days right after the root
     (`since:<root date> until:<root date + 2 days> -filter:replies`, or `since_time:`/`until_time:`
     in unix seconds for an even tighter window), and only widen the `until:` outward — a day, then
     a week — if that comes back empty. A follow-up "hours later" (the measured case here) sits
     inside the first, narrow window; only a genuinely delayed follow-up needs widening.
  2. **`since_time:`/`until_time:` take UNIX SECONDS.** (`since:`/`until:` are usually written
     date-only; a second-resolution `YYYY-MM-DD_HH:MM:SS_UTC` form also exists, untested here —
     the unix-second pair is what this run measured.) A long thread lands in a single burst, so the
     useful window is *seconds* wide: `since_time:<root ts> until_time:<root ts + 6>` is what
     finally surfaced the first numbered points at all.

  **Every window still returns at most 5 items, so no single window is the thread** — walk
  OVERLAPPING windows a few seconds wide and union them — no single window is authoritative. On the
  measured thread that meant three windows: `+0..+6s` gave points 1–3, an overlapping `+4..+8s`
  added 4–8, and a wider one caught 9 and the closing remarks. Accumulate into `sessionStorage`, which
  survives the reloads that navigating between searches costs you, and stop when the union stops
  growing — the same criterion, for the same reason.

- **Media pixels straight off the CDN**, when the Step 6 lightbox walk is not available — a
  **native X video**, which has no `/photo/<N>` link at all, or a media node you cannot navigate to.
  **Photos:** match `/pbs\.twimg\.com\/media\/([A-Za-z0-9_\-]+)/`, `curl` the id with
  `?format=png&name=4096x4096`, `Read` it. **Native video:** take the highest-bitrate `video/mp4`
  from `tweet-result`'s `video_info.variants[]` — walk EVERY `mediaDetails[]` entry, root AND
  `quoted_tweet` — into its own `mktemp -d`, and read it as SAMPLED FRAMES (one contact sheet sized
  `C×R ≥ ceil((duration_millis / 1000) × fps)` by default), never just the poster; say it is a
  sample. Run `ffprobe` for an audio stream and `volumedetect` on it: `max_volume` at the −91 dB
  floor is silent (nothing to transcribe). A claim about the video's CONSTRUCTION or A/V sync needs
  a measurement with its controls, reported as numbers, not a verdict. Only when `variants` is
  unreachable, fall back to the poster — keep the whole `ext_tw_video_thumb`/`amplify_video_thumb`
  path, never rebuild it under `/media/`.
  📖 commands, subtitle-band tiling, frame-sequence and sync tests, poster traps → `references/native-video.md`.

- **To check one tweet's text against the DOM:** `cdn.syndication.twimg.com/tweet-result?id=<id>&lang=en&token=a`
  returns the post as JSON to a plain `curl`. This is a **narrow exception** to "the browser is the
  only way in" — it serves only individually addressed, publicly embeddable posts, so
  bookmarks, search and anything protected still need the logged-in browser.
  ⚠️ **A page-side `fetch()` — e.g. `javascript_tool` code running INSIDE an x.com tab — is not a
  substitute either, and it fails on CORS, not on the endpoint being down.** Measured 2026-08-26:
  calling this endpoint via `fetch()` from a script executing in the x.com page context threw
  `TypeError: Failed to fetch`. This endpoint is for `curl` / `WebFetch` called from OUTSIDE the
  page — never from `javascript_tool` on an x.com tab.
  ⚠️ **On at least one host, an MCP `web_fetch`-style fetch tool is NOT a substitute for a literal
  `curl` here — confirmed again on `mcp__workspace__web_fetch` (Cowork).** Measured twice now:
  fetching this exact URL through that tool returned only the URL itself, no JSON, no body — an
  empty read — while the identical URL opened **directly in the browser** rendered the full JSON,
  and `curl` on the same URL worked in an earlier run too. Treat an empty/URL-only read from a
  fetch wrapper as evidence about that wrapper, not proof the endpoint is dead — retry with a
  literal `curl`, or just `navigate` the browser to the URL and read the rendered JSON, before
  concluding it's gone. ⚠️ **Do this in a fresh tab, not the post tab you are reading.** Navigating
  the active tab away destroys any `window` accumulator on it (see `references/browser-traps.md`)
  — open `tabs_create_mcp` first if you have state on the post tab worth keeping. Worth having
  because
  the DOM copy can be **silently truncated**: `[data-testid="tweetText"]`'s `textContent` gave 274
  characters ending mid-sentence, with no "Show more" control anywhere in the article, and the
  trailing **👇** announcing a thread had been dropped. The JSON carried it.
  ⚠️ Treat its `text` as complete only when **`note_tweet` is absent/null**; when `note_tweet` is
  present the post is long-form and this endpoint is not a reliable way to read the whole body.
  `quoted_tweet` is also in the payload.

  ✅ **The no-browser path to the full body is `api.fxtwitter.com` — it returns the FULL
  note_tweet body to a plain `curl`, where `tweet-result` returns only `note_tweet: {"id": "…"}`.**
  The permalink (next paragraph) stays the first-party source: use fxtwitter when no browser is
  at hand, or to have the full text before you open the page — and confirm anything you quote
  against the permalink when you can.
  `curl -sS "https://api.fxtwitter.com/<handle>/status/<id>"` → `.tweet.text`. Measured on
  `2100021593284211197` (@Steve_Yegge) — 2026-09-19 on Cowork, and re-checked the same day on local
  Claude Code: `tweet-result` ends mid-sentence at `"…won't get better for a"`, fxtwitter carries the
  whole body through `"…won't get better for a year. Enjoy!"` (the Cowork run confirmed it
  identical to what the browser rendered). It works with or without a browser `-A` user agent. Its
  payload also has `is_note_tweet`, `t.co` links already expanded under
  `raw_text.facets[].replacement`, the `card`, `quoted_tweet`, and counters `tweet-result` omits —
  `views`, `bookmarks`, `quotes`, `retweets`. ⚠️ It is a third-party mirror: cross-check anything
  load-bearing against the page, and it only sees publicly visible posts (same limit as
  `tweet-result`).
  ⚠️ **`api.vxtwitter.com` is NOT a substitute, for two separate reasons.** With a browser
  `-A 'Mozilla/5.0'` it returns a Cloudflare «Just a moment…» page (HTTP 200, HTML, not JSON) —
  easy to misread as a malformed response rather than a bot wall. Without `-A` it does return JSON,
  but its `text` for that same long post was **63 characters** — shorter than even `tweet-result`.
  (Both measured 2026-09-19 on local Claude Code.) Go to fxtwitter or the page.

  ⚠️ **IN THE BROWSER, FIRST TRY THE TWEET'S OWN PERMALINK — a truncated `note_tweet` is a property of the
  CONTEXT it is embedded in, not of being logged out.** Measured in both directions on one pair of
  tweets: the same long tweet renders **in full, with no "Show more" click at all**, when you open
  `x.com/<handle>/status/<id>` directly, while it arrives truncated when read from a timeline, a
  search result or a quote-tweet card. So the cheap path is one navigation, not a pixel pipeline.
  On the permalink, `article.innerText` is readable once the query-string material is defanged the
  way this skill already does elsewhere (`.replace(/[?&=]/g,' ')` plus stripping URLs) — the
  `[BLOCKED: …]` response below is the editor reacting to that text, not a hard block. ⚠️ That
  sanitiser also eats the prose's own question marks, and any surviving `?` blocks the whole return
  (see `references/browser-traps.md`) — so for a verbatim body swap them for a sentinel instead
  (`.replace(/\?/g,'⟨Q⟩')`, likewise `&`/`=`) and turn it back on your side. **Only if
  the permalink still truncates** do you need the checks and the expansion steps below.
  Second measurement, 2026-09-19 on `2099925682726002904` (`note_tweet` = `{id}` only): the logged-in
  permalink's `[data-testid="tweetText"]`.innerText gave the full **426** characters with no "Show
  more" control at all, against syndication's truncated **277**. On such a post it is the
  **self-thread** tweets that still need expanding (2 of 6 were clipped there):
  `document.querySelectorAll('[data-testid="tweet-text-show-more-link"]').forEach(l=>l.click())`
  opened both in one call — the testid is safe; only the free-text hunt below is not.

  ⚠️ **`note_tweet` present does not by itself mean the post needs a "Show more" click — and
  neither does `n=0` on the show-more-link selector prove completeness on its own: the 274-char
  case above ALSO had no "Show more" control anywhere in the article, and was still truncated.**
  Neither signal alone is proof; comparing the two candidate texts and preferring whichever is
  longer is corroborating evidence, of the same kind that pointed the other way in the 274-char case
  (there the JSON was longer, here the DOM is) — not a guarantee, since both copies could in
  principle be cut at different points. Measured 2026-09-13 on
  `x.com/OpenAI/status/2097394956457623964`: `note_tweet` was present carrying only `{id}`, and the
  syndication `text` ended mid-clause at `- Comment-based https://t.co/…` (the long-form
  signature). On the logged-in permalink page, `[data-testid="tweetText"]`.textContent (311
  characters) was longer than the syndication copy and read as a complete sentence, and
  `[data-testid="tweet-text-show-more-link"]` also returned `n=0` there — two corroborating signals
  agreeing, which is worth more than either alone. So: **compare DOM length against syndication
  length before budgeting a screenshot walk; when the DOM is already longer, reads complete, and
  the show-more selector is empty, that's strong enough to stop with no click and no screenshot —
  though if anything about the ending still looks cut off, it's cheap to double-check `n>0` before
  trusting it.** When the show-more selector DOES return `n>0`, click it and re-read the DOM
  directly — no screenshot needed there either. Fall further to the click-and-screenshot path below
  only when the `tweetText` testid is absent entirely (`n=0` on it too, not just on the show-more
  link) — the logged-out case, where there is no DOM text to compare in the first place (the
  show-more control itself can still be there and clickable; see below).

  ⚠️ **On a logged-out page where the permalink did not help, "go back to the page for it" means
  click "Show more" and
  screenshot — not read the DOM.** Measured on a `note_tweet` post: both DOM reads that would
  normally get the body are dead on the logged-out build of X.
  `document.querySelectorAll('[data-testid="tweetText"]')` returns **n=0** — that `testid` simply
  does not exist in the logged-out DOM, and a selector that matches nothing silently returns empty
  strings rather than erroring (the same "instrument never moved" trap as elsewhere in this skill,
  not a sign the tweet has no text). `article.innerText` returns
  `[BLOCKED: Cookie/query string data]` from the chrome MCP's editor. So on logged-out X, the only
  reliable reader of a long tweet's body is a **pixel, not the DOM**: on the conversation page,
  click the tweet's own "Show more" / "Показати більше" link, then
  `computer(action=screenshot)`. The expansion is **inline** — no navigation happens, so any
  `window`/`sessionStorage` accumulator on the page survives it — and this works even fully logged
  out. ⚠️ **One screenshot only captures the viewport.** A `note_tweet` body long enough to need
  "Show more" is frequently taller than the viewport too — the same cropping risk Step 6 already
  flags for images (SKILL.md Step 6). Scroll and take overlapping screenshots (or a full-page capture, if the
  driver has one) until you reach the end, rather than assuming a single frame caught the whole
  expansion.

  ⚠️ **Do not go hunting for a "Show more" button with a text match over `button,span,div[role=button]`.**
  Tried on that same page: the match hit an unrelated element and navigated the tab to
  `/explore/tabs/for-you`, losing the page and every `window` accumulator on it.

