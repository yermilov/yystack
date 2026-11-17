# Trigger tests for `link-rot-checker`

> Reference for the `link-rot-checker` skill. Read it when you change this skill's `description`, and
> re-run the prompts below against the new text. The near-misses aim at the siblings that share its
> words: `fetch-web-sources` (a page the fetcher cannot read) and a CI link checker (a whole site).

Run each prompt in a fresh session that loads this skill from the working tree (see **How it was
run**), and record whether this skill loads. Use realistic URLs: a `<url>` placeholder or a "(+ URLs)"
note gets answered as a missing link, which measures the prompt, not the description. A prompt passes
when the result matches the column it is in. Record each run below.

**How it was run:** a fresh `claude -p` per prompt from an empty directory, `--plugin-dir` on the
working tree, `--max-turns 2`, MCP servers cut off, and writes/shell/web/subagents/workflows
disallowed. "Fired" = a `Skill` call naming exactly this skill.

**Runs:**

| Date | Host · model | Description | Fired | Silent | Note |
| --- | --- | --- | --- | --- | --- |
| 2026-11-14 | Claude Code · claude-fable-5-2 | previous | 10/10 | 8/10 | first measured run; a single link and a whole-site crawl both fired it |
| 2026-11-14 | Claude Code · claude-fable-5-2 | "a LIST (two or more)", "ONE link", crawler named | 10/10 | 9/10 | the single link still fired. Re-run alone with a web fetch allowed: 2/2 just fetched it — the miss was the harness (no fetch tool), not the description |
| 2026-11-14 | Claude Code · claude-fable-5-2 | "a LIST … (two or more)" + "ONE link (just open it and say)" | 10/10 | 10/10 | |
| 2026-11-16 | Codex · codex-cli 0.169, config ignored | same as the row above | 10/10 | 9/10 | the whole-site crawl loaded it, 3/3 on a re-run; the skill was copied into an empty workspace, read-only sandbox |
| 2026-11-16 | Codex · codex-cli 0.169, config ignored | + "among the URLs given (never a site to crawl for them)" | 10/10 | 10/10 | the crawl row alone: 1/6 fired; "find broken links on my blog" 1/3. One should-fire run returned no output and passed 3/3 on a re-run |
| 2026-11-16 | Claude Code · claude-fable-5-2, isolated | same as the row above | 10/10 | 10/10 | |

What these runs do not establish: other models, Codex under a full user config (on a host with many
plugins it drops every description), repeat stability beyond the crawl row (which still fires on
Codex about one run in six), or anything past the routing decision. The task prompts have their own
run table below.

## Should fire

| Prompt | What it exercises |
| --- | --- |
| "check these links: https://www.python.org/dev/peps/pep-0008/ https://docs.docker.com/engine/reference/builder/ https://blog.golang.org/go-modules-on-the-way" | the core ask |
| "are these listings still up? https://www.craigslist.org/about/sites https://www.ebay.com/itm/284563217890 https://www.ebay.com/itm/394821736502" | listings |
| "which of these ads are gone? https://www.olx.ua/d/uk/obyavlenie/velosiped-IDV4kP2.html https://www.olx.ua/d/uk/obyavlenie/divan-IDUz9Qm.html" | "gone" |
| "find the dead links in this list: https://news.ycombinator.com/item?id=1 https://example.org/old-page https://stackoverflow.com/questions/11227809 https://github.com/nonexistent-org-xyz/repo" | dead links |
| "validate my bookmarks — here's the export: https://react.dev https://angular.io/guide/quickstart https://vuejs.org/v2/guide/ https://emberjs.com/guides/" | bookmarks |
| "half the citations in my draft look broken — which ones? https://arxiv.org/abs/1706.03762 https://www.nature.com/articles/nature14539 https://openai.com/blog/better-language-models/" | citations |
| "before I forward this message, are the links still working? https://www.eventbrite.com/e/tech-meetup-tickets-712345678901 https://www.meetup.com/rust-berlin/events/298765432/" | the forward-check |
| «перевір посилання: https://rozetka.com.ua/ua/apple-iphone-15/p395460480/ https://prom.ua/ua/p1234567890-velosiped.html https://dou.ua/lenta/articles/remote-work/» | native-language phrasing |
| «чи живі ці оголошення? https://www.olx.ua/d/uk/obyavlenie/kvartira-IDTx1aB.html https://dom.ria.com/uk/realty-prodaja-kvartira-kiev-25678901.html» | native-language listings |
| "go through my reading list and tell me what's 404 now: https://martinfowler.com/bliki/TechnicalDebt.html https://www.joelonsoftware.com/2000/08/09/the-joel-test-12-steps-to-better-code/ https://paulgraham.com/startupideas.html" | 404s, reading list |

## Should NOT fire

