---
name: fetch-web-sources
description: >-
  Reach a public web source your fetcher cannot see. Use when a web fetch or curl returns an empty
  body, a 404 or only navigation chrome on a docs site; when you want a docs page as clean markdown;
  when you must search public GitHub code for a literal string without a token; when you must find
  what people have BUILT with a new product; when a login gates a host whose product is open-source;
  or before fetching a host with a known recipe (vendor blogs, OpenAI, Medium, Hugging Face,
  Typeform, Luma, SEC filings) — «сторінка не читається», «знайти рядок у репозиторії», "code search
  401", "client-rendered docs". Do not use for an ordinary web search or fetch that already works,
  for checking whether a batch of links is still alive (link-rot-checker), for reading an X/Twitter
  post itself (read-twitter — X pages need a logged-in browser), nor for a video's content, YouTube
  included (watch-video).
---

# Fetching a source the fetcher can't see

Three ladders, each rung cheaper than the one below it, plus a note (§4) for when the browser rung is
reached anyway, and per-host recipes (§5). The ladders are plain HTTP requests that need no credentials;
the browser is their last rung and usually unnecessary. Some host recipes in §5 do need a browser —
each says so.

Numbers below are facts about somebody else's live site: each carries its date, and the measured
cases behind each ruling are in `references/precedents.md` — read a section there when you need to
justify a ruling or re-check a number. Re-measure before quoting one.

Write fetched files to a scratch directory of your own (shown as `<scratch>` below), never a fixed
shared path — a sibling run writing the same name turns its numbers into yours.

## §1. A documentation page that comes back empty, 404, or 95% navigation

**Diagnose before you escalate.** "The fetch gave me nothing" has three causes with opposite fixes:

| What you see | What it usually means | What to do |
|---|---|---|
| A clean `404` | **The path is wrong** — the commonest case | §1.1 — find the real path in `llms.txt` |
| A 200 whose text is all nav/menu/footer | Server-rendered; the chrome dwarfs the prose | §1.2 — ask for markdown |
| A 200 with a genuinely empty body | Client-rendered | §1.2, then the browser (§1.3) |

**Do not diagnose "client-rendered" from an empty result alone** — a 404 on a docs SPA can render as
a soft shell, which some fetch wrappers report as an empty page. Check the status first:

```bash
curl -sL -o /dev/null -w 'http=%{http_code} final=%{url_effective}\n' '<url>'
```

Keep the `-L`: docs hosts canonicalise and redirect constantly, and without it you read the redirect's
own `301` and file a live page as broken. `%{url_effective}` is the URL to use in §1.2. A `200` from a
JS app does not prove the page exists either — an SPA answers 200 for any path (see «Cautions for
every rung» for the check).

### §1.1 `llms.txt` — the index, and the first thing to try on a 404

Many docs sites publish a machine-readable index at the root, one line per page. **Grep it, never
read it**, and fetch to a file so a failed fetch cannot masquerade as "no match":

```bash
curl -fsSL https://<docs-host>/llms.txt -o <scratch>/llms.txt && grep -i '<topic>' <scratch>/llms.txt
```

In a `curl … | grep` pipeline the exit status is grep's and `curl -s` swallows the error, so "no
index", "rate-limited" and "nothing on this topic" all come back as the same empty output.

**`/llms-full.txt` is the whole corpus in one file — often megabytes. Never read it into context.**
Fetch it to disk and grep with a bounded output (`grep -n -m 20 -i '<topic>' <file> | cut -c1-200`);
a subagent is the better home for that when your host has one. A 404 on either file just means the
site doesn't publish one — fall through to §1.2.

### §1.2 Ask for markdown instead of HTML

```bash
curl -sSL --fail-with-body -o <scratch>/page.md https://<host>/<path>.md                        # suffix
curl -sSL --fail-with-body -o <scratch>/page.md -H 'Accept: text/markdown' https://<host>/<path> # negotiation
```

