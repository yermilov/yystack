---
name: read-twitter
description: >-
  Read ONE X/Twitter post through a logged-in browser and return it as Markdown — the body, the
  author's self-thread, notable replies, a quoted post, attached images read as pixels, native video,
  and the real content behind every t.co link. Use when an x.com / twitter.com URL appears and its
  content matters: reading a post, a tweet thread, an X Article or its replies, following a link in a
  tweet, citing a tweet as prior art, or when a web fetch of x.com returned HTTP 402 — «прочитай
  твіт», «що там у треді». Do not use for a batch of posts or a bookmarks sweep (a batch skill should
  call this one per post), for a YouTube link in a tweet (hand it to watch-video), or for a non-X
  page a fetch can't read (fetch-web-sources). Read-only: never posts, replies, likes or unbookmarks.
---

# read-twitter

Read an X / Twitter post and return it as Markdown. A plain web fetch gets **HTTP 402** on `x.com` (as of 2026-09)
because X gates anonymous reads, so this goes through a **browser-automation tool driving a profile
that is signed in to X**.

**One post, whatever it turns out to be** — a one-liner, a numbered thread, a long-form X Article, a
quote-tweet, a screenshot with the real content in its pixels, or a bare link to somebody else's repo.
Steps 1–8 get the post; the link recipes get the material it points at, which is usually where the
content actually lives.

Length verdict (§2): 2026-11-14 — ~390 lines, under the 500-line threshold. Depth lives in
`references/` (X-native mechanics, browser-instrument traps, per-source recipes, the conditional dives,
native video) and the two deterministic jobs in `scripts/`; what stays is the workflow and every
branch condition, because each Step 5 ruling ends in a mid-scroll action an agent must take without
opening a file.

## When to use

- An `x.com` / `twitter.com` URL whose content matters (prior art, a claim to check, a tool to try).
- A web fetch of an X URL returned 402.
- A thread, an X Article, replies that carry follow-up detail, or a quote-tweet whose argument needs
  the quoted post.
- A `t.co` link in a post needs resolving or reading.
- The post is mostly a **screenshot** (a changelog, a chart, code) — Step 6 reads the pixels.
- **A YouTube link** in the post → hand it to `watch-video`. **A video hosted natively on X** → Step 6b.

## Capability note — the driver is not the method

The selectors, the slow article mount, the lightbox walk, `t.co` resolution and the thread-window rule
are facts about **X**, not about any one browser tool. Use whatever browser-automation tool your host
has; tool names below are written generically (navigate, read the page, run a page script, screenshot,
scroll with real input events).

- **No browser at all** → with a shell you can still read one public post's text: X's syndication
  endpoint `cdn.syndication.twimg.com/tweet-result?id=<id>&lang=en&token=a` and, for a long-form post,
  `api.fxtwitter.com/<handle>/status/<id>` (an X Article: `bun run "SKILLDIR/scripts/x-article.ts"
  "<URL>"`, where SKILLDIR is the folder this SKILL.md was loaded from); its photos via
  `mediaDetails[].media_url_https` with `?name=orig`. ⚠️ Keep the `token` parameter — without it the
  endpoint answers 200 with `{}` (as of 2026-11-13), which reads as an empty post. Say plainly that
  the self-thread and replies could not be collected. **No shell either, but a web-fetch tool** → fetch
  those two URLs with it; an empty read is a claim about the fetch wrapper, not the post
  (`references/x-native.md`). Only with no browser, no shell and no web fetch, or when every one of
  them came back empty, say the host cannot read X — never report an empty post.
- **Verify the login with a positive probe**: the profile link `[data-testid="AppTabBar_Profile_Link"]`
  (its `href` is the signed-in handle), or the `unlike` / `removeBookmark` testids that only a signed-in
  session renders. Some selectors that look like login tests don't exist on every X build (verified as
  of 2026-09) — don't conclude "logged out" from one missing element.
- **An empty X search is a claim about the search until a control agrees**: before writing "the author
  posted no self-thread", run a bare `from:<handle>&f=live` search as a positive control; if that is
  empty too, report "X search returned nothing, control included", and record the login probe's result.

## Step 0 — register the run

