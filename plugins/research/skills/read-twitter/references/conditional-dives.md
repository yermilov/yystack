# read-twitter — the three conditional dives (depth)

The full text behind SKILL.md's «Three conditional dives — when the linked material changes what
"read" means». The body keeps the rulings and the scope gate (a research brief only); this file keeps
the procedure, one line of evidence per rule, and the primary-text channels. Read the section for the
dive you are in.

## When the linked material is itself a RETELLING, not a primary source

A tweet is often an announcement for somebody else's write-up, which itself condenses several primary
documents (a journalist's recap of two technical reports, a thread summarising a paper). Reporting
that write-up's numbers, quotes and framing in one voice, attributed to whichever primary document it
was mostly about, is a repeatable failure.

**Evidence (2026-08-31):** a dive into a journalist's retelling of three primary reports merged them
into one voice attributed to the subject company. A later check against the primaries found four
errors from that one cause: a narrative frame that was the journalist's own; a safeguard attributed
to a private brief that was in fact public; a percentage credited to the wrong report and compared
against a figure measuring a different metric; and six figures signed as the company's that belonged
to a third party's report.

**So, when the material behind the link retells other primary documents:**
1. Before writing the report, list the primary documents the retelling draws on.
2. Tag every number, quote and framing with its real source — `[company blog]`, `[technical
   report]`, `[third-party report]`, `[retelling]` — never the retelling's or the subject's name by
   default.
3. Tag anything you did not open yourself as `[from the retelling, not verified]`.
4. Check the retelling's FRAMING separately from its facts. A metaphor, a "phase" numbering, or an
   action attributed to a named actor is usually the retelling author's construction, and it slips
   into a report as fact more easily than a number does.
5. When the retelling compares two figures ("even worse than", "softer than"), first confirm they
   measure the same thing (metric, denominator, population). Only then recompute the direction from
   the primaries; if they are not comparable, say so instead of picking a direction.

## When the tweet makes a claim ABOUT A CORPUS — download the raw dump and grep it

A tweet asserting something about a *body of material* ("the agents never once discussed him",
"nobody in the dataset ever asked permission") can only be checked against the corpus. The write-up
gives you the examples its authors chose, so the strongest thing an excerpt-only reading can say is
«no counter-example among the quoted passages», which is not the claim under test. Look for a
`download` / `data` page on the source site, take the `.jsonl.gz` / `.zip`, and grep the whole thing
in the shell.

**Evidence (2026-09-06):** on one public wiki-style dataset, an excerpt-only pass could not rule out a
counter-example among ~14.6k revisions; the full dump turned the anecdote into a measurement (zero
occurrences of the relevant terms in agent-written text). Three mechanics separate a measurement from
a number that merely looks like one:

- **Wiki-style pages are APPEND-ONLY**, so diff each revision against the previous one and search only
  the NEW text. Otherwise one sentence is counted dozens of times as it is carried forward, and the
  inflation all points one way, so nothing looks wrong.
- **A keyword sweep is not a semantic read.** Say so, and probe paraphrases (`the human`, `please
  stop`, `permission to`, `is this allowed`, honorifics), not only the obvious nouns. A zero over four
  literal strings is a fact about those four strings.
- **Read the literal hrefs off the download page** — a guessed path 404s, and a 404 on a guessed path
  reads exactly like "there is no dump".

**Keep the corpus out of the main context.** Where subagents exist, delegate the download and the grep
to one and take back only the verdict and the verbatim hits. Where they do not, run it inline in the
shell and print only aggregates and matches (`grep -c`, a bounded `grep -m 20`), never `cat` the dump.

## When the tweet announces a SOLVED problem — re-run the mechanism yourself

A tweet saying a model *solved* something verifiable (a cipher, a conjecture, a benchmark) is a
**replication** task, not a reading task. The write-up states a rule; the rule is executable; run it
against the primary source and report hits. Run a **negative control** too, so the reader knows what
chance looks like: for an indexed decode (a cipher, a book code), the same indices against a shuffled
source map; for other claims the domain's equivalent (a held-out split, a random baseline). Say which
control you used.

**Evidence (2026-09-17):** on one «a model decoded this cipher» post, line 1 of the claimed decode
scored 32/32 on the right source text against ~2.8/32 under a shuffled control, and line 2 scored
29/32 with two positions unexplained. Report a partial replication as partial: neither number means
anything alone, and "solved" is not a per-line score.

**Scope and feasibility gate.** Only on a research brief ("research this", "is this true?") — a
request for the post's text stops at Step 7. And only when the rule is executable from public
material: the source text is fetchable, the mechanism is stated precisely enough to code, and a
meaningful control exists. A proof, a closed-weights benchmark run or an unpublished method usually
fails that test: then say **"not replicated"** and why, rather than inventing a baseline or quoting
the announcement as verified. Keep a small reproducible script (fetch the source, print the score).

### The source text you re-run on must be the one the claim used

A decode that fails on one edition and succeeds on another is a fact about which text you loaded, not
about the claim. For an early-modern printed source the edition is load-bearing: in the case above, a
public refutation tested a different edition from the one the claim cited, both were internally
correct, and the two editions turned out to carry the same sections reordered and reworded, so every
word index shifted. An OCR of the cited edition also disagreed with modern transcriptions on one
digit — a transcription is a further witness, not a copy.

**So: before concluding a claimed solve is wrong, confirm you loaded the edition the claim cites** —
and name it (shelfmark, catalogue id, archive id) beside every score you report.

### Primary-text channels that work with plain `curl`

Measured 2026-09-17 on a cloud-sandbox host:
- **EEBO-TCP** (early English printed books): `raw.githubusercontent.com/textcreationpartnership/<ID>/master/<ID>.xml`
  — clean TEI; numbered sections are `<div n="N" type="part">`. `<g ref="char:EOLhyphen"/>` marks a
  word split across a line break: **rejoin it before tokenising**, or every later index drifts.
  (`raw.githubusercontent.com` itself varies between sandbox sessions — `fetch-web-sources`' `references/host-recipes.md`
  § GitHub.)
- **archive.org full text**: `https://archive.org/download/<item>/<item>_djvu.txt` returns the whole
  book in one request. **Not every item serves it anonymously**: a lending-library item answers 401
  even though its `_djvu.txt` exists, and `archive.org/metadata/<item>` shows
  `access-restricted-item: true`. Check the metadata before concluding there is no text, and prefer a
  public item. **OCR artefacts break word indexing** — running heads, section numbers split across
  spaces, hyphenation at line ends: strip or rejoin all three, expect ±1 residual drift, and say so.
- **A Hacker News thread, no browser**: `https://hn.algolia.com/api/v1/items/<id>` returns the whole
  comment tree as JSON. Flatten it to a file and grep it; never read it into the main context.
  (Finding the thread for a post: `references/source-recipes.md`, the launch-tweet bullet.)

When the refutation lives in a GitHub repo, judging its provenance (created_at, stars, pushed_at)
needs `api.github.com`, which a cloud sandbox may gate — `fetch-web-sources`' `references/host-recipes.md` § GitHub has
the probe and the browser route. If neither reaches it, say the metadata was unreadable rather than
calling the repo unverifiable.
