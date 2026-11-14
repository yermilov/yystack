---
name: read-twitter
description: >-
  Read ONE X/Twitter post through a logged-in browser and return it as Markdown — the body, the
  author's self-thread, notable replies, a quoted post, attached images read as pixels, native video,
  and the real content behind every t.co link. Use when an x.com / twitter.com URL appears and its
  content matters: reading a post, a tweet thread, an X Article or its replies, following a link in a
  tweet, citing a tweet as prior art, or when a web fetch of x.com returned HTTP 402 — «прочитай
  твіт», «що там у треді». Several posts: run it once per post. Do not use for a
  bookmarks sweep or an X search (no single post to read), for a YouTube link in a tweet (hand it to watch-video), or for a non-X
  page a fetch can't read (fetch-web-sources). Read-only: never posts, replies, likes or unbookmarks.
  On a research brief it also checks the post's claims against their primary sources.
---

# read-twitter

Read an X / Twitter post and return it as Markdown. A plain web fetch gets **HTTP 402** on `x.com` (as of 2026-09)
because X gates anonymous reads, so this goes through a **browser-automation tool driving a profile
that is signed in to X**.

**One post, whatever it turns out to be** — a one-liner, a numbered thread, a long-form X Article, a
quote-tweet, a screenshot with the real content in its pixels, or a bare link to somebody else's repo.
Steps 1–8 get the post; the link recipes get the material it points at, which is usually where the
content actually lives.

Length verdict (§2): 2026-11-14 — ~430 lines, under the 500-line threshold. Depth lives in
`references/` (X-native mechanics, browser-instrument traps, post-specific link recipes, the
conditional dives, native video), per-host recipes for non-X sites live in `fetch-web-sources`, and the three
deterministic jobs in `scripts/`; what stays is the workflow and every
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

- **No browser at all** → with a shell and Bun you can still read one public post (a shell without
  Bun: `curl` the two endpoints in the web-fetch branch below):
  `bun run "SKILLDIR/scripts/x-post.ts" "<URL or id>"` (SKILLDIR is the folder this SKILL.md was
  loaded from) prints it as Markdown — full text, expanded links, photos at original size, the
  quoted post, and what it could not collect. It handles the traps of X's syndication endpoint (a
  missing `token` answers `{}`, a wrong post can come back for a right id, a long post's body is
  absent). An X Article: `bun run "SKILLDIR/scripts/x-article.ts" "<URL>"`. Say plainly that the
  self-thread and replies could not be collected. **No shell either, but a web-fetch tool** → fetch
  `cdn.syndication.twimg.com/tweet-result?id=<id>&lang=en&token=a` (keep the `token`) and
  `api.fxtwitter.com/<handle>/status/<id>`; an empty read is a claim about the fetch wrapper, not the
  post (`references/x-native.md`). `api.vxtwitter.com` is not a substitute for either
  (`references/x-native.md`). Only with no browser, no shell and no web fetch, or when every one of
  them came back empty, say the host cannot read X — never report an empty post.
  **Without `x-post.ts`, take the same values from the syndication JSON yourself**: links from
  `entities.urls[].expanded_url`, photos from `mediaDetails[]` with `type: "photo"` (append
  `?name=orig` to `media_url_https`), video per Step 6b, the quoted post from `quoted_tweet`. A host
  that can fetch JSON but cannot save or view an image or video file reports each one as "not read:
  this host cannot download media", never as absent.