Register these as todo items now, before doing anything else, in whatever todo/plan tool this host
gives you — and while work remains keep exactly one in progress:
1. Step 1 — validate the URL
2. Step 2 — open a fresh tab
3. Step 3 — navigate + wait for the article (60 s budget)
4. Step 4 — extract from the article subtree ("Show more" expanded)
5. Step 4 — an X Article → `x-article.ts`, then check its stderr (conditional)
6. Step 4b — read the quoted post (conditional)
7. Step 5 — reply counter read; scroll-and-collect the timeline
8. Step 5.3 — conversation search for the author's self-replies
9. Step 5.4 — ranked-view windows, when replies pass ~50 (conditional)
10. Step 5.5 — thin self-thread on a demo/claim → the author's later top-level posts (conditional)
11. Step 5.5 — old post with fresh replies → `quoted_tweet_id:` search (conditional)
12. Step 5.6 — pick the notable replies (scope by intent)
13. Step 6 — read every attached image
14. Step 6b — native video: list variants, read a contact sheet (conditional)
15. Step 6b — native video audio: `ffprobe` stream check AND `volumedetect` level check (conditional)
16. Step 6b — native video speech: transcribe via watch-video, read before frames (conditional)
17. Step 7 — follow embedded links
18. Linked material is a RETELLING — tag every figure with its primary source (conditional)
19. The post claims something ABOUT A CORPUS — download the dump and grep it (conditional)
20. The post announces a SOLVED problem — re-run the mechanism on the cited witness, with a control (conditional)
21. Step 8 — format as Markdown, then close every tab this run opened
Register the conditional steps too: one a branch makes moot is completed WITH THAT REASON, never left
open. No such tool? SEARCH for one first — on hosts with deferred tools it exists but is not loaded,
and its name differs per host; anything that creates items and marks them in progress and completed IS
that tool. It must be the SESSION's own planner, never an external tracker. If there truly is none,
keep the list in your replies and account for every item at the end. Invoked by another skill (a batch
or bookmarks sweep), these items ADD to its list; its calling item stays open until your last one closes.

## Step 1 — Validate the URL

Normalize to `https://x.com/<handle>/status/<id>`: accept `x.com`, `www.x.com`, `twitter.com`,
`mobile.twitter.com`, and mirror hosts that keep X's path (`fxtwitter.com`, `fixupx.com`,
`vxtwitter.com`, a Nitter instance). A URL with no handle (`x.com/i/status/<id>`) or a bare `t.co`
link: open it in the browser and take the canonical URL from where it lands — the post's own
`/<handle>/status/<id>` link. With no browser, a handle-free id still works: the syndication URL needs
only the id, and `api.fxtwitter.com/i/status/<id>` answers too (it returns the handle). Anything that is not an X post after that: refuse with
`URL must be an x.com post (got <host>)`.

## Step 2 — Open a fresh tab

Always a **new** tab on the normalized URL; never reuse one the user is working in. Close it, and
every other tab this run opened, at the end (the Step 8 item) — including on a run that stops early.

## Step 3 — Navigate + wait for the article

X lazy-loads the post. Poll for an `article` element **for at least 60 s** before giving up — a status
page has mounted at ~16 s in one run and ~40–50 s in another, so a shorter budget reports a login wall
that isn't there. `n=0` in the first seconds is normal. The cheap readiness signal is the **tab title**,
which flips to the post's text the moment the article mounts. Only after 60 s fall back to the
login-wall branch (Edge cases) — and only once the positive login probe (Capability note) has failed.

## Step 4 — Extract from the article subtree

Read the article subtree (accessibility tree or DOM) and extract:

- **Author name and handle** — the two links at the top.
- **Timestamp** — the link whose text matches `<time> · <date>`. ⚠️ On a quote-tweet the nested
  article's timestamp is abbreviated (`Jul 13`, no `·`); the full pattern excludes it — don't switch to
  "the first `time` element", which picks up the quoted post's date on some layouts.
- **Stats** — the `[role="group"]` whose accessible name encodes replies / reposts / likes /
  bookmarks / views. **Read the reply count now** — Step 5 needs it.