Where supported, both return the same markdown at a fraction of the bytes — prefer it by default on
any docs host that serves it. Check the exit status before reading the file: a bare `-sL` exits 0 on
an error page and writes it to disk, where it reads like a short article. Limits:

- **`.md` does not conjure a missing page** — a 404 on both spellings means the path is wrong (§1.1).
- **Append `.md` to the PATH**, before any `?query` or `#fragment`: strip those, append `.md`, and
  re-add them only if the target needs them.
- **Non-docs pages often have no twin** (news/announcement pages). Take the bytes and turn them into
  text — `--links` adds the page's outbound links, which is where its citations are:

  ```bash
  curl -sSL --fail-with-body -o <scratch>/page.html '<url>'          # check the exit status
  bun run "SKILLDIR/scripts/html-to-text.ts" <scratch>/page.html --links --base '<url>'
  ```

  On a 403, use the browser — a page-text read, or the DOM walk the host's recipe names (§5) — and
  with no browser, an archived copy (§1.4). A web-fetch tool on such a page can return a generated
  SUMMARY, not the page — use it for orientation only, never for a number, a quote or an attribution
  (`references/host-recipes.md` § Vendor blogs).

### §1.3 Only then, the browser

A real 200, a genuinely empty body, and neither `.md` nor `llms.txt` → the content is drawn by
scripts: open it in the browser. No browser → an archived copy (§1.4); none there either → report the
page unread rather than the read as done.

### §1.4 No browser, or it is blocked too — an archived copy

