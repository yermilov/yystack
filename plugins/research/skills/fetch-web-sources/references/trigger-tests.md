# Trigger tests for `fetch-web-sources`

> Reference for the `fetch-web-sources` skill. Read it when you change this skill's `description`,
> and re-run the prompts below against the new text. The near-misses aim at the siblings that share
> its words: `link-rot-checker` (are these links alive), `read-twitter` (an X post), `watch-video` (a
> video's content), `deep-research` (other models' opinion of a page), and an ordinary web search
> that already works.

Run each prompt in a fresh session that loads this skill from the working tree (see **How it was
run**), and record whether this skill loads. Use realistic URLs: a `<url>` placeholder gets answered
as a missing link, which measures the prompt, not the description. A prompt passes when the result
matches the column it is in.

**How it was run:** a fresh `claude -p` per prompt from an empty directory, `--plugin-dir` on the
working tree, `--max-turns 2`, MCP servers cut off, and writes/shell/web/subagents/workflows
disallowed. "Fired" = a `Skill` call naming exactly this skill. **Full** = the runner's own installed
plugins loaded alongside (other marketplaces compete for the prompt); **isolated** =
`--setting-sources project`, so only this plugin and the host's built-ins are loaded — what a user of
this marketplace alone would see.

**Runs:**

| Date | Host · model | Env | Description | Fired | Silent | Note |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-11-14 | Claude Code · claude-fable-5-2 | full | previous + watch-video boundary | 6/10 | 9/10 | two repo searches went to another marketplace's GitHub skill, the 401 and login prompts to nothing; the article prompt fired it (no fetch tool in the harness) |
| 2026-11-14 | Claude Code · claude-fable-5-2 | full | repo search reworded | 5/10 | 9/10 | also lost the docs 404 to the host's built-in API skill |
| 2026-11-14 | Claude Code · claude-fable-5-2 | isolated | same | 10/10 | 10/10 | the misses above were competition, not absence |
| 2026-11-14 | Claude Code · claude-fable-5-2 | isolated | + known-host clause, 12 prompts | 12/12 | 10/10 | |
| 2026-11-14 | Claude Code · claude-fable-5-2 | full | same | 12/12 | 10/10 | |
| 2026-11-14 | Claude Code · claude-fable-5-2 | isolated | same, + an OpenAI-announcement prompt | 13/13 | 10/10 | |
| 2026-11-14 | Claude Code · claude-fable-5-2 | full | same | 13/13 | 10/10 | |
| 2026-11-14 | Claude Code · claude-fable-5-2 | isolated | research 0.2.22 (871 chars): + 403 / bot-check and archived-copy situations; five new should-fire rows (403, archive, Typeform, Luma, SEC) and a `deep-research` near-miss | 18/18 | 11/11 | |
| 2026-11-14 | Claude Code · claude-fable-5-2 | full, installed `research@yystack` disabled | same | 18/18 | 11/11 | one copy of the skill in `init` |
| 2026-11-14 | Claude Code · claude-fable-5-2 | isolated | same description; + a vendor-blog row, the Luma row on a live calendar | 19/19 | 11/11 | |
| 2026-11-14 | Claude Code · claude-fable-5-2 | full, installed `research@yystack` disabled | same | 18/19 | 11/11 | the Hugging Face memory prompt was answered from memory once; alone ×3 it fired 2/3 (the harness gives the session no fetch tool, which invites a from-memory answer) |

What these runs do not establish: should-not rows whose right answer is "just fetch it" were run
with web fetch disallowed, so they measure the description alone, not the competition with a
working fetch; Codex routing (not run — Codex routes from the INSTALLED copy, so
a run counts for this description only once the installed text matches the working tree), other
models, repeat stability (each prompt ran once per row), or anything past the routing decision.

## With the skill vs without it

Each task prompt ran once with the skill available and once with `Skill` disallowed; same harness as
above, isolated, `--max-turns 10`, web fetch allowed. The first two rows allowed a bare shell; the
last two only `Bash(curl:*)` and `Bash(bun run:*)` — narrower, still unconfined (no OS sandbox).
Recorded is what changed in the answer, not a score.