- **Body text** — the text nodes of the article, with paragraph breaks at headings. ⚠️ **Stop at a
  nested `article`**: on a quote-tweet the quoted post renders inside the root, and a naive walk
  attributes its words to the root author. Step 4b owns it.
- **Embedded links** — every external link (`t.co`-wrapped; the accessible name usually shows the real
  domain and title). Record both. A `t.co` can also point back to the post's own media.
- **Attached images** — links matching `/<handle>/status/<id>/photo/<N>`; record each `N`. `alt` text
  is usually empty — Step 6 reads the pixels.
- **A long post's body may be truncated** behind "Show more" (`[data-testid="tweet-text-show-more-link"]`);
  expand it, or open the permalink, which usually renders in full. With no browser use
  `api.fxtwitter.com` — the syndication endpoint carries only the `note_tweet` id, never its body.
- **An X Article** (the long-form format, a title over a card) →
  `bun run "SKILLDIR/scripts/x-article.ts" "<URL>"` renders it as Markdown with each image figure's URL
  in place; read each figure (Step 6). Embedded code blocks, posts and videos come out as
  `[embedded … — not rendered]` with a count on stderr — read those parts, and any article whose body
  reads shorter than the page, in the browser.

## Step 4b — Read the QUOTED post, when there is one

A quote-tweet's argument lives in two places, and the post you were handed is usually the smaller half.
**Detect it:** a nested `article`, or a status link to a different id that isn't a `/photo/N` or
`/analytics` suffix. **Read it:** take what is rendered in the nested subtree; when it is truncated or
carries its own links or media, open `https://x.com/<other-handle>/status/<other-id>` in a new tab and
run Steps 3–6b on it. If the quoted author continued in a self-thread, Step 5 applies to them too.

**Attribute it separately** — its own `## Quoted post` block, never folded into the root body.
⚠️ **Media belongs to one post each**: a `/photo/N` under the root's status path is the root's; media
inside the quote card — including a native video, which has no `/photo/N` link — is the quoted post's.
Report them separately, or an agent hunts the root for a video that isn't there.

⚠️ The syndication endpoint's `quoted_tweet` is the cheapest way to confirm a quote and get its media —
but its nested `text` **can be clipped and `note_tweet` is absent there even when the post has one**.
Treat a nested `note_tweet` as *unknown*, never *absent*; take a quoted long post's body from
`api.fxtwitter.com` or its permalink. **Always check the returned `id_str` against the id you asked
for** — the endpoint has served a different tweet's payload for a correct id.

## Step 5 — Read the full thread (self-thread + notable replies)

The root `article` is only the root. The conversation timeline holds the author's continuation and
other people's replies — announcements are routinely continued there.

1. **Scroll with real input, collect with a script — three beats that can't be merged:** a real-input
   scroll (8–10 wheel steps; on some drivers one step is capped, so raise the repeat, not the amount)
   → wait ~6 s → a **separate** page-script call that sweeps `document.querySelectorAll('article')` into
   `sessionStorage` (page variables don't survive a navigation). Repeat until the article count stops
   growing across several passes, or you have enough.
   - ⚠️ **Never `window.scrollBy`** on a status page — it "succeeds", moves nothing, and the collector
     reports "no replies" over a full self-thread.
   - ⚠️ **Aim the scroll BELOW the root's media and read `window.scrollY` back** — a point inside a
     media carousel swallows the wheel and the page doesn't move. If `scrollY` didn't change, re-aim and
     measure again before concluding anything.
   - ⚠️ **Neither `scrollY` nor the article count alone proves the scroll worked** — each has lied in
     opposite directions. Treat disagreement as a signal; convergence is "the count stopped growing".
2. **Check the reply counter FIRST.** `reply:0` with one article is the correct, complete state.
3. **Run conversation search after the page read — always, on someone else's post.**
   `https://x.com/search?q=from%3A<handle>%20conversation_id%3A<root id>&f=live` lists the author's
   self-replies, and the artifact a reader is after (the repo, the prompt, the link) has sat there,
   invisible on the status page, in every measured case (`references/x-native.md`). Drop `from:` to
   reach everyone's replies — also the way out when the timeline never mounts (positive reply count,
   one article and a spinner after ~60–90 s and one reload). Do 3–4 scroll passes once it mounts,
   with the same real-input scroll and ~6 s wait as 5.1.
