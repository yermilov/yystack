# read-twitter — per-source recipes (depth)

Steps 1–8 of SKILL.md get you the post; this file holds the recipes that are specific to material a
post links to. General per-host recipes (vendor blogs, docs sites, GitHub, Hugging Face, demos, forms,
filings) belong to `fetch-web-sources`: load it and follow its recipe for the host in front of you.
`t.co` resolution and the YouTube handoff are one-line rulings in SKILL.md Step 7 and are not
repeated here.

**Index**

- **Screenshots of a live docs page** — how to tell a revised doc from a misquote.
- **Launch posts → Hacker News** — the comment tree and the founder's replies via Algolia.

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
`web.archive.org/web/<timestamp>/<url>` (the plain form — `fetch-web-sources` §1.4 says why not the
raw `id_` form, and to check the body). Bisect by snapshot and report the window in which the wording changed, plus
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
comment tree in one `curl` (254 KB for 496 comments). Save to a file and query it with `jq` — never
into the main loop: rank top-level comments by reply count for the contested ones
(`jq -c '[.children[] | {author, id, replies: (.children | length)}] | sort_by(-.replies) | .[:10]'`),
and filter the whole tree by `author` for every reply the founder wrote
(`jq -r '.. | objects | select(.author? == "<founder>") | "\(.id): \(.text)"'`; the first hit is the
story itself when the founder posted it). Both verified 2026-11-14 on a public HN thread.

Measured 2026-09-19 on one launch thread (~1.9k points): the founder's ~20 HN replies answered
design questions that appear nowhere in the blog post or the X self-thread, while X's own replies on
that post hit the ranked-view ceiling (Step 5) at 10 mounted `article`s and surfaced only the
self-thread plus two congratulations.