- **A page-text read returns only the root article** on a status page, never the replies, and on a
  quote-tweet it merges the quoted post into the root body. Use it for a plain root's body only; the
  thread comes from Step 5.
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
6. Step 4b — detect the quoted post and read what renders in the nested subtree (conditional)
7. Step 4b — quoted post truncated or carrying links/media: Steps 3–6b on it in its own tab (conditional)
8. Step 5.1 — read the reply counter
9. Step 5.2 — scroll-and-collect the timeline
10. Step 5.3 — conversation search for the author's self-replies (an empty result runs the `from:` control)
11. Step 5.4 — ranked-view windows, when replies pass ~50 (conditional; not on a root-only read)
12. Step 5.5 — thin self-thread on a demo/claim → the author's later top-level posts (conditional; not on a root-only read)
13. Step 5.5 — old post with fresh replies → `quoted_tweet_id:` search (conditional; not on a root-only read)
14. Step 5.6 — pick the notable replies (conditional; not on a root-only read)
15. Step 6 — read every attached image
16. Step 6b — native video: list variants, read a contact sheet (conditional)
17. Step 6b — native video: `ffprobe` audio-stream check (conditional)
18. Step 6b — native video: `volumedetect` level check — a missing stream and a silent one differ (conditional)
19. Step 6b — native video speech: transcribe via watch-video, read before frames (conditional)
20. Step 6b — a claim about the video's captions, motion or music sync: the measurement in `references/native-video.md` (conditional)
21. Step 7 — follow embedded links; the close lists, per link, the resolved URL, self-media dropped or not, the host recipe applied (or "none") and whether the destination was read
22. Research brief only: linked material is a RETELLING — tag every figure with its primary source (conditional)
23. Research brief only: the post claims something ABOUT A CORPUS — download the dump and grep it (conditional)
24. Research brief only: the post announces a SOLVED problem — re-run it on the cited source, with a control (conditional)
25. Step 8 — format as Markdown
26. Step 8 — close every tab this run opened, including on a run that stopped early
Register the conditional steps too: one a branch makes moot is completed WITH THAT REASON, never
left open — an unfinished list at the end must mean something really is unfinished.
No such tool? SEARCH for one first — on hosts with deferred tools it exists but is not loaded, and
its name differs per host. Anything that creates items and marks them in progress and completed IS
that tool, whatever it is called. Search by that capability, then by any name you remember: one empty
result is evidence about the name; two are a real absence on this host — say so plainly, it is not
your mistake. It must be the SESSION's own planner, never an external tracker (Jira, Linear, a task
app): your bookkeeping is not their backlog. If there truly is none, keep the list in your
replies — state it once, name each item as you start it, account for every one at the end.

Invoked by another skill (a batch or bookmarks sweep), these items ADD to its list; its calling item
stays open until your last one closes.

## Step 1 — Validate the URL

Normalize to `https://x.com/<handle>/status/<id>`: accept `x.com`, `www.x.com`, `twitter.com`,
`mobile.twitter.com`, and mirror hosts that keep X's path (`fxtwitter.com`, `fixupx.com`,
`vxtwitter.com`, `fixvx.com`, a Nitter instance). A URL with no handle (`x.com/i/status/<id>`) or a bare `t.co`
link: open it in the browser and take the canonical URL from where it lands — the post's own
`/<handle>/status/<id>` link. With no browser, a handle-free id still works: the syndication URL needs
only the id, and `api.fxtwitter.com/i/status/<id>` answers too (it returns the handle). The bundled
scripts recognise `nitter.net` but not a self-hosted Nitter (its host name proves nothing), so hand
them the status id from such a URL. Anything that is not an X post after that: refuse with
`URL must be an x.com post (got <host>)`.

## Step 2 — Open a fresh tab

