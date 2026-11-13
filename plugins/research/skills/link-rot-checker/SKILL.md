---
name: link-rot-checker
description: >-
  Check whether a batch of URLs is still alive and offer replacements for the dead ones. Use when the
  user wants to verify links before reusing or forwarding them — "check these links", "are these
  still working", "which of these listings are gone", «перевір посилання», «чи живі» — or when a
  saved message, draft or old chat holds URLs that may have expired (classified ads, listings, sale
  and event pages, articles) and another skill hands them over. Do not use for a single link (just
  open it), nor for reading a page's content when the fetcher returns nothing (that's
  fetch-web-sources).
---

# Link Rot Checker

Decide, for each URL in a batch, whether it is **alive**, **dead**, or **unknown** — and say which
marker you based that on. The hard part is not fetching; it is not mistaking a soft-404, a bot check
or a wrong id for a verdict. One link is not worth this skill — open it and look.

## The flow

Register the five steps below as TODOs and work the list — steps 3 and 5 as one item per URL, so a
batch cannot be closed after one link. **Register them in this session's own todo/plan tool — if
you don't see one, SEARCH for it before concluding there is none**: on hosts with deferred tools it
exists under a name you weren't looking for, and anything that creates items and marks them in
progress and completed IS it. Never an external tracker. If there genuinely is none, keep the list in
your replies and account for every item at the end. An item a branch makes moot (no link needed a
browser; nothing dead to replace) is completed with that reason, never left open.

1. **Fetch directly first** — `curl -sL -o /dev/null -w '%{http_code} %{url_effective}\n' '<url>'`, or
   the host's web-fetch tool. A clean 404/410, or a redirect to a category/search page, is a dead
   signal. Fast and cheap; do the whole batch this way first.
2. **Open the rest in a browser** — anything client-rendered, bot-checked, or that answered 200 with
   no recognisable content. Wait for the page to settle, then read its text or take a screenshot.
3. **Classify each link against TWO markers** — one for alive, one for dead (below). No positive
   marker either way → `unknown`, never a guess.
4. **When many are dead, offer replacements** — don't search unasked (§ Replacement).
5. **Report one line per link** (§ Output).

When another skill hands you the URLs, these steps add to its run; report back to it rather than
straight to the user.

## Markers — the method, not a site list

For every site in the batch, establish both markers before you classify:

- **Dead marker** — the site's "removed / no longer available / 404" page or text. Many classifieds
  sites render a friendly removal page with HTTP **200**, so the status code alone is not enough.
- **Alive marker** — something only a live item has: its title in the page title, a price, a seller
  block. A page with neither marker (a bot-check page such as Cloudflare's "Just a moment…", which
  some sites show localized, or an empty client-rendered shell) is **unknown** until a re-read shows
  one.
- **Control on a made-up id.** Open the same URL shape with an id you invented. If the site answers
  with the same "removed" page, your dead marker cannot tell *removed* from *never existed* — so for
  ids that came from OCR or hand-typing, report "dead or wrong id".

Example of the shape (one classifieds site, verified 2026-10): a removed ad and a made-up id both
render "Ad removed by the author" with HTTP 200; a live ad's page title carries the listing title
and price. Record markers like this for the sites you meet, dated — sites change their pages.

When a link stays `unknown` after a re-read, screenshot it and ask; a false "dead" erodes trust
faster than an honest "couldn't tell".

## What not to spend time on

- **Web archives for client-rendered listing sites** — snapshots are usually empty shells (the data
  loads by API after render) and the archive rate-limits bot traffic.
- **CAPTCHA-gated archive mirrors** and **search-engine caches** (Google's public cache was retired in
  2024). Skip them.
- **Reconstructing an item from its URL** — listing ids are opaque.

## Replacement

When links are dead and the user wants replacements, search the same site for fresh items matching
the criteria the original links imply (location, price range, the must-haves the user named). Hand
back 2–3 links with a one-line summary each and let the user pick; never substitute them into the
original draft without approval — preferences may have shifted since it was written.

## Output

```
1. <url> — DEAD (removal page)
2. <url> — ALIVE (<title>, <price>)
3. <url> — UNKNOWN (bot check, twice)
4. <url> — DEAD OR WRONG ID (removal page; id was OCR'd)
```

If everything is alive, say so in one sentence.
