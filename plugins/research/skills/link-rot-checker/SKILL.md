---
name: link-rot-checker
description: >-
  Check whether a LIST of URLs you were given (two or more) is still alive and offer replacements for
  the dead ones. Use when the user wants to verify links before reusing or forwarding them — "check
  these links", "are these still working", "find the dead/broken links" among the URLs given (never
  a site to crawl for them), "which of these listings are gone", "validate my bookmarks / reading
  list / citations", «перевір посилання», «чи живі» — or
  when a saved message, draft or old chat holds URLs that may have expired (classified ads, listings,
  sale and event pages, articles) and another skill hands them over. Do NOT use for ONE link (just
  open it and say), for crawling a site you own to discover its broken links (a crawler such as
  lychee or linkchecker does that), nor for reading a page's content when the fetcher returns
  nothing (that's fetch-web-sources).
---

# Link Rot Checker

Decide, for each URL in a batch, whether it is **alive**, **dead**, or **unknown** — and say which
marker you based that on. The hard part is not fetching; it is not mistaking a soft-404, a bot check,
a blocked shell or a wrong id for a verdict. One link is not worth this skill — open it and look.

## Step 0 — register the run

Register these as todo items now, before doing anything else, in whatever todo/plan tool this host
gives you — and while work remains keep exactly one in progress:
1. Fetch pass — the script over the whole batch (§ 1)
2. Markers per site — one item per site: dead marker and alive marker (§ 2)
3. Live-item check — one item per site: the dead marker checked absent on one known-live item (§ 2)
4. Made-up-id control — one item per site, closed with its result or the reason it adds nothing (§ 2)
5. Marker re-run — the script with `--dead`/`--alive`, one item per site (§ 1)
6. Browser pass — every link still BLOCKED, NEEDS-BROWSER, REDIRECTED, CHECK or UNKNOWN, with the one
   exception § 3 names; close it with the count opened and the count still unknown (§ 3)
7. Classify — every link; close it with the counts per verdict (§ 4)
8. Ask about replacements (§ 5)
9. Replacement search — only after a yes; then add one sub-item per dead link (§ 5)
10. Report, with every link still `UNKNOWN` asked about in it (§ 4, § 6)

Items 2–5 start as one item each: once the fetch pass names the sites, split each into one sub-item
per site.

For a site the shell cannot read (BLOCKED, or a bot check on its homepage), do items 2–4 inside
item 6's browser pass and close item 5 "markers taken in the browser". A site whose links all got a
status verdict (404/410 with the homepage answering, or a domain that does not resolve) needs no
text marker: close items 2–5 for it with that reason.
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

Give it absolute `http(s)` URLs: resolve a relative link against the page or document it came from
first. A `mailto:` or other scheme comes back `UNKNOWN (not an http(s) link)` — there is no page to
check.

`SKILLDIR` is a placeholder: substitute the **literal** directory you loaded this `SKILL.md` from. No
Bun? Install it (`install-bun`); if you cannot, read `references/no-bun.md` for the same pass by hand.
No shell at all? Fetch each link and each site's homepage with the web-fetch tool you have and apply
the same states, in the order `references/no-bun.md` gives them.

It fetches each link with a browser user-agent and, **once per site, the homepage as a control**: a
refused homepage means a 404 is about this shell, not the link. States: `DEAD` and `ALIVE` are
verdicts (a status or your marker said so); `BLOCKED`, `NEEDS-BROWSER`, `REDIRECTED` (often a
category or search page — § 2 rules when that counts as dead), `CHECK` and `UNKNOWN` go on to
§ 3, which rules which of them a browser opens. `--help` has what triggers each.

Once § 2 gives you the markers, re-run it per site with `--dead '<regex>' --alive '<regex>'` (and
`--site <host>` when the batch spans several sites). An ALIVE line says the page has an item's
title *shape*, not that it is this item: compare each ALIVE title, and the price where it matters,
with the item the link should be. An "ended on" note means the link landed on another page of the
same site, so read the title against that page.

## 2. Markers per site — the method, not a site list

For every site in the batch, establish both markers before you classify — they depend on the kind of
page:

- **Dead marker** — the site's "removed / no longer available / not found" page or text. Many
  listing sites render a friendly removal page with HTTP **200**, so the status code alone is not
  enough there; a real 404/410 with the homepage answering is a dead marker on its own. Before you
  use a text marker, confirm it does **not** match one known-live item on that site — a sidebar
  saying "no results found" would otherwise turn live links dead. Take that item from the batch if
  one is clearly alive, else from the site's homepage or search. If you cannot reach any live item,
  the text marker is unconfirmed: the links it would call dead stay `UNKNOWN (dead marker
  unconfirmed)`.
- **Alive marker** — something only a live item has: for a listing, its title in the page title plus
  a price or a seller block (the script checks the title; the price or seller you check by hand); for an article or a doc page, its own headline and body text (not a
  site-wide "page not found" with a 200). An article whose `<title>` is generic stays `CHECK` in the
  script: read its headline and body with a web fetch, and open it in the browser only if that
  fails. A page with neither marker — a bot check, or an empty
  client-rendered shell — is **unknown** until a re-read shows one.
- **The made-up-id control** — open the same URL shape with an id you invented. **Required** when the
  dead marker is a 200 page or a redirect. If the made-up id gets the same "removed" page, your dead
  marker cannot tell *removed* from *never existed*: say so in the Markers line, and § 4 rules what
  it means for a typed id. If it gets
  a real-looking page, a page alone proves nothing — a made-up product id has resolved to an
  unrelated live product — so the alive marker must be this item's own title or id, not just "a
  product page". On a site whose dead signal is a real 404/410, a made-up id 404s too, so the
  control adds nothing: close item 4 with that reason.
- **A redirect** to a category, search or home page is a dead marker only when a made-up id
  redirects the same way; otherwise it is `UNKNOWN (redirected to <url>)`. A landing on another site
  is a dead marker when that page is a domain-parking or for-sale page (name the landing host); when
  it carries the same item, the page moved: `ALIVE`, naming the new URL; anything else is
  `UNKNOWN (redirected to <host>)`.

Example of the shape (one classifieds site, verified 2026-10): a removed ad and a made-up id both
render "Ad removed by the author" with HTTP 200; a live ad's page title carries the listing title and
price. Put the markers you used, dated, in the report — sites change their pages.

## 3. Browser pass

Open every link the fetch pass left `BLOCKED`, `NEEDS-BROWSER`, `REDIRECTED`, `CHECK` or `UNKNOWN`
in a browser-automation tool, with two exceptions that go straight to § 4: a `CHECK` article whose
headline and body a web fetch already confirmed (§ 2), and an `UNKNOWN` that is not an http(s) link
(there is no page to open). Wait for the page to settle, then read its text or take a screenshot. On
a host with deferred tools, search for a browser capability before concluding there is none — two
empty searches are a real absence. **No browser** → those links stay `UNKNOWN (no browser)`.

## 4. Classify each link

A verdict needs a positive marker: `DEAD` or `ALIVE`, each naming its marker. A dead link whose id
was OCR'd or typed by hand is `DEAD OR WRONG ID` instead: a mistyped id fails exactly like a removed
one. A link copied whole cannot carry a wrong id, so it stays `DEAD` even where a made-up id gets the
same page. A domain that no longer resolves, while a
control domain does, is a dead marker on its own (the script reports it); anything else is
`UNKNOWN`, never a guess. A link still unknown after a re-read: screenshot it and ask about it in the
report (with no browser: report it `UNKNOWN (no browser)` and ask) — or, when another skill called you, return it as
`UNKNOWN` with the reason instead of stopping its run. A false "dead" erodes trust faster than an
honest "couldn't tell".

## 5. Replacements — only on request

Ask whether the user wants replacements — or, when another skill called you, ask that caller (or
return without them); don't search unasked. Then, by kind:

- **A dead listing** (an ad, a sale or event page) → search the same site for fresh items matching
  the criteria the original implies (location, price range, the must-haves the user named), and hand
  back 2–3 links with a one-line summary each.
- **A dead article, doc page or citation** → look for an archived copy with `fetch-web-sources`'
  archived-copy step (its `wayback.ts`): a bare `archive.org/wayback/available` lookup can answer
  an empty result that is really a failed lookup, and only that script tells the two apart. Also
  check whether the page simply moved — the site's own search for its title.

Not worth the time in that search: web archives for client-rendered listing sites (snapshots are
usually empty shells, since the data loads by API after render, and the archive rate-limits bot
traffic — seen 2026-10); CAPTCHA-gated archive mirrors and search-engine caches (Google's public
cache was retired in 2024); and reconstructing an item from its URL, since listing ids are opaque.

Never substitute a replacement into the original draft without approval — the user's preferences
may have shifted since it was written.

## 6. Report

```
1. <url> — DEAD (removal page "Ad removed by the author", 200; link copied whole)
2. <url> — ALIVE (<title>, <price>)
3. <url> — DEAD (HTTP 404, homepage answers)
4. <url> — UNKNOWN (bot check, twice)
5. <url> — DEAD OR WRONG ID (removal page; id was OCR'd)
Markers: <site> — dead "<text>" (a made-up id gets it too), alive "<what>" (checked <date>)
```

If everything is alive, say so in one sentence, plus the Markers line.

## Bundled resources

- `scripts/check-links.ts` — the fetch pass (`--help` for its options and states).
- `references/no-bun.md` — the fetch pass by hand, and the order its states apply in; read it when
  the script cannot run (no Bun, or no shell).
- `references/trigger-tests.md` — should-fire / should-not prompts; re-run them after any edit to
  the `description`.