Always a **new** tab on the normalized URL; never reuse one the user is working in. Some drivers reuse
a tab when asked for a new one, so check the tab list after opening. Close it, and every other tab
this run opened, at the end (Step 8's last item) — including on a run that stops early.

## Step 3 — Navigate + wait for the article

X lazy-loads the post. A navigate that reports success is not proof you are on the page: re-read the
URL first. Then poll for an `article` element **for at least 60 s** before giving up — a status
page has mounted at ~16 s in one run and ~40–50 s in another, so a shorter budget reports a login wall
that isn't there. `n=0` in the first seconds is normal. The cheap readiness signal is the **tab title**,
which flips to the post's text the moment the article mounts. Only after 60 s fall back to the
login-wall branch (Edge cases) — and only once the positive login probe (Capability note) has failed.

## Step 4 — Extract from the article subtree

Read the article subtree (accessibility tree or DOM) and extract:

- **Author name and handle** — the two links at the top.
- **Timestamp** — the link whose text matches `<time> · <date>`. On a quote-tweet the nested
  article's timestamp is abbreviated (`Jul 13`, no `·`); the full pattern excludes it — don't switch to
  "the first `time` element", which picks up the quoted post's date on some layouts.
- **Stats** — the `[role="group"]` whose accessible name encodes replies / reposts / likes /
  bookmarks / views. **Read the reply count now** — Step 5 needs it.
- **Body text** — the text nodes of the article, with paragraph breaks at headings. **Stop at a
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
  reads shorter than the page, in the browser. No Bun → read the Article in the browser, or fetch
  `api.fxtwitter.com/<handle>/status/<id>` and read `tweet.article` (`references/x-native.md`).

## Step 4b — Read the QUOTED post, when there is one

A quote-tweet's argument lives in two places, and the post you were handed is usually the smaller half.
**Detect it:** a nested `article`, or a status link to a different id that isn't a `/photo/N` or
`/analytics` suffix. **Read it:** take what is rendered in the nested subtree; when it is truncated or
carries its own links or media, open `https://x.com/<other-handle>/status/<other-id>` in a new tab and
run Steps 3–6b on it. If the quoted author continued in a self-thread, Step 5 applies to them too.

**Attribute it separately** — its own `## Quoted post` block, never folded into the root body.
**Media belongs to one post each**: a `/photo/N` under the root's status path is the root's; media
inside the quote card — including a native video, which has no `/photo/N` link — is the quoted post's.
Report them separately, or an agent hunts the root for a video that isn't there.

The syndication endpoint's `quoted_tweet` is the cheapest way to confirm a quote and get its media —
but its nested `text` **can be clipped and `note_tweet` is absent there even when the post has one**.
Treat a nested `note_tweet` as *unknown*, never *absent*; take a quoted long post's body from
`api.fxtwitter.com` or its permalink. **Always check the returned `id_str` against the id you asked
for**, and refuse a mismatch: the bundled scripts treat a payload for another id as unreadable
(exit 2) rather than reporting it.

## Step 5 — Read the full thread (self-thread + notable replies)

The root `article` is only the root. The conversation timeline holds the author's continuation and
other people's replies — announcements are routinely continued there.

**Scope by intent, decided now.** A root-only ask ("read this tweet") still runs 5.1 (the counter),
5.2 (one collect pass) and 5.3 (the conversation search, where the artifact usually sits); 5.4–5.6
then close as "root-only read". "Explore the thread", a research brief, or an obvious part 1 of N →
run all of Step 5.

1. **Check the reply counter FIRST.** `reply:0` with one article is the correct, complete state.
2. **Scroll with real input, collect with a script — three beats that can't be merged:** a real-input
   scroll (8–10 wheel steps; on some drivers one step is capped, so raise the repeat, not the amount)
   → wait ~6 s → a **separate**, short page-script call (some bridges cap one at ~45 s and don't await
   a returned Promise) that sweeps `document.querySelectorAll('article')` into `sessionStorage`
   (page variables don't survive a navigation). Repeat until the article count stops growing across
   several passes, or you have enough.
   - ⚠️ **Never `window.scrollBy`** on a status page — it "succeeds", moves nothing, and the collector
     reports "no replies" over a full self-thread.
   - ⚠️ **Aim the scroll BELOW the root's media and read `window.scrollY` back** — a point inside a
     media carousel swallows the wheel and the page doesn't move. If `scrollY` didn't change, re-aim and
     measure again before concluding anything.
   - ⚠️ **Neither `scrollY` nor the article count alone proves the scroll worked** — each has lied in
     opposite directions. Treat disagreement as a signal; convergence is "the count stopped growing".
3. **Run conversation search after the page read — always.**
   `https://x.com/search?q=from%3A<handle>%20conversation_id%3A<root id>&f=live` lists the author's
   self-replies, and the artifact a reader is after (the repo, the prompt, the link) sat there,
   invisible on the status page, in all five measured cases (`references/x-native.md`; five posts,
   not a guarantee for the next one). Drop `from:` to
   reach everyone's replies — also the way out when the timeline never mounts (positive reply count,
   one article and a spinner after ~60–90 s and one reload). Do 3–4 scroll passes once it mounts,
   with the same real-input scroll and ~6 s wait as 5.2. **Empty result** → run the bare
   `from:<handle>&f=live` control (Capability note) before writing "no self-replies".
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
   only if that is empty — the explanation is often a separate post, not a reply. **A root older than
   ~2 weeks:** a dated window can come back empty for the search's own reason
   (`references/x-native.md`), so check the same window against a post you know is in it, or scroll
   `x.com/<handle>` with real input, before writing "never explained".
   **An OLD post whose replies restarted months later** → search `quoted_tweet_id:<root id>` first:
   a quote is a new conversation, so neither the page nor `conversation_id:` shows why it resurfaced.
6. **Notable replies** — the few that add signal: official accounts, high engagement, answers with docs
   or fixes. Skip jokes and reactions.
7. Links in the self-thread and notable replies feed Step 7.


## Step 6 — Read every attached image (always)

`alt` is almost never present, so **always read the pixels** of each `photo/<N>` — screenshots carry the
substance (changelogs, charts, code) the post only gestures at. The rule follows you to linked
articles: **their figures are images too** — read them, not just the prose around them.

**No browser** → take each photo's original-size URL (`x-post.ts` prints it; without the script,
the Capability note says where it sits in the JSON), save it into a fresh scratch directory and read
the file as an image; the same holds for an X Article's figures.