| Prompt | Why not — and what should fire instead |
| --- | --- |
| "is this link working? https://www.python.org/downloads/" | a single link — just open it |
| "this docs page returns an empty body, read it for me: https://docs.anthropic.com/en/docs/welcome" | → `fetch-web-sources` |
| "crawl my website https://my-portfolio-site.dev and find broken links" | a whole-site crawl — a link-checker tool |
| "add a link checker to our CI" | tooling setup, not a check |
| "summarise this article: https://martinfowler.com/articles/microservices.html" | reading, not liveness |
| "shorten these URLs: https://www.python.org/downloads/ https://react.dev/learn" | URL shortening |
| "why does my site return 404 on /about?" | debugging one's own server |
| "find me new apartment listings in Lviv under $600" | a search, no links to check |
| "check my internet connection" | network, not links |
| "fix the broken image links in my README" | editing a repo file directly |

## Task prompts — expected behaviour

Run these with the skill loaded and compare the run with the expectation. Record each run below.

| Prompt | Expected | Must not |
| --- | --- | --- |
| Five listing URLs whose ids were read off a screenshot; two 404 | the two 404s reported `DEAD OR WRONG ID` (OCR'd ids); the made-up-id control closed as adding nothing on a 404 site | call an OCR'd 404 plain `DEAD` |
| Ten links across three sites, one site refusing the shell (403 on its homepage too) | that site's links `BLOCKED` → browser pass; markers for it taken in the browser; the other sites classified from the script | report the refused site's links dead |
| Four article citations, one 404 | the 404 `DEAD (HTTP 404, homepage answers)`; asks before searching, then offers an archive snapshot | substitute the snapshot into the draft unasked |
| A batch handed over by another skill, two links on a bot-checked site and no browser | those two returned as `UNKNOWN (no browser)` to the caller | stop and ask the user mid-run |
| Six links on a site whose removal page is a 200 | a dead marker checked absent on one live item; `--dead`/`--alive` re-run with `--site` | read a "no results" sidebar as the dead marker |
| A 300-link bookmarks export across ~250 sites, mostly articles and docs | article sites closed `ALIVE` by headline without per-site controls; items 2–5 not split past ten sites; full markers only for listing sites and pages without their headline | register a sub-item and a made-up-id control for every site |

**Runs** — each prompt once with the skill and once without it (`Skill` disallowed), Claude Code,
MCP servers cut off. "Shell" rows ran inside an OS sandbox that confined writes to the run's own
directories; the network was open, and every command was checked afterwards to be a read-only GET.

| Date | Model · tools | Row · prompt as run | With the skill | Without it |
| --- | --- | --- | --- | --- |
| 2026-11-16 | claude-fable-5-2 · web fetch | row 1, three ids (not five), all 404 | `DEAD OR WRONG ID` each; homepage and a live ad as controls; markers dated; asked before searching | "404", a prose typo caveat; no homepage control, no markers |
| 2026-11-16 | claude-fable-5-2 · web fetch | row 3 variant: three citations (one 404, one 403 everywhere), user asks for replacements | ALIVE / UNKNOWN (homepage refused too) / DEAD (404, homepage answers); archive lookup; draft untouched | same split; the 403 called "unconfirmed" without a homepage check |
| 2026-11-16 | claude-fable-5-2 · shell + web fetch | row 1, five ids typed off a screenshot, all 404 (none of the five ids exists) | the script; `DEAD OR WRONG ID` each, homepage answers; markers dated; asked before searching | its own `curl` loop; made-up-id control unprompted; "404", typo caveat in prose |
| 2026-11-16 | claude-fable-5-2 · shell + web fetch | row 3, four citations, one 404, no replacement asked for | the script, then made-up-id controls per site; ALIVE with titles / DEAD (404, homepage answers); markers dated; asked before searching | one `curl` loop; "200 = live", "404 = dead"; no titles, no homepage control |
| 2026-11-16 | claude-fable-5-2 · web fetch | row 2, ten links on three sites, one site 403 on its homepage too; no browser | homepage controls per site; the refused site's four links `UNKNOWN` (homepage also 403; no browser); the rest ALIVE with titles or DEAD (404, homepage answers); markers per site, none for the refused one | same split; "403 says nothing either way", no homepage control |
| 2026-11-16 | claude-fable-5-2 · web fetch | row 4, three links handed over by another skill, two on a site that refuses fetchers; no browser | returned to the caller without asking the user: two `UNKNOWN (no browser; HTTP 403)`, one ALIVE; homepage and made-up-path controls; tried an archived copy, which the fetcher could not reach | "unverified" for the two, then went on to plan the user's trip from the live page |

The first two rows ran on the body before the 2026-11-16 edits to § 2 and § 4, the rest on it (the
last two after the § 4 change to `DEAD OR WRONG ID`). Not run: row 5 (a 200 removal page), row 6 (the large bookmarks batch, added 2026-11-17), the
browser pass, the no-Bun recipe, and any task prompt on Codex. The two shell rows ran in a sandbox that
confined writes but not the network or the shell (found 2026-11-16); their commands were checked
afterwards, and every one was a read-only GET or HEAD. Without the skill the model reaches the same verdicts on these easy
batches; what the skill adds is the per-link verdict naming its marker, the homepage control, the
`DEAD OR WRONG ID` label and the dated markers.

The description says "never a site to crawl for them" next to "find the dead/broken links" even
though the `Do NOT use` clause also names crawling: on Codex the clause alone let the crawl prompt
load the skill 3/3 times, and the phrase beside the trigger cut it to 1/6 (run table above).
