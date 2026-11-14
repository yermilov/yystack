---
name: fetch-web-sources
description: >-
  Reach a public web source your fetcher cannot see, before reaching for the browser. Use when a web
  fetch or curl returns an empty body, a 404 or only navigation chrome on a docs site; when you want
  a docs page as clean markdown (`.md`, `llms.txt`); when you must find a literal string in public
  repositories without a GitHub token; when you must find what people have BUILT with a new product;
  or when a login gates a host whose product is open-source — «сторінка не читається», «знайти рядок
  у репозиторії», "code search 401", "client-rendered docs". Do not use for an ordinary web search
  that already works, for checking whether a batch of links is still alive (link-rot-checker), nor
  for reading an X/Twitter post itself (that's read-twitter — X pages need a logged-in browser).
---

# Fetching a source the fetcher can't see

Three ladders, each rung cheaper than the one below it, plus a note (§4) for when the browser rung is
reached anyway. Every recipe is a plain HTTP request with no credentials; the browser is the last rung
of all three and usually unnecessary.

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

⚠️ **Do not diagnose "client-rendered" from an empty result alone** — a 404 on a docs SPA can render as
a soft shell, which some fetch wrappers report as an empty page. Check the status first:

```bash
curl -sL -o /dev/null -w 'http=%{http_code} final=%{url_effective}\n' '<url>'
```

Keep the `-L`: docs hosts canonicalise and redirect constantly, and without it you read the redirect's
own `301` and file a live page as broken. `%{url_effective}` is the URL to use in §1.2.

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
curl -sL https://<host>/<path>.md                          # suffix
curl -sL -H 'Accept: text/markdown' https://<host>/<path>   # content negotiation
```

Where supported, both return the same markdown at a fraction of the bytes — prefer it by default on
any docs host that serves it. Limits:

- **`.md` does not conjure a missing page** — a 404 on both spellings means the path is wrong (§1.1).
- **Append `.md` to the PATH**, before any `?query` or `#fragment`.
- **Non-docs pages often have no twin** (news/announcement pages) and may 403 a plain `curl` — use
  your web-fetch tool there.

### §1.3 Only then, the browser

A real 200, a genuinely empty body, and neither `.md` nor `llms.txt` → the content is drawn by
scripts: open it in the browser. If the run has no browser, say which half of the read you got rather
than reporting the whole thing as done.

## §2. Finding things inside public repositories, with no token

**`api.github.com/search/code` is useless to you** — unauthenticated it answers
`401 Requires authentication` (verified 2026-09). Don't spend attempts on it.

### §2.1 A literal string in code — Sourcegraph

Run the bundled script; it refuses to report a result unless the stream finished, because a
truncated or bot-checked stream otherwise reads exactly like "this string is nowhere":

```bash
bun run "SKILLDIR/scripts/sg-search.ts" '<literal string>' [--count 20] [--filters 'repo:… lang:…']
```

⚠️ **`matchCount` is capped by your own `--count`.** When `skipped:` shows `shard-match-limit` /
"result limit hit", the count is a floor ("at least N"), never a total. `repository-fork` and
`excluded-archive` mean those repos were never searched — add `fork:yes` / `archived:yes` if they
matter.

### §2.2 Issues and PRs — GitHub issue search (works unauthenticated)

```bash
curl -s -H 'Accept: application/vnd.github.text-match+json' --get 'https://api.github.com/search/issues' \
  --data-urlencode 'q="<exact phrase>"' --data-urlencode 'per_page=30'
```

Always build the query with `--data-urlencode` — a hand-written `?q=` breaks on the first space. This
is often where a closed deployment is described in the open by its own maintainers. Rulings:

- **Quotes bind multi-word phrases** (a large difference in count) but buy nothing on a punctuation-
  heavy token such as a hostname, which the index tokenises anyway.
- **`total_count` is "issues matching a tokenised query", never "issues containing this literal"** —
  and it moves day to day. Cite it only with its date and for what it counts.
- **Verify every fragment you quote** (`items[].text_matches[].fragment`, or the issue body).
- ⚠️ **Unauthenticated search is limited to 10 requests per minute** (verified 2026-09). Pace ~6 s
  apart, or a sweep half-finishes with a `403` that looks like a permissions problem.

### §2.2b What has anybody BUILT with it — repository search

When a product has just launched, the question is not "who wrote this string" but "what exists".
Repository search answers it unauthenticated, ranked by stars:

```bash
bun run "SKILLDIR/scripts/gh-repos.ts" '<product> <vendor>'
```

The script exits 1 when GitHub flags `incomplete_results` — a 200 with a plausible page after an
internal timeout. Narrow and re-run; never cite that page.

⚠️ **This is candidate discovery, not a census.** It errs both ways: a top-ranked row can be an
unaffiliated reimplementation, and an integration that never names the product in its metadata is
invisible. Read and classify every row you cite (built-on / reimplementation / merely mentions).
`total_count` is an order of magnitude with a date; `--sort updated` is noise on a hot topic.

**Pair it with registry download counts** (no token): `https://pypistats.org/api/packages/<pkg>/recent`,
`https://api.npmjs.org/downloads/point/<from>:<to>/<pkg>` (scoped names as `@scope%2Fname`); publish
dates at `https://registry.npmjs.org/<pkg>` → `.time` and `https://pypi.org/pypi/<pkg>/json` →
`.releases`. ⚠️ **Downloads are a proxy, never "N users"** — CI, mirrors and transitive installs count.
Use them for shape, with comparable windows, and say which window and date.

⚠️ **A 200 from a JS app is not proof a page exists** — an SPA's catch-all answers 200 for an invented
URL. Settle it on page-specific content measured against a nonsense URL of the same shape; report the
pair, never the 200.

⚠️ **There is no safe general probe for an API route.** A status code alone does not locate a route
(auth can run ahead of routing), cannot tell you what the route serves, and the probe itself can be the
side effect — `{}` is the entire valid payload of a trigger or run-now route. Settle a route from its
documentation, the provider's source, or third-party code that calls it; with none of those, report it
as unverified.

On a sandboxed host, a `403` from these endpoints may be the host's egress proxy rather than GitHub —
read the body. A browser tab on github.com can reach the same API; say which channel you used.

### §2.3 Two reads that need no search

- **A file's contents:** `https://raw.githubusercontent.com/<owner>/<repo>/<sha>/<path>` — **pinned to
  a commit SHA, not a branch** (resolve `api.github.com/repos/<o>/<r>` → `.default_branch`, then
  `…/commits/<branch>` → `.sha`). A multi-file read off a moving branch can splice two commits; quote
  the SHA.
- **Version / release date:** `https://api.github.com/repos/<owner>/<repo>/releases/latest` — **never**
  the HTML releases page, which is served stale. ⚠️ `/releases/latest` skips prereleases and drafts;
  for "the newest version" read `/releases?per_page=10` (check `prerelease` / `draft` /
  `published_at`), or `/tags` where releases aren't used.

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

## Bonus: a `claude.ai` artifact link

`claude.ai/code/artifact/<uuid>` renders in a cross-domain iframe, so fetching the page gives you the
shell. Read the iframe's `src` (`<uuid>.frame.claudeusercontent.com/_f/<slug>/`) and fetch that.

## Bundled resources

- `scripts/sg-search.ts` — §2.1's Sourcegraph search with the finished-stream guard. `--help` for flags.
- `scripts/gh-repos.ts` — §2.2b's repository search with the `incomplete_results` guard. Sends
  `GITHUB_TOKEN` if set (never prints it).
- `references/precedents.md` — the measured case behind each ruling, dated.

⚠️ `SKILLDIR` in the commands above is a placeholder: substitute the **literal** directory you loaded
this `SKILL.md` from — it is not a shell variable.