In a browser, for each `N`: first return Step 5's `sessionStorage` accumulator from a page-script call (the
photo tab may be a different tab or a driver may reset it, and the collected replies are gone), then, in a second tab, open
`https://x.com/<handle>/status/<id>/photo/<N>`, screenshot, and transcribe text
and code verbatim, summarize charts, name the subject. For dense text, zoom a region — ⚠️ on drivers
that take a region it is `[x1, y1, x2, y2]` (corners), not `[x, y, width, height]`; on drivers that
don't support region zoom (some return a full screenshot with a note saying so), zoom the page instead.
Say when a tall image was cropped. If a screenshot fails, say so for that image — never drop it silently.

## Step 6b — Native video (when any read post carries one)

1. `bun run "SKILLDIR/scripts/x-video-variants.ts" "<status id>"` lists every native video on the post AND its
   quoted post: the highest-bitrate mp4, the duration in seconds, and a contact-sheet grid. A reply's
   or a parent's video needs its own call with that post's id. No Bun → `curl` the syndication URL
   (Capability note) and take, per video, `mediaDetails[].video_info.variants` (the `video/mp4`
   ones by `bitrate`: highest = `mp4`, the rest = `smaller`), `duration_millis` (milliseconds) and
   `media_url_https` (the `poster`); pick the sheet rate yourself as 1 fps, or 36 ÷ seconds for a
   clip over 36 s.
2. Download each mp4 into its own fresh scratch directory and read one contact sheet (`ffmpeg` `tile=<C>x<R>`,
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
6. **The post makes a claim about the video itself** → measure it rather than eyeballing frames
   (`references/native-video.md` has each protocol): burned-in captions → read the subtitle band
   from tiled crops, no transcription needed; "stop motion" / "no flicker" → frame-difference
   curve; "timed with the music" → cut-versus-onset test against a shifted-offset null.

## Step 7 — Follow embedded links

1. **Resolve `t.co` in the browser** — navigate and read the final URL (a web fetch of `t.co` returns
   empty; other shorteners such as `goo.gle` resolve the same way). With no browser, the links come already expanded from the post's own entities (`x-post.ts`, or
   `entities.urls[].expanded_url` in the JSON).
2. **Detect self-media** — a destination of `…/status/<id>/video/1` or `/photo/<N>` is the post's own
   media, not a link; drop it from the list.
