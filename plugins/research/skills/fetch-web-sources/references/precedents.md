# fetch-web-sources — the measured cases behind the rulings

Every ruling in `SKILL.md` and `host-recipes.md` stands on its own; read a section here when you need to justify one, judge
how hard to apply it, or check whether a number still holds. All numbers are facts about somebody
else's live site, dated when taken — re-measure before quoting one.

## §1.1 — one grep of `llms.txt` turned a dead guess into the real page (12.09.2026)

A docs host's `llms.txt` was **204 427 bytes / 1 325 lines** — far too big to read, trivial to grep:

```
https://<docs-host>/gateway/multiplayer     -> 404 (and /gateway/multiplayer.md -> 404 too)
grep -i multiplayer llms.txt
  -> [Multi-user mode](https://<docs-host>/concepts/multi-user): How session ownership,
     presence, and human mentions work when several people operate one agent
https://<docs-host>/concepts/multi-user     -> 200, the full article
```

The same host's `/llms-full.txt` was **15 910 247 bytes (15.2 MiB)** — reading it whole would have
filled the context window several times over.

## §1.2 — what asking for markdown buys (12.09.2026)

| | bytes | visible text |
|---|---|---|
| HTML | 126 901 | 31 251 chars (nav, language picker, search, footer) |
| `.md` / `Accept: text/markdown` | 30 173 | the article, plus a YAML front-matter block |

~4.2× fewer bytes for the same prose — a token saving, not a rescue from an empty page. A vendor's
news/announcement pages (as opposed to its docs) had no markdown twin and 403'd a plain `curl`.
A docs host that 301s an old docs path to a new domain (seen 2026-09 on a major AI vendor) is why `-L`
stays on every probe.

## §2.1 — Sourcegraph caps (12.09.2026)

With `count:3`, the stream returned `matchCount: 3` plus `skipped: shard-match-limit` — the count was
the cap, not the population. The default exclusions on the same probe were 281 forked and ~67k archived
repositories (30k archived when re-run 13.11.2026).

## §2.2 — GitHub issue search: what quotes do and do not buy (12.09.2026)

| query | `total_count` |
|---|---|
| `"maintainer reports"` (quoted) | 12 552 |
| `maintainer reports` (unquoted) | 626 994 |

A dotted hostname returned **127** quoted and unquoted alike — there were no spaces for the phrase
operator to bind, and the index tokenises on the dots either way. The same two queries had read 124 and
1 323 two days earlier: the count moves. Yet 30 of the top 30 hits did contain the literal string — an
earlier run's "fuzzy hits" verdict did not reproduce. Ranking puts literal matches first; the risk is
`total_count` reaching far past them, not junk at the top.

## §2.2b — the uptake census and its two errors (20.09.2026)

Five days after a new product launched, `search/repositories` for "<product> <vendor>" returned
`total_count` **1 204**, top entry 2 111 stars; the first page alone carried MCP servers, database
extensions, coding-agent plugins and four separate awesome-lists — a day's manual work in one request.
Both errors were live on that page: the **top-ranked** repo said in its own description that it was an
independent reimplementation, not affiliated with the vendor; and any integration that never names the
product in its metadata is invisible to the query. `sort=updated` on the same hot topic was useless —
every row on page 1 had been pushed within the last two minutes.

A sandboxed cloud host answered the same endpoint with a `403` whose body said the session was bound to
its configured repositories — the host's egress proxy, not GitHub. A browser tab on github.com reached
the same API.

## Cautions for every rung — an SPA's catch-all 200 (20.09.2026)

A model-hosting site answered **200** for an invented model URL exactly as for the real one. What
separated them was page-specific content: the real page's title named the model with its price and the
term occurred 199 times; the invented page had none of those markers.

## Cautions for every rung — why there is no safe probe for an API route

- Where auth runs ahead of routing, an invented path also `401`s, and a real route can `404` an
  unauthorized caller — a code means nothing without a same-method nonsense-path control.
