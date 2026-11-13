# fetch-web-sources — the measured cases behind the rulings

Every ruling in `SKILL.md` stands on its own; read a section here when you need to justify one, judge
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

## §2.2b — an SPA's catch-all 200 (20.09.2026)

A model-hosting site answered **200** for an invented model URL exactly as for the real one. What
separated them was page-specific content: the real page's title named the model with its price and the
term occurred 199 times; the invented page had none of those markers.

## §2.2b — why there is no safe probe for an API route

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