3. **Read the destination when it matters** (the user asked, or it carries the post's point) — page text
   for prose, a screenshot for visual pages. Read-only: decline cookie banners, never sign in, buy or
   submit anything, and never click through a form — Typeform and the like save partial answers in
   the user's name.
4. Post body only? Just list the resolved destinations (real URL + title).

Non-X destinations: **read their host recipe first** — general per-host recipes (vendor blogs, docs
sites, GitHub, Hugging Face, AI-built demos, WebGL, Medium, Vercel, Framer, OpenAI, Typeform, Luma,
SEC/EDGAR) belong to `fetch-web-sources`: load it and follow its recipe for that host, which
overrides a plain fetch. One rule holds for every host: **a fetch tool that returns a generated
summary** (rather than the page's bytes) gives orientation only, never a number or a quote; take the
bytes, and read charts as images.

The post-specific rulings (detail: `references/source-recipes.md`; X-native ones:
`references/x-native.md`):

- **YouTube** → hand off to `watch-video`.
- **A screenshot of a LIVE docs page** — the page may have been revised since; diff the live text
  against the picture before calling either "the source".
- **A launch post** → its Hacker News thread via Algolia: the founder's replies there often answer
  what the X thread does not.
- **An old post with fresh replies, X Articles, self-thread search, the syndication endpoint** →
  `references/x-native.md`; **CDN media** (a video, or a media node with no `/photo/<N>` link) →
  `references/native-video.md`.

## Three conditional dives — when the linked material changes what "read" means

**Only on a research brief** ("research this", "is this true?", "check the claim"). A request for the
post's text stops at Step 7, and items 22–24 close with that reason. Full text, evidence and recipes:
`references/conditional-dives.md`. The rulings:

- **The linked material is a RETELLING** (a journalist's, a thread's or a blog's summary of primary
  documents) → tag every figure you report with the primary source it came from, and say which you
  could not trace. A retelling merges sources and drops qualifiers; when a figure matters, read the
  primary.
- **The post claims something ABOUT A CORPUS** ("this wiki says X 40 times", "every page of the dump
  shows Y") → download the dump and grep it rather than trusting the claim or reading pages one by one.
  Diff revisions of append-only pages, probe paraphrases (a keyword sweep is not a semantic read), and
  keep the corpus out of the main context — a subagent where your host has one.
- **The post announces a SOLVED problem** (a decoded text, a cracked benchmark) → re-run the mechanism
  yourself on the source text the claim cites, with a control — only when the rule is executable from
  public material; otherwise report "not replicated" and why.

## Trust the instrument — the one-line rulings

Every one of these has produced a confident wrong reading; measurements in `references/browser-traps.md`:

- A **resize that reports success** may change nothing — read `innerWidth` and `innerHeight` back.
- Page-script calls have a **~45 s cap** on some bridges (as of 2026-09) even with short sleeps; the tool may **not
  await** a returned Promise; a long async loop in one call can wedge the automation path — keep calls
  short and loops outside the page.
- The bridge can **redact values** (two different messages) — a redaction is not an empty field.
- **Collapsed `<details>` content is absent from `innerText`**, and opening them on the live DOM does
  not fix it: reparse the raw HTML.
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
| Not logged into X | After the full 60 s poll the article is missing or shows a login prompt, and the positive login probe (Capability note) failed: read the text by the no-browser path (Capability note) and report that the thread and replies need a signed-in browser — ask the user to log into X there. Never earlier than 60 s. |
| Logged-out view, many replies | It renders the author's self-thread plus about one other reply, then "Continue in X". Report "logged-out view caps replies — notable replies not collected", never "no notable replies". |
| Post deleted / 404 | The page says "Hmm... this page doesn't exist" → "post not found". |
| Protected (locked) account | The article mounts **empty** and stays so through the 60 s poll — it reads like a slow mount. Screenshot it ("…limits who can view their Posts"); confirm with the syndication endpoint (`TweetTombstone`) plus a positive control on a known-public id. Don't look for the text in archive copies or third-party caches (Wayback, a Nitter cache) — the author restricted access. If the caller's brief carries an earlier transcription of the post, report it as such; otherwise report the post unreadable. |
| A `t.co` that resolves to the post's own media | Self-media — Images / Video, not Embedded links. |

## Bundled resources

- `references/x-native.md` — X Articles, the reply counter and engagement testids, an old post with new
  replies, self-thread / conversation search with measured windows, the syndication endpoint
  (`tweet-result`, `note_tweet`, `api.fxtwitter.com`). Read when Steps 3–6 branch there.
- `references/native-video.md` — pulling an X-native video's mp4, frame sampling, subtitle bands, audio
  checks, transcription, and the measurements for a motion or music-sync claim. Read when a post
  carries native video.
- `references/source-recipes.md` — the post-specific link recipes (a screenshot of a
  live docs page, a launch post's HN thread). General host recipes are `fetch-web-sources`'s.
- `references/conditional-dives.md` — the retelling, corpus and solved-problem dives in full.
- `references/browser-traps.md` — the measurements behind *Trust the instrument*.
- `references/trigger-tests.md` — the prompts that should and should not load this skill, and the run
  record. Read when you change the description.
- `scripts/x-post.ts` — one public post as Markdown with no browser (syndication + fxtwitter, the
  endpoint traps handled). Exit 1 = not found / protected, 2 = unreadable.
- `scripts/x-article.ts` — an X Article as Markdown with figures in place (fxtwitter, no browser).
  `--help` for usage; exit 1 = not an Article, 2 = unreadable.
- `scripts/x-video-variants.ts` — every native video on a post and its quoted post: best mp4,
  seconds, contact-sheet grid. Exit 1 = no video, 2 = unreadable.