- Even with the control, a `401` on a body naming some model says nothing about that model being
  supported: auth rejects before the payload is validated.
- `{}` is not a harmless body: on a trigger/restart/run-now route it is the whole valid payload, and a
  host that dispatches before validating performs the operation you were only trying to detect. A
  published schema listing required fields is not proof that validation precedes dispatch.

What settled the case above was the provider's own model page plus third-party code posting to the
route with that model id — not a status code.

## §2.3 — `releases/latest` vs the HTML releases page (12.09.2026)

The API returned the new tag published the previous day, where a run three days earlier — which had read
the HTML page — had reported the older one as current. The HTML page is served from a cache.

## §3 — a login gate that did not stop the dive (10.09.2026, re-confirmed 12.09.2026)

An open-source agent platform's internal team instance sat behind an org login. Its own issue/PR corpus
yielded the topology, an hourly redeploy of `main`, «25.9 MB of entry_json across 1054 sessions», «28
catalog groups, 184 live sessions», and the allow-policy (membership of the GitHub org); the docs carried
the hostname once as an example config value; a later PR showed the internal reports site shipping as a
public plugin. A previous session had stopped at the gate with "don't spend a session trying to get in"
— right about the gate, wrong about the dive.

## §4 — a sleep inside the extraction script (13.10.2026)

An in-page script that slept 8 seconds waiting for a Cloudflare check died with «Inspected target
navigated or closed» — the check ends by navigating, which kills the script that spans it.

## Vendor blogs — what a web-fetch summary got wrong (20.09.2026)