4. **Ranked-view ceiling** — on a root with many replies (suspicious past ~50), scrolling plateaus well
   short of the counter: that is X's capped "Relevant" view, not the end. Use the same
   `conversation_id:` search with overlapping `since_time:` / `until_time:` windows sized to how the
   replies arrived (hours wide for replies; seconds wide for a burst-posted self-thread), accumulate in
   `sessionStorage`, expand "Show more" before each pass, and stop after three consecutive quiet windows.
   Report "read N of M replies", never "read the thread". (Measured windows and counts:
   `references/x-native.md`.)
5. **Self-thread** — every reply by the root author; treat it as the post's continuation (it usually
   carries the caveats, docs links and "how it works"). **A demo or claim whose self-thread is thin**
   → before writing "the author never explained" (and only after the bare `from:<handle>` control
   in the Capability note came back non-empty), also search the author's later top-level posts:
   `from:<handle> since:<root date> until:<root date + 2 days> -filter:replies`, widening `until:`
   only if that is empty — the explanation is often a separate post, not a reply.
   **An OLD post whose replies restarted months later** → search `quoted_tweet_id:<root id>` first:
   a quote is a new conversation, so neither the page nor `conversation_id:` shows why it resurfaced.
6. **Notable replies** — the few that add signal: official accounts, high engagement, answers with docs
   or fixes. Skip jokes and reactions.
7. Links in the self-thread and notable replies feed Step 7.

Scope by intent: root only → keep this light; "explore the thread" or an obvious part 1 of N → walk
the whole self-thread and harvest notable replies.

## Step 6 — Read every attached image (always)

`alt` is almost never present, so **always read the pixels** of each `photo/<N>` — screenshots carry the
substance (changelogs, charts, code) the post only gestures at. The rule follows you to linked
articles: **their figures are images too** — read them, not just the prose around them.