A page that 403s every fetcher can still exist in the Internet Archive. Find the closest snapshot,
then take the plain capture (the page wrapped in the archive's toolbar):

```bash
curl -sS --fail-with-body --get 'https://archive.org/wayback/available' --data-urlencode 'url=<url>'
curl -sSL --fail-with-body -A 'Mozilla/5.0' -o <scratch>/snap.html 'https://web.archive.org/web/<timestamp>/<url>'
```

The raw form (`<timestamp>id_/`, no toolbar) is the cleaner read when it works, but on 2026-11-14 it
answered HTTP 429 with a «suspected abusive bot traffic» page for the same snapshot the plain form
served with 200 (three tries, one public page). Try it only after the plain form, and check the
body either way.

The first answers `archived_snapshots.closest.timestamp`. An empty `archived_snapshots` means no
capture ONLY when the reply has no `error` key: the lookup can answer 200 with an empty result and
`"error": {"code": "timeout"}` (measured 2026-11-14). An `error` key or a non-zero exit is a failed
lookup — retry it, or go straight to the capture listing below — never "no capture".

**An archived copy is a different document from the live page.** Check it is the article, not a
block, login or paywall page captured in its place, before you quote it; give its snapshot date;
and say the live page could not be read, so whoever relies on the quote knows to check the current
text. Two branches before you give up:

- **The closest capture is not the article** → list every capture and try others:
  `curl -sS --fail-with-body --get 'https://web.archive.org/cdx/search/cdx' --data-urlencode 'url=<url>'
  --data-urlencode 'output=json' --data-urlencode 'filter=statuscode:200'` (one row per capture,
  OLDEST first, with its `timestamp`).
- **No capture of that URL at all** → the article may live under another slug: look for it on the
  site's own index or search page (or its archived copy), then run the steps above on the real URL.

Nothing found after both → report the page unread, never paraphrased from memory.

## §2. Finding things inside public repositories, with no token

**`api.github.com/search/code` is useless to you** — unauthenticated it answers
`401 Requires authentication` (verified 2026-09). Don't spend attempts on it.

### §2.1 A literal string in code — Sourcegraph

Run the bundled script; it refuses to report a result unless the stream finished, because a
truncated or bot-checked stream otherwise reads exactly like "this string is nowhere":

```bash
bun run "SKILLDIR/scripts/sg-search.ts" '<literal string>' [--count 20] [--filters 'repo:… lang:…']
```

⚠️ **A capped count is a floor, never a total** — the script prints `matchCount: >=N (a FLOOR …)`
when the result limit was hit; quote it that way. `skipped: repository-fork` / `excluded-archive`
mean those repos were never searched — add `fork:yes` / `archived:yes` to `--filters` if they
matter. A term that itself starts with `--` goes in `--term '<value>'`.

### §2.2 Issues and PRs — GitHub issue search (works unauthenticated)

```bash
curl -sS --fail-with-body -H 'Accept: application/vnd.github.text-match+json' --get 'https://api.github.com/search/issues' \
  --data-urlencode 'q="<exact phrase>"' --data-urlencode 'per_page=30'
```

Always build the query with `--data-urlencode` — a hand-written `?q=` breaks on the first space. This
is often where a closed deployment is described in the open by its own maintainers. Rulings:

- **Quotes bind multi-word phrases** (a large difference in count) but buy nothing on a punctuation-
  heavy token such as a hostname, which the index tokenises anyway.
- **`total_count` is "issues matching a tokenised query", never "issues containing this literal"** —
  and it moves day to day. Cite it only with its date and for what it counts.
- **Verify every fragment you quote** (`items[].text_matches[].fragment`, or the issue body).
- **Unauthenticated search is limited to 10 requests per minute** (verified 2026-09). Pace ~6 s
  apart, or a sweep half-finishes with a `403` that looks like a permissions problem.

### §2.2b What has anybody BUILT with it — repository search

When a product has just launched, the question is not "who wrote this string" but "what exists".
Repository search answers it unauthenticated, ranked by stars:

```bash
bun run "SKILLDIR/scripts/gh-repos.ts" '<product> <vendor>'
```

The script exits 1 when GitHub flags `incomplete_results` — a 200 with a plausible page after an
internal timeout. Narrow and re-run; never cite that page.

On a sandboxed host, a `403` from `api.github.com` may be the host's egress proxy rather than GitHub
— read the body. A browser tab on github.com can reach the same API; say which channel you used.

**This is candidate discovery, not a census.** It errs both ways: a top-ranked row can be an
unaffiliated reimplementation, and an integration that never names the product in its metadata is
invisible. Read and classify every row you cite (built-on / reimplementation / merely mentions).
`total_count` is an order of magnitude with a date; `--sort updated` is noise on a hot topic.

**Pair it with registry download counts** (no token): `https://pypistats.org/api/packages/<pkg>/recent`,
`https://api.npmjs.org/downloads/point/<from>:<to>/<pkg>` (scoped names as `@scope%2Fname`); publish
dates at `https://registry.npmjs.org/<pkg>` → `.time` and `https://pypi.org/pypi/<pkg>/json` →
`.releases`. **Downloads are a proxy, never "N users"** — CI, mirrors and transitive installs count.
Use them for shape, with comparable windows, and say which window and date.

### §2.3 Two reads that need no search

- **A file's contents:** `https://raw.githubusercontent.com/<owner>/<repo>/<sha>/<path>` — **pinned to
  a commit SHA, not a branch** (resolve `api.github.com/repos/<o>/<r>` → `.default_branch`, then
  `…/commits/<branch>` → `.sha`). A multi-file read off a moving branch can splice two commits; quote
  the SHA.
- **Version / release date:** `https://api.github.com/repos/<owner>/<repo>/releases/latest` first, by
  a direct `curl`. The HTML releases page has been seen stale, and so has the API read through a
  web-fetch wrapper (a direct call has not), so a version or date going into a report needs the two
  to agree (`references/host-recipes.md` § GitHub → Freshness). `/releases/latest` skips
  prereleases and drafts; for "the newest version" read `/releases?per_page=10` (check `prerelease`
  / `draft` / `published_at`), or `/tags` where releases aren't used.

## §3. A login on the host is not the end of the dive

**If a login blocks the host and its product is open-source, the gate stops your ACCESS, not your
RESEARCH** — the deployment is usually described by its own maintainers, in public. Work in order:

1. issues and PRs naming the host (§2.2) — topology, config, measured scale;
2. the docs, for the host appearing as an example value in a config sample;
3. release notes, for an internal tool later productised as a plugin or package;
4. journalism and the project's own podcasts — for dating things, not for facts.

This is not a way around authentication: no login is performed and no private data is read. When you
hit a gate, report two findings — what is closed, and whether the *question* is still answerable.

## §4. The browser rung: a bot-check interstitial is not an empty page

A site behind Cloudflare often answers the first navigation of a fresh session with a check page
(`document.title` "Just a moment…", localized on non-English sites) before the real one.

- **Wait in a separate call, never with a sleep inside the extraction script** — the check ends by
  navigating, which kills a script that spans it.
- **Re-read a few times, seconds apart, until a POSITIVE marker of the real page appears** (a results
  counter, a non-empty list, a title, the site's own "removed" text). The check page's absence is not
  that marker.
- **Still the check page → report the page UNREAD (`unknown`)**, never "0 results" or "dead".

## §5. A known host — check its recipe first

**Before fetching any host listed here, read its section in `references/host-recipes.md`**; a recipe
there overrides the rungs it names. A recipe that needs a browser does not remove §1.4: with no
browser, an archived copy is still the next step.

- **Vendor blogs and announcement pages** — take the bytes (§1.2); read the figures too.
- **Bot-blocked hosts** — which 403 / 202 answers are about the fetcher, not the content.
- **Framer sites** — one search-index JSON holds every page's text.
- **OpenAI docs** — `.md` twins; **OpenAI announcements** — the chart datasets sit in the page.
- **GitHub** — the sandbox gate, the browser ladder, freshness (no channel is authoritative alone).
- **Medium** — the `curl` 403 and the teaser trap.
- **Vercel Security Checkpoint** — a 429 bot challenge, not a rate limit.
- **AI-built app demos** — read the deployed bundle, every chunk.
- **Hugging Face model releases** — file sizes are a FLOOR on memory, never a confirmation.
- **Model registries** — resolve a model named in a post without the browser.
- **WebGL / three.js demos** — a frame-coupled scene cannot be waited into a later state.
- **Typeform** — never click through: it saves partial answers in the user's name.
- **Luma** — the public calendar JSON, and its rate limit.
- **SEC / EDGAR filings** — EDGAR needs a contact in the User-Agent: ask the user which one to send.

## Cautions for every rung

**A 200 from a JS app is not proof a page exists** — an SPA's catch-all answers 200 for an invented
URL. Settle it on page-specific content measured against a nonsense URL of the same shape; report the
pair, never the 200.

⚠️ **There is no safe general probe for an API route.** A status code alone does not locate a route
(auth can run ahead of routing), cannot tell you what the route serves, and the probe itself can be the
side effect — `{}` is the entire valid payload of a trigger or run-now route. Settle a route from its
documentation, the provider's source, or third-party code that calls it; with none of those, report it
as unverified.

## Bundled resources

- `scripts/sg-search.ts` — §2.1's Sourcegraph search with the finished-stream guard. `--help` for flags.
- `scripts/gh-repos.ts` — §2.2b's repository search with the `incomplete_results` guard. Sends
  `GITHUB_TOKEN` if set (never prints it).
- `scripts/html-to-text.ts` — a saved HTML page as readable text (§1.2, and the recipes that read a
  blog post or a filing); `--links` lists its outbound links, `--grep` finds a section in a big one.
- `references/precedents.md` — the measured case behind each ruling, dated.
- `references/host-recipes.md` — per-host recipes (§5). Read the section for the host in front of you.
- `references/trigger-tests.md` — should-fire / should-not prompts and their run record; re-run them
  after any edit to the `description`.

`SKILLDIR` in the commands above is a placeholder: substitute the **literal** directory you loaded
this `SKILL.md` from — it is not a shell variable.
