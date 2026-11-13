# read-twitter — conditional-dive precedents (depth)

Moved verbatim from SKILL.md «When the linked material is itself a RETELLING» and «When the tweet
announces a SOLVED problem», which keep the rulings and point here.

---

**Measured 2026-08-31**, on a dive into a tweet announcing a journalist's retelling of an OpenAI/METR
incident: the retelling itself condensed three primary documents (OpenAI's blog post, OpenAI's
38-page technical report, and a 91-page METR/Redwood report), and the dive's report merged all three
into one undifferentiated voice attributed to OpenAI. A later cross-check against the actual primary
documents (requested separately, "check it against the original article") found four distinct errors from this
one cause:
- a narrative frame ("three secret AI civilizations", the third started by a specific model) that
  was the **journalist's own framing** — OpenAI's technical report explicitly describes that model
  as appearing in a separate, unrelated run, "a distinct model with different post-training";
- a promised safeguard attributed to a private OpenAI brief when it was actually stated in the
  **public** article and in GitHub code the agents in the story had read with live internet access —
  which reversed the lesson the dive had proposed to record;
- a percentage attributed to OpenAI and described as "softer than" a second figure, when the
  percentage actually came from a **different report** (the tool authors' own estimate, in METR's
  writeup) measuring a **different metric**, and was in fact the larger of the two, not the smaller;
- six figures (agent counts, message counts, a spoofed-tool-call rate, an access code) all signed as
  OpenAI's, none of which appear anywhere in OpenAI's own technical report — every one of them
  belonged to METR/Redwood.

---

- The Vals AI post cited *The Works of Sir Thomas Urquhart* (Maitland Club, 1834), pp. 412–417.
- The public refutation (Reticuli Labs, `github.com/reticuli-labs/panel-artifacts`, 2026-09-01)
  tested **EEBO-TCP A64608** = the 1653 first edition, British Library film, and correctly found ten
  positions *hard-infeasible* (e.g. Proquiritation 11 contains no word beginning with K, yet the
  plaintext needs K there).
- Both hold, because **the two witnesses carry different, reordered petitions.** 1653 §1 begins
  "THat he, whose good name…" (signed A. S.); 1834 §1 begins "Seeing, from the creation of the
  world…" (signed K. F.). 1653 §2 == 1834 §4, reworded. Every word index shifts.
- The same run found that archive.org's **OCR** of the 1834 print reads **38** where every modern
  transcription (Vals, Cipherbrain) reads **33** at line-2 position 24 — and 38 is the only index in
  that petition that yields the required initial. That is an OCR observation, **not yet confirmed
  against the page scans (pp. 414–415)**; either way, a transcription is a third witness, not a copy
  of the second.

---

Primary-text channels that work with plain `curl` (measured 2026-09-17, Cowork host):
- **EEBO-TCP**: `raw.githubusercontent.com/textcreationpartnership/<ID>/master/<ID>.xml` — clean
  TEI. Numbered sections are `<div n="N" type="part">`. ⚠️ `<g ref="char:EOLhyphen"/>` marks a word
  split across a line break: **rejoin it before tokenising**, or every word index after it drifts.
  (`raw.githubusercontent.com` itself varies between sandbox sessions — see the GitHub recipe below.)
- **archive.org full text**: `https://archive.org/download/<item>/<item>_djvu.txt` — the whole book
  in one request (1.3 MB here). ⚠️ Not every item serves it anonymously:
  `worksofsirthomas00mait` → 200, while `worksofsirthomas0000urqu` (a 1971 reprint) → **401** — its
  `_djvu.txt` exists, but `archive.org/metadata/<item>` shows `access-restricted-item: true`
  (lending library). Check the metadata before concluding there is no text, and prefer a public
  witness. ⚠️ OCR artefacts break word indexing: running heads ("414 PROQUIRITATIONS."),
  section numbers split as "3 1 .", and hyphenation at line ends. Strip/rejoin all three; expect ±1
  residual drift and say so.
- **A Hacker News thread, no browser**: `https://hn.algolia.com/api/v1/items/<id>` returns the
  entire comment tree as JSON (551 comments, 300 KB here). Flatten it to a file and grep it — never
  read it into the main loop. (Finding the thread and walking it: `references/source-recipes.md` / `references/x-native.md` →
  the LAUNCH-tweet bullet.)

---

# The three conditional dives — full text

## When the linked material is itself a RETELLING, not a primary source

A tweet is often not the content — it is an announcement for somebody else's writeup, which itself
condenses several primary documents (a journalist's recap of two technical reports, a thread that
summarizes a paper). Reading that writeup and reporting its numbers, quotes and framing in one voice
— attributed to "the company" or to whichever primary document the writeup was mostly about — is a
repeatable failure, not a hypothetical one.

**Measured 2026-08-31:** one dive merged a journalist's retelling of three primary documents (an
OpenAI blog post, its technical report, a METR/Redwood report) into one voice attributed to OpenAI;
a later cross-check against the primaries found four distinct errors from that one cause.
📖 the four errors → `references/conditional-dives.md`.

**So, when the material behind the link is itself a retelling of other primary documents:**
1. Before writing the report, list the primary documents the retelling draws on.
2. Tag every number, quote and framing with its real source — `[OpenAI blog]`, `[OpenAI tech
   report]`, `[METR]`, `[retelling]` — never the retelling's name or the subject company's name by
   default.
3. Tag anything you did not open yourself as `[from the retelling, not verified]`. Don't write "per
   the tech report" for a document you never actually opened — write it for the retelling instead.