| Date | Host · model | Prompt | With the skill | Without it |
| --- | --- | --- | --- | --- |
| 2026-11-14 | Claude Code · claude-fable-5-2 | "Find public GitHub repositories whose code contains the literal string `CLAUDE_CODE_ENABLE_TODO_TOOLS`. I don't have a GitHub token." | loaded the skill, one `sg-search.ts` run: 66 repos / 509 matches, and said the stream finished with no result limit hit | also reached Sourcegraph (three hand-built calls), same 66 repos, no statement on whether the stream finished |
| 2026-11-14 | Claude Code · claude-fable-5-2 | "What sources does https://www.anthropic.com/research/building-effective-agents link to? List the outbound links in the article body exactly." | did NOT load the skill — a plain `curl` worked — and listed 17 links / 14 unique | same: `curl` + a parser, same 17 / 14 |
| 2026-11-14 | Claude Code · claude-fable-5-2 | "Quote the first two sentences of https://openai.com/index/introducing-gpt-4o/ word for word. I need the exact text, not a paraphrase." | loaded the skill; live page 403; found the slug had no snapshot (the prompt's slug was wrong — the announcement is `/index/hello-gpt-4o/`), located the real announcement in the Internet Archive and quoted it with the snapshot date and a "not the live page" caveat | ran out of turns (10) retrying the archive by hand; no answer |
| 2026-11-14 | Claude Code · claude-fable-5-2 | "Get me the full text of https://medium.com/@karpathy/software-2-0-a64152b37c35 — I want to quote its third paragraph exactly." | loaded the skill; Medium 403 to `curl` and web fetch; quoted the paragraph from a dated archive snapshot and flagged that the live text may differ | ran out of turns (10); no answer |

Reading: where the plain route works, the bare model already knows it, and the skill's value is in
the guards (a completeness statement, the floor-not-total count); the second prompt is correctly
outside the skill and measures nothing about it. Where the plain fetch FAILS, the skill turned two
dead ends into dated, caveated answers within the turn budget. Both with-skill runs reached for the
Internet Archive on their own; that rung is now §1.4 in SKILL.md and `scripts/wayback.ts`.
**Still open (2026-11-14):** no with/without pair has run `wayback.ts`, `gh-repos.ts` or
`html-to-text.ts` as written (a shell needs an OS sandbox for that pair).

**Re-run 2026-11-14 on the current body, web fetch only** (no shell, so `wayback.ts` itself was not
measured; this host's web-fetch tool cannot reach `web.archive.org` at all, so §1.4 could not be
exercised either):

| Prompt | With the skill | Without it |
| --- | --- | --- |
| the OpenAI announcement quote (real slug `/index/hello-gpt-4o/`) | 403 live, archive unreachable; then **quoted the text via a third-party reader proxy** | 403 live, archive unreachable; declined to quote, asked for the text |
| the Medium paragraph | 403 on both Medium hosts; **tried a reader proxy and two Medium mirrors, one a paywall-bypass service**; quoted only a fragment | 403; **explicitly declined mirrors as working around the block** |

Reading: on a host where neither the shell nor the archive is reachable, the skill's framing pushed
the agent to third-party proxies the bare model refused. SKILL.md «Cautions for every rung» now
forbids them. Re-run with that rule, same day, with-skill side only: both runs tried the live page and
the Internet Archive, touched no third-party proxy or mirror, and reported the page unread — the
same end state as the runs without the skill. On a host with neither a shell nor archive access the
skill now adds nothing over the bare model; its value there is only that it no longer makes things
worse.

## Should fire

| Prompt | What it exercises |
| --- | --- |
| "WebFetch on https://docs.astro.build/en/guides/content-collections/ came back empty — can you read it?" | an empty client-rendered page |
| "I'm getting a 404 fetching https://docs.anthropic.com/en/docs/build-with-claude/tool-use/overview, but the page exists in my browser" | a 404 on a docs site |
| "the fetch of https://nextjs.org/docs/app/building-your-application/routing only returns the nav menu" | 95% navigation chrome |
| "get me https://bun.sh/docs/runtime/shell as clean markdown" | markdown / llms.txt |
| "find which public GitHub repos contain the string `CLAUDE_CODE_ENABLE_TODO_TOOLS` — I don't have a token" | literal search without a token |
| "GitHub code search gives me 401 without auth, how else can I search for `useSyncExternalStore(` usages?" | "code search 401" |
| "what have people actually built with the new OpenAI Agents SDK? find real repos" | what people built |
| "the docs at https://app.supabase.com need a login, but the product is open source — where's the real answer?" | a login over an open-source product |
| «сторінка https://docs.deno.com/runtime/fundamentals/configuration/ не читається, дістань текст» | native-language phrasing |
| «знайди рядок `X-Stainless-Retry-Count` у публічних репозиторіях» | native-language repo search |
| "curl on https://medium.com/@karpathy/software-2-0-a64152b37c35 gives 403 — get me the full post" | a known host: Medium |
| "how much memory do I need for the weights in https://huggingface.co/Qwen/Qwen2.5-72B-Instruct? check the file sizes" | a known host: Hugging Face |
| "pull the exact numbers from the charts in https://openai.com/index/hello-gpt-4o/ — a summary isn't enough" | a known host: an OpenAI announcement |
| "curl on https://www.reuters.com/technology/ returns 403 with a 'Just a moment…' page — how do I read it?" | a generic 403 / bot-check page |
| "find an archived copy of https://www.anandtech.com/show/21445 — the site took its articles down" | an archived copy |
| "what questions does the form at https://form.typeform.com/to/q7Xb2LcN ask? list them without submitting anything" | a known host: Typeform |
| "list the upcoming events on https://luma.com/aitinkerers with their dates" | a known host: Luma |
| "pull the revenue line from Figma's S-1 on EDGAR" | a known host: SEC filings |
| "a web fetch of https://www.anthropic.com/research/building-effective-agents gave me a summary — I need the exact wording and every link it cites" | a known host: a vendor blog |

## Should NOT fire

| Prompt | Why not — and what should fire instead |
| --- | --- |
| "search the web for the latest Node.js LTS version" | an ordinary search that works |
| "check these links are still alive: https://react.dev https://angular.io/guide/quickstart https://vuejs.org/v2/guide/" | → `link-rot-checker` |
| "read this tweet: https://x.com/jack/status/20" | → `read-twitter` |
| "summarise this video: https://youtu.be/aircAruvnKk" | → `watch-video` |
| "summarise this article: https://martinfowler.com/articles/microservices.html" | the fetch works; just read it |
| "write a scraper in Python for product prices" | building a scraper, not reaching a source |
| "my own Next.js site renders an empty page in production, why?" | debugging one's own app |
| "clone https://github.com/oven-sh/bun and build it" | a clone and build, not a fetch |
| "what's the GitHub API rate limit without a token?" | a fact question |
| "log in to my bank and download the statement" | a private, credentialed site |
| "ask ChatGPT and Gemini whether the claims in https://www.anthropic.com/research/building-effective-agents hold up" | other models' opinion → `deep-research` |
