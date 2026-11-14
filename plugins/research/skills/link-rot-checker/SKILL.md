---
name: link-rot-checker
description: >-
  Check whether a batch of URLs is still alive and offer replacements for the dead ones. Use when the
  user wants to verify links before reusing or forwarding them — "check these links", "are these
  still working", "find the dead/broken links", "which of these listings are gone", "validate my
  bookmarks / reading list / citations", «перевір посилання», «чи живі» — or when a saved message,
  draft or old chat holds URLs that may have expired (classified ads, listings, sale and event pages,
  articles) and another skill hands them over. Do not use for a single link (just open it), for
  crawling a whole site or repo for broken links (a link-checker tool in CI does that), nor for
  reading a page's content when the fetcher returns nothing (that's fetch-web-sources).
---

# Link Rot Checker

Decide, for each URL in a batch, whether it is **alive**, **dead**, or **unknown** — and say which
marker you based that on. The hard part is not fetching; it is not mistaking a soft-404, a bot check,
a blocked shell or a wrong id for a verdict. One link is not worth this skill — open it and look.

## Step 0 — register the run

Register these as todo items now, before doing anything else, in whatever todo/plan tool this host
gives you — and while work remains keep exactly one in progress:
1. Fetch pass — the script over the whole batch (§ 1)   2. Markers per site — one item per site:
dead marker and alive marker (§ 2)   3. Made-up-id control — one item per site, closed with its
result or "skipped: real 404/410" (§ 2)   4. Marker re-run — the script with `--dead`/`--alive`, one
item per site (§ 1)   5. Browser pass — one item per link still BLOCKED, NEEDS-BROWSER, REDIRECTED
or CHECK (§ 3)   6. Classify — one item per link (§ 4)   7. Replacements — only if wanted (§ 5)
8. Report (§ 6)
Register the conditional steps too: one a branch makes moot is completed WITH THAT REASON, never
left open — an unfinished list at the end must mean something really is unfinished.
No such tool? SEARCH for one first — on hosts with deferred tools it exists but is not loaded, and
its name differs per host. Anything that creates items and marks them in progress and completed IS
that tool, whatever it is called. Search by that capability, then by any name you remember: one empty
result is evidence about the name; two are a real absence on this host — say so plainly, it is not
your mistake. It must be the SESSION's own planner, never an external tracker (Jira, Linear, a task
app): your bookkeeping is not their backlog. If there truly is none, keep the list in your
replies — state it once, name each item as you start it, account for every one at the end.

When another skill hands you the URLs, these items join its list and its calling item stays open
until your report is back; report to it, not straight to the user.

## 1. Fetch pass

```sh
bun run "SKILLDIR/scripts/check-links.ts" <url> <url> …        # or --file urls.txt, or on stdin
```

`SKILLDIR` is a placeholder: substitute the **literal** directory you loaded this `SKILL.md` from. No
Bun? Install it (`install-bun`), or do the same by hand per link —
`curl -sL -m 20 -A '<a browser user-agent>' -o page.html -w '%{http_code} %{url_effective}\n' '<url>'`
— plus one fetch of each site's homepage.

It fetches each link with a browser user-agent and, **once per site, the homepage as a control**: a
refused homepage means the refusals are about this shell, not the links. Each link gets one state —
`DEAD` (404/410 while the homepage answers, or your `--dead` regex matched), `ALIVE` (your `--alive`
regex matched), and pointers to the next step: `BLOCKED` (401/403/429/451/503, or the homepage is
refused too), `NEEDS-BROWSER` (a bot-check page, or under 100 characters of visible text),
`REDIRECTED` (ended on another site, or on a shallower page — often a category or search page, a
likely dead sign), `CHECK` (a page, no marker
yet), `UNKNOWN` (network error, timeout, other 5xx). Re-run it with `--dead` / `--alive` once § 2
gives you the markers (`--alive` is matched against the page title only, so a "related items" block
cannot pass for the item; compare each ALIVE title with the item the link should be) — one site per run (`--site <host>` when the batch spans several; the markers
then apply only there). Markers are never read on a bot-check page, and a homepage that is itself a
bot check counts as refused.

