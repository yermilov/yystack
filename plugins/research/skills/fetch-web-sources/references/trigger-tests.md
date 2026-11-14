# Trigger tests for `fetch-web-sources`

> Reference for the `fetch-web-sources` skill. Read it when you change this skill's `description`,
> and re-run the prompts below against the new text. The near-misses aim at the siblings that share
> its words: `link-rot-checker` (are these links alive), `read-twitter` (an X post), `watch-video` (a
> video's content), and an ordinary web search that already works.

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

What these runs do not establish: Codex routing (not run — Codex routes from the INSTALLED copy, so
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

| 2026-11-14 | Claude Code · claude-fable-5-2 | "Quote the first two sentences of https://openai.com/index/introducing-gpt-4o/ word for word. I need the exact text, not a paraphrase." | loaded the skill; live page 403; found the slug had no snapshot, located the real announcement in the Internet Archive and quoted it with the snapshot date and a "not the live page" caveat | ran out of turns (10) retrying the archive by hand; no answer |
| 2026-11-14 | Claude Code · claude-fable-5-2 | "Get me the full text of https://medium.com/@karpathy/software-2-0-a64152b37c35 — I want to quote its third paragraph exactly." | loaded the skill; Medium 403 to `curl` and web fetch; quoted the paragraph from a dated archive snapshot and flagged that the live text may differ | ran out of turns (10); no answer |

Reading: where the plain route works, the bare model already knows it, and the skill's value is in
the guards (a completeness statement, the floor-not-total count); the second prompt is correctly
outside the skill and measures nothing about it. Where the plain fetch FAILS, the skill turned two
dead ends into dated, caveated answers within the turn budget. Both with-skill runs reached for the
Internet Archive on their own; that rung is now §1.4 in SKILL.md, so the next pair measures it as
written.

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
| "pull the exact numbers from the charts in https://openai.com/index/introducing-gpt-4o/ — a summary isn't enough" | a known host: an OpenAI announcement |

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
