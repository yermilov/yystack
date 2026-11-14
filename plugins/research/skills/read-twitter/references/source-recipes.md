# read-twitter — per-source recipes (depth)

Steps 1–8 of SKILL.md get you the post; this file holds the recipes that are specific to material a
post links to. General per-host recipes (vendor blogs, docs sites, GitHub, Hugging Face, demos, forms,
filings) live in `fetch-web-sources`'s `references/host-recipes.md`: read the section for the host in
front of you there.

**Index**

- **t.co and shorteners** — how to resolve a wrapped link.
- **YouTube** — which skill reads a video.
- **Screenshots of a live docs page** — how to tell a revised doc from a misquote.
- **Launch posts → Hacker News** — the comment tree and the founder's replies via Algolia.

---

## t.co and shorteners

**Resolve `t.co` in the BROWSER** — navigate and read the final URL. A web-fetch tool on a `t.co`
link returns empty. `goo.gle` resolves in-browser too.

---

## YouTube

**A YouTube link → hand off to the `research:watch-video` skill** rather than trying to watch it
in the browser; that skill does Gemini's native YouTube ingestion.

---

## Screenshots of a live docs page

**A tweet that quotes or screenshots a LIVE docs page (platform.claude.com/docs and the like): the
page may have been REVISED since the screenshot — diff the live text against the picture before
calling either one «the source».** Measured 2026-11-13 on one post screenshotting a vendor's
model-prompting guide: the image and the tweet gave one opening sentence, «about half» vs «under a
tenth», while the LIVE `.md` had a reworded opening, «about 75 percent», and +70–80 % output tokens
instead of ×1.5. Nobody
had misquoted; the doc moved.

Both texts are reachable: `curl -A "Mozilla/5.0"` on `<docs URL>.md` is the live text, and
`web.archive.org/cdx/search/cdx?url=<url>*&output=json` lists snapshots whose HTML you read at
`web.archive.org/web/<timestamp>/<url>` (plain form; the raw `…/web/<timestamp>id_/…` form returned
the «suspected abusive bot traffic» block page with HTTP 200 on the same host and run, so check the
body, not the status). Bisect by snapshot and report the window in which the wording changed, plus
which snapshots disagree with a third-party timestamp (a blog quoting the NEW wording «before» the
archive shows it is evidence of a staged or A/B rollout, not something to resolve by guessing).

---

## Launch posts → Hacker News

**A LAUNCH tweet → its Hacker News thread, via Algolia, no browser.** It is the cheapest source of
both the critical reception and the founder's own answers. Find it with
`https://hn.algolia.com/api/v1/search?query=<domain>&tags=story`, and pick the hit whose `url`
(host AND path), `title` and `created_at` match the launched page — `points` only ranks candidates,
it is not an identity check (a shared host like `github.com`, or a domain posted several times,
returns unrelated stories). Then `https://hn.algolia.com/api/v1/items/<objectID>` returns the whole
comment tree in one `curl` (254 KB for 496 comments). Save to a file and walk it in python — never
into the main loop: rank top-level comments by `len(children)` for the contested ones, and filter
the whole tree by `author` for every reply the founder wrote.

Measured 2026-09-19 on one launch thread (~1.9k points): the founder's ~20 HN replies answered
design questions that appear nowhere in the blog post or the X self-thread, while X's own replies on
that post hit the ranked-view ceiling (Step 5) at 10 mounted `article`s and surfaced only the
self-thread plus two congratulations.