## 2. Markers per site — the method, not a site list

For every site in the batch, establish both markers before you classify — they depend on the kind of
page:

- **Dead marker** — the site's "removed / no longer available / not found" page or text. Many
  listing sites render a friendly removal page with HTTP **200**, so the status code alone is not
  enough there; a real 404/410 with the homepage answering is a dead marker on its own.
- **Alive marker** — something only a live item has: for a listing, its title in the page title plus
  a price or a seller block; for an article or a doc page, its own headline and body text (not a
  site-wide "page not found" with a 200). A page with neither marker — a bot check, or an empty
  client-rendered shell — is **unknown** until a re-read shows one.
- **The made-up-id control** — open the same URL shape with an id you invented. **Required** when the
  dead marker is a 200 page, or when the ids came from OCR or hand-typing. If the made-up id gets the
  same "removed" page, your dead marker cannot tell *removed* from *never existed*: report those
  links "dead or wrong id". If it gets a real-looking page, a page alone proves nothing — a made-up
  product id has resolved to an unrelated live product — so the alive marker must be this item's
  own title or id, not just "a product page". Skip it, with that reason, for links whose
  dead signal is a real 404/410.

Example of the shape (one classifieds site, verified 2026-10): a removed ad and a made-up id both
render "Ad removed by the author" with HTTP 200; a live ad's page title carries the listing title and
price. Put the markers you used, dated, in the report — sites change their pages.

## 3. Browser pass

Open every link the fetch pass left `BLOCKED`, `NEEDS-BROWSER`, `REDIRECTED` or `CHECK` in a
browser-automation tool; wait for the page to settle, then read its text or take a screenshot. On a
host with deferred tools, search for a browser capability before concluding there is none — two
empty searches are a real absence. **No browser** → those links stay `UNKNOWN (no browser)`.

## 4. Classify each link

A verdict needs a positive marker: `DEAD` or `ALIVE`, each naming its marker, or `DEAD OR WRONG ID`
when the dead marker also appears for a made-up id (§ 2); anything else is `UNKNOWN`, never a
guess. A link still unknown after a re-read: screenshot it and ask — or, when
another skill called you, return it as `UNKNOWN` with the reason instead of stopping its run. A false
"dead" erodes trust faster than an honest "couldn't tell".

## 5. Replacements — only on request

Ask whether the user wants replacements — or, when another skill called you, ask that caller (or
return without them); don't search unasked. Then, by kind:

- **A dead listing** (an ad, a sale or event page) → search the same site for fresh items matching
  the criteria the original implies (location, price range, the must-haves the user named), and hand
  back 2–3 links with a one-line summary each.
- **A dead article, doc page or citation** → look for an archived copy:
  `curl -s 'https://archive.org/wayback/available?url=<url>'` returns the closest snapshot, or an
  empty `archived_snapshots` (the endpoint answered both ways as of 2026-11). Also check whether the
  page simply moved — the site's own search for its title.

Never substitute a replacement into the original draft without approval — the user's preferences
may have shifted since it was written.

## What not to spend time on

- **Web archives for client-rendered listing sites** — snapshots are usually empty shells (the data
  loads by API after render), and the archive rate-limits bot traffic (seen 2026-10).
- **CAPTCHA-gated archive mirrors** and **search-engine caches** (Google's public cache was retired in
  2024).
- **Reconstructing an item from its URL** — listing ids are opaque.

## 6. Report

```
1. <url> — DEAD (removal page "Ad removed by the author", 200; a made-up id got a different page)
2. <url> — ALIVE (<title>, <price>)
3. <url> — DEAD (HTTP 404, homepage answers)
4. <url> — UNKNOWN (bot check, twice)
5. <url> — DEAD OR WRONG ID (removal page; id was OCR'd)
Markers: <site> — dead "<text>", alive "<what>" (checked <date>)
```

If everything is alive, say so in one sentence.

## Bundled resources

- `scripts/check-links.ts` — the fetch pass (`--help` for its options and states).
- `references/trigger-tests.md` — should-fire / should-not prompts; re-run them after any edit to
  the `description`.