For each `N`: in a second tab (the post tab holds Step 5's `sessionStorage` accumulator), open
`https://x.com/<handle>/status/<id>/photo/<N>`, screenshot, and transcribe text
and code verbatim, summarize charts, name the subject. For dense text, zoom a region — ⚠️ on drivers
that take a region it is `[x1, y1, x2, y2]` (corners), not `[x, y, width, height]`; on drivers that
don't support region zoom (some return a full screenshot with a note saying so), zoom the page instead.
Say when a tall image was cropped. If a screenshot fails, say so for that image — never drop it silently.

## Step 6b — Native video (when any read post carries one)

1. `bun run "SKILLDIR/scripts/x-video-variants.ts" "<status id>"` lists every native video on the post AND its
   quoted post: the highest-bitrate mp4, the duration in seconds, and a contact-sheet grid. A reply's
   or a parent's video needs its own call with that post's id.
2. Download each mp4 into its own `mktemp -d` and read one contact sheet (`ffmpeg` `tile=<C>x<R>`,
   at the script's `sheet.fps`, which it lowers for long clips so one sheet stays ≤36 cells); fall
   back to full-size frames when text in the frame is what matters (`references/native-video.md`).
   **A long clip** (minutes, or speech you will transcribe) → download the lowest entry in `smaller`
   instead (when `smaller` is empty, `mp4` is the only variant): frames and audio need a few hundred
   pixels, not the top bitrate. **No `ffmpeg` on this host** → read the `poster` frame the script
   prints, and report each check that needs it — frames, the audio stream and level, transcription —
   as "not done: no ffmpeg on this host", never as "video unreadable" or "no audio".
3. **Before saying anything about audio**: `ffprobe` for an audio stream, then `volumedetect` for its
   level. A missing stream and a silent stream are different findings.
4. **Speech → transcribe it** with `watch-video`'s local-file mode (it asks before a first-run model
   download) and read the transcript before the frames.
5. Name whose video it is in the report — the root's, the quoted post's, a reply's.

## Step 7 — Follow embedded links

1. **Resolve `t.co` in the browser** — navigate and read the final URL (a web fetch of `t.co` returns
   empty).
2. **Detect self-media** — a destination of `…/status/<id>/video/1` or `/photo/<N>` is the post's own
   media, not a link; drop it from the list.
3. **Read the destination when it matters** (the user asked, or it carries the post's point) — page text
   for prose, a screenshot for visual pages. Read-only: no logins, no forms, decline cookie banners,
   no irreversible clicks.
4. Post body only? Just list the resolved destinations (real URL + title).

Non-X destinations may go to a web fetch once `t.co` is resolved — **but check the per-source recipe
first**; a recipe always overrides this paragraph.

**Per-source rulings** (detail and measurements: `references/source-recipes.md`, X-native ones in
`references/x-native.md`; read the entry for the host in front of you):

- **YouTube** → hand off to `watch-video`.
- **Vendor blogs / announcement pages** (and any host whose fetch tool returns a generated summary
  rather than the page's bytes) — that summary is orientation only, never the source of a number or
  quote; take the bytes with `curl --fail-with-body` and check the
  exit status. Charts are images — read them.
- **A screenshot of a LIVE docs page** — the page may have been revised since; diff the live text
  against the picture before calling either "the source".
- **Bot-blocked hosts** (a 403, or a 202 with a tiny body) → facts about the fetcher; open the browser.
- **Framer sites** → one `curl` of the search-index JSON. **Launch posts** → their Hacker News thread via
  Algolia. **OpenAI-style docs** → the `.md` twin.
- **GitHub** — on a sandboxed host, probe `api.github.com` once (a 403 may be the egress proxy, not the
  repo); pin raw reads to a commit SHA; run a positive control before reporting "the repo doesn't
  contain X".
- **Medium** — often a teaser; check the author's own domain. **Vercel 429 "Security Checkpoint"** — a
  bot challenge, not an empty site; read it in the browser.
- **A demo of an AI-built app** — the deployed bundle is the primary source: read every JS chunk before
  claiming a feature is absent.
- **A model release** — the HuggingFace repo is the artifact; a file's bytes are a FLOOR on memory —
  they can qualify a "runs on N GB" claim, never confirm one. **A model named in a post** → resolve it
  in model registries (quote both when they disagree), not the browser.
- **A WebGL / three.js demo** — on a software renderer a wait means nothing if scene time is
  frame-coupled; read the animation's own progress, and say which states you did not reach.
- **SEC / EDGAR filings** → `curl` the atom feed and the filing, not a fetch or search tool; a blank
  figure in a pre-pricing filing means "not disclosed in this filing" — never fill it in.
- **OpenAI announcements** → the page text for prose, the embedded chart datasets for the numbers.
  **Google developer docs** → one page-text read returns the whole article.
- **Typeform** — 🔴 never click through: it saves partial answers in the user's name; read the form's
  inline field model. **Luma** → the public calendar JSON.
- **An old post with fresh replies, X Articles, self-thread search, the syndication endpoint, CDN
  media** → `references/x-native.md`.
- For any docs page or repo a plain fetch can't see, `fetch-web-sources` has the general ladder.

## Three conditional dives — when the linked material changes what "read" means

Full text, precedents and recipes: `references/conditional-dives.md`. The rulings:

- **The linked material is a RETELLING** (a journalist's, a thread's or a blog's summary of primary
  documents) → tag every figure you report with the primary source it came from, and say which you
  could not trace. A retelling merges sources and drops qualifiers; when a figure matters, read the
  primary.
- **The post claims something ABOUT A CORPUS** ("this wiki says X 40 times", "every page of the dump
  shows Y") → download the dump and grep it rather than trusting the claim or reading pages one by one.
  Diff revisions of append-only pages, probe paraphrases (a keyword sweep is not a semantic read), and
  keep the corpus out of the main context — a subagent where your host has one.
- **The post announces a SOLVED problem** (a decoded text, a cracked benchmark) → re-run the mechanism
  yourself on the cited witness — the exact one the claim used — with a control, within a
  feasibility gate.

## Trust the instrument — the one-line rulings

Every one of these has produced a confident wrong reading; measurements in `references/browser-traps.md`:

- A **resize that reports success** may change nothing — read `innerWidth` back.
- Page-script calls have a **~45 s cap** on some bridges (as of 2026-09) even with short sleeps; the tool may **not
  await** a returned Promise; a long async loop in one call can wedge the automation path — keep calls
  short and loops outside the page.
- The bridge can **redact values** (two different messages) — a redaction is not an empty field.
- **Collapsed `<details>` content is absent from `innerText`**; open them on a copy, not the live DOM.
- Some drivers **reuse a tab** when you ask for a new one — check the tab list after opening.
- A **navigate that reports success** is not proof you are on the page — re-read the URL.
- **In-browser video seeking is not a substitute for the `ffmpeg` path** — on at least one host the
  player didn't decode.
- A **whole browser can hang** (every call timing out, even on example.com) — test a second site before
  blaming X; a second connected browser may still work.

## Step 8 — Format as Markdown

```markdown
# @<handle> — <article title or first heading>

_<timestamp> · <replies> replies · <reposts> reposts · <likes> likes · <views> views_

<body paragraphs; headings as `##`, lists as bullets>

## Quoted post — @<quoted handle>
_<quoted timestamp>_ · https://x.com/<quoted handle>/status/<quoted id>
<quoted body — only for a quote-tweet; never folded into the body above>

## Thread (author continued)
<self-thread posts in order>

## Notable replies
- **@<handle>** — <reply + any resolved link>

## Embedded links
- <resolved URL> — <title>[ — <one-line summary if read>]

## Images
- **Image 1** — <transcription / description from the Step 6 screenshot>

## Video
- **Video 1** (root post) — <what the sampled frames show; whether an audio stream exists and whether
  it was silent, transcribed, or not transcribed>
- **Video 2** (@<handle>'s quoted post / reply — <status URL>) — <same>
```

Include **Thread**, **Notable replies** and **Embedded links** only when non-empty (links resolved,
never raw `t.co`, never self-media). **Images** is required whenever the post has images, populated from
screenshots, never from `alt`. **Video** is required whenever any read post carries a native video;
prefer sampled frames over the poster frame, never declare a video unreadable outright, and **name
whose video it is** when it isn't the root's. Say what you could not read, and why, in the section it
belongs to — "replies could not be collected: logged-out view" is a finding; "no notable replies" would
be a false one.

## Edge cases

| Case | Behaviour |
|------|-----------|
| Not logged into X | After the full 60 s poll the article is missing or shows a login prompt: read the text by the no-browser path (Capability note) and report that the thread and replies need a signed-in browser — ask the user to log into X there. Never earlier than 60 s. |
| Logged-out view, many replies | It renders the author's self-thread plus about one other reply, then "Continue in X". Report "logged-out view caps replies — notable replies not collected", never "no notable replies". |
| Post deleted / 404 | The page says "Hmm... this page doesn't exist" → "post not found". |
| Protected (locked) account | The article mounts **empty** and stays so through the 60 s poll — it reads like a slow mount. Screenshot it ("…limits who can view their Posts"); confirm with the syndication endpoint (`TweetTombstone`) plus a positive control on a known-public id. Don't look in archives or mirrors — the author restricted access. If the caller's brief carries an earlier transcription of the post, report it as such; otherwise report the post unreadable. |
| A `t.co` that resolves to the post's own media | Self-media — Images / Video, not Embedded links. |

## Bundled resources

- `references/x-native.md` — X Articles, the reply counter and engagement testids, an old post with new
  replies, self-thread / conversation search with measured windows, the syndication endpoint
  (`tweet-result`, `note_tweet`, `api.fxtwitter.com`), CDN media. Read when Steps 3–6 branch there.
- `references/native-video.md` — pulling an X-native video's mp4, frame sampling, subtitle bands, audio
  checks and transcription. Read when a post carries native video.
- `references/source-recipes.md` — per-source recipes for the links a post points at. Read the one for
  the host in front of you.
- `references/conditional-dives.md` — the retelling, corpus and solved-problem dives in full.
- `references/browser-traps.md` — the measurements behind *Trust the instrument*.
- `scripts/x-article.ts` — an X Article as Markdown with figures in place (fxtwitter, no browser).
  `--help` for usage; exit 1 = not an Article, 2 = unreadable.
- `scripts/x-video-variants.ts` — every native video on a post and its quoted post: best mp4,
  seconds, contact-sheet grid. Exit 1 = no video, 2 = unreadable.