One article on a vendor's engineering blog, three failures in one run: a "reproduce verbatim" prompt
was refused on copyright grounds; a source attribution was invented (the phrase it quoted occurs 0
times in the page HTML, and the sentence in question links elsewhere); and it said "no specific
technologies are named" when the article's own figures showed `kubectl rollout restart
deployment/[listener]`, pods at 395/412 GiB against a ~660 GiB limit, and a standby pod taking the
lease in ~30 s. On a nonexistent slug of the same host, `curl -sL` exited 0 with 75 KB of error page;
`--fail-with-body` exited 22 («The requested URL returned error: 404»); the real article was 541 KB,
and one strip pass gave 19 KB of article text. The figure filter without its exclusions returned 9
URLs (an `apple-touch-icon.png` and a `…_og_<slug>.jpg` social card among them); with them, the
seven figures — a CI-volume chart, a memory chart with the pod limit and the last OOMKill, a backlog
chart with its peak and the redesign dates, and a screenshot of an internal chat thread, none of it
in the prose.

## GitHub sandbox gate — the bodies (10.09–20.09.2026)

One cloud-sandbox host, five sessions:
- `api.github.com/repos/<owner>/<repo>` → 403, `{"message":"GitHub access to this repository is not
  enabled for this session. Use add_repo to request access…"}` — no `add_repo` tool existed in those
  sessions. A control on an unrelated public repo gave the identical 403 (17.09).
- `api.github.com/rate_limit` → 502 `builtin injection failed (github)`; `search/repositories` → 403
  `This GitHub API path is not available: sessions are bound to their configured repositories…`.
- `raw.githubusercontent.com` → 200 on 10.09, 12.09, 13.09, 17.09 and 20.09; `connect_rejected` /
  HTTP 000 on 11.09. On 20.09 the two negative controls (a bad ref, a bad path) each 404'd in the
  same minute, which is what showed the channel could fail. On 17.09 a `main`-ref read 404'd on a
  repo that lives on `master` — the wrong-ref trap.
- `github.com/user-attachments/assets/<uuid>` → 403 with a third body, while
  `cdn.syndication.twimg.com` and `video.twimg.com` answered 200 in the same minute.
- `$HTTPS_PROXY/__agentproxy/status` listed `noProxy` as package registries plus the model API, and
  `recentRelayFailures[]` carried each refusal with `kind: "connect_rejected"`.

## GitHub freshness — stale channels, measured (29.08–12.09.2026)

- 12.09, one small public repo, minutes apart: a web-fetch tool said 0 stars / 0 forks / 5 commits
  and a root listing missing three source files and a folder; the browser showed 124 / 34 / 30 and 39
  entries. Raw returned 200 for the files the snapshot lacked and 404 for one it listed — ~25 commits
  behind. On 11.09 the same tool reported 252.6k stars against the API's 259 003, and twice gave a
  CHANGELOG's newest version as `1.0.1` while `plugin.json` in the same commit said `1.2.3`.
- 29.08, one popular public repo, same moment: the REST API through a web-fetch wrapper gave 36 061
  stars, 5 987 forks, `pushed_at` three months old and an older description; the HTML page gave
  49 078, 7 550, a fresh latest commit and the current description.
- An earlier case had the HTML Releases page as the stale side (see § 2.3 above).
- 28.08, one skills-collection repo: the HTML page said 123, the README via raw said 75, the
  SHA-pinned tree listing counted 130 `SKILL.md` files.

## AI-built app demos — one bundle read (20.09.2026)

A post demoed a model-built 3D bookshelf app. The bundle's embedded record array held 145 records
(107 marked certain, 38 uncertain), every figure matching a number the UI printed. The records lived
in a 248 KB feature chunk, not the `index-*.js` entry chunk (5 chunks, 519 KB). The author said "just
three.js"; the app had no `<canvas>`, no `window.THREE` and no WebGL string — the shelf was CSS 3D.
The post said "snap a photo"; there was no file input in the DOM or in any compiled form across all
five chunks. `capture:` gave 5 false hits (event-listener options) and `file` hit Tailwind `file:`
classes. The embedded source photo showed the app reproducing the library's own misshelvings.

## Model releases — one release checked (22.09.2026)

A post said a release "works on anything with 8 GB RAM". The advertised 5.9 GB was the language model
alone (5.95 GB); the vision projector was a separate 0.63–0.93 GB file; a second packing was 7.21 GB
and was the one the vendor's own benchmark row measured; the repo also carried a 53.81 GB F16 file.
Neither the blog nor the card contained "8 GB" — that was the poster's gloss. The blog said 1.76
bits/weight and up to 143 tok/s; the card's own table said 1.72/1.75 and 129.9. A reply reported
~45 GB resident with no backend or context named. The repo id without its `-gguf` suffix answered 401
«Invalid username or password.» while the real id answered 200 in the same second. The files needed
the vendor's runtime fork; stock tooling loaded one format "without any warning" and produced garbage.
A secondary write-up headlined the size as 8.6 GB.

## §1.4 — an archived copy where every fetcher got 403 (14.11.2026)

With no browser in the run, a Medium post and an OpenAI announcement both answered 403 to `curl` and
to a web-fetch tool. Runs with this skill loaded found Internet Archive snapshots and quoted from
them with the snapshot date; the same prompts without the skill used all ten turns and returned
nothing. The Medium run tried the closest snapshot (2022) first and quoted from an older one (2021);
why it switched is not recorded, so do not assume the closest capture is the usable one. The
announcement URL as given had no snapshot at all; the article lived under a different slug.

## §1.4 — an availability lookup that "found nothing" (14.11.2026)

`archive.org/wayback/available` answered HTTP 200, exit 0, with `"archived_snapshots": {}` and
`"error": {"code": "timeout", "message": "client timeout at 5.0 seconds"}` — the empty result of a
failed lookup, the same shape as a URL with no capture.

## Bot-blocked hosts (17.09.2026)

To a web-fetch tool, `boingboing.net` answered 403 and `codebreaking-guide.com` answered 202 with a
~200-byte body; both pages read normally in a browser.

## Luma — a 429 on the first call (14.11.2026)

`api.lu.ma/calendar/get-items` for a public calendar answered 429 `{"message":"You’ve exceeded our
rate limit. Please try again later."}` on the first request of the day from that connection, and
again minutes later, from `api2.luma.com` as well (behind Cloudflare), while `luma.com/<slug>`
answered 200 and carried the calendar id.