4. Check the retelling's FRAMING separately from its facts. A metaphor, a "phase" numbering, or an
   action attributed to a named model is usually the retelling author's own construction, and it
   slips into a report as fact more easily than a number does — verify it against the primary
   document specifically, not just the numbers near it.
5. When the retelling compares two figures ("even worse than", "softer than"), first confirm the two
   figures actually measure the same thing (same metric, same denominator, same population) — the
   198/898 vs. 30–40% pair above did not, which is what made the comparison wrong in the first place.
   Only once they're comparable, recompute the direction yourself from the primary sources rather
   than trusting the retelling's stated direction; if they aren't comparable, say so instead of
   picking a direction.

## When the tweet makes a claim ABOUT A CORPUS — download the raw dump and grep it

The section above is about a link that retells other documents. This is its sibling: a tweet
asserting something about a *body of material* — "the agents never once discussed him as a person",
"nobody in the dataset ever asked permission". **A claim about a corpus can only be checked against
the corpus.** The write-up gives you the examples its authors chose, so the strongest thing an
excerpt-only reading can honestly say is «no counter-example among the quoted passages» — which is
not the claim under test. Look for a `download` / `data` page on the source site, take the
`.jsonl.gz` / `.zip`, and grep the whole thing in the shell.

**Measured 2026-09-06 on collusion.wiki:** the first pass read only the article and could not rule
out a counter-example among ~14.6k rows; the second fetched `revisions.jsonl.gz` (14,591 rows) and
turned the anecdote into a measurement — **zero** occurrences of `moderator` / `administrator` /
`sysop` / the admin's name in agent-written text. Three mechanics make the difference between a
measurement and a number that merely looks like one:

- **Wiki-style pages are APPEND-ONLY**, so diff each revision against the previous one and search
  only the NEW text. Skip this and one sentence is counted dozens of times as it is carried forward
  — inflation that all points the same way, so nothing in the result looks wrong.
- **A keyword sweep is not a semantic read.** Say so, and probe for paraphrases (`the human`,
  `please stop`, `permission to`, `is this allowed`, honorifics) rather than only the obvious nouns.
  A zero over four literal strings is a fact about those four strings.
- ⚠️ **Read the LITERAL hrefs off the download page — guess the path and you will 404.**
  collusion.wiki serves them under `/explorer/download/<file>`, not `/explorer/<file>`, and a 404 on
  a guessed path reads exactly like "there is no dump".

**Keep the corpus out of the main loop.** Where subagents exist, delegate the download and the grep
to one and take back only the verdict and the verbatim hits. **Where they do not** (Codex App has
none), run the same thing inline in the shell and print only aggregates and matches — pipe to
`grep -c` and a bounded `grep -m 20`, never `cat` the dump. The rule is about what reaches your
context, not about which mechanism you used to keep it out.

## When the tweet announces a SOLVED problem — re-run the mechanism yourself

The section above is about a claim ABOUT a corpus; this is its other sibling, a claimed SOLUTION. A
tweet saying a model *solved* something verifiable (a cipher, a conjecture, a benchmark) is not a
reading task, it is a **replication** task. The write-up states a rule; the rule is executable; run
it against the primary source and report hits, not vibes. And run a **negative control** so the
reader knows what chance looks like — for an indexed decode (a cipher, a book code) that is a
**shuffled control**: the same indices against a randomised source map; for other claim types pick
the domain's equivalent (a held-out split, a random baseline), and say which you used. Measured
2026-09-17 on @bcherny's Cyphral Distich post: **line 1** of the claimed decode
scored **32/32** on the right witness against a **2.77/32** shuffled baseline; line 2 scored
**29/32** (30/32 with the `38` reading below), two positions still unexplained. Report partial
replications as partial — neither number means anything alone, and a headline "solved" is not a
per-line score.

**Scope and feasibility gate.** This applies to a research dive (a bookmark dive, a "research this"
brief) — not to a request that only asks for the post's text, which stays within Step 7's scope.
And it applies only when the rule is actually executable from public material: the source text is
fetchable, the mechanism is stated precisely enough to code, and a meaningful control exists. A
proof, a closed-weights benchmark run or an unpublished method usually fails that test — then say
**"not replicated"** and why, rather than inventing a baseline or quoting the announcement as
verified.
That run kept a small reproducible script (stdlib-only, fetching both witnesses and printing the
score); write one of your own the same way — the decode is only as good as its reproduction.

⚠️ **When the primary source is an early-modern printed book, the EDITION is load-bearing — a decode
that fails on one witness and succeeds on another is a fact about which book you loaded, not about
the claim.** This is what made the public dispute around that post incoherent, and both sides were
internally correct:
📖 the measured dispute (1653 vs 1834 witnesses, reordered petitions, the OCR `38`/`33` reading) → `references/conditional-dives.md`.

**So: before concluding a claimed solve is wrong, confirm you loaded the edition the claim cites** —
and name the witness (shelfmark / TCP id / archive.org id) beside every score you report.

Primary-text channels that work with plain `curl`: EEBO-TCP TEI (rejoin `EOLhyphen` splits before
tokenising), archive.org `_djvu.txt` (check `archive.org/metadata/<item>` for
`access-restricted-item` before concluding there is no text; strip OCR running heads), and an HN
thread as JSON via Algolia (to a file, never into the main loop).
📖 commands and measured traps → `references/conditional-dives.md`.

When the refutation lives in a GitHub repo, judging its provenance (created_at, stars, pushed_at)
needs `api.github.com`, which a Cowork sandbox gates — the GitHub recipe (`references/source-recipes.md`)
has the probe and the browser route. If neither reaches it, say the metadata was unreadable rather
than calling the repo unverifiable.

