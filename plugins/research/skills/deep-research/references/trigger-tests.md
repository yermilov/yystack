# Trigger tests for `deep-research`

> Reference for the `deep-research` skill. Read it when you change this skill's `description`, and
> re-run the prompts below against the new text. The near-misses aim at what shares its words: the
> host's own single-agent research, a quick lookup, a code second opinion, and the sibling research
> skills (`watch-video`, `read-twitter`, `fetch-web-sources`, `link-rot-checker`).

Run each prompt in a fresh session with the marketplace installed, and record whether this skill
loads. A prompt passes when the result matches the column it is in. Record each run below.

**How to run it.** A fresh `claude -p` per prompt from an empty directory, with `--plugin-dir` on the
working tree, `--max-turns 2` (the first turn is often a lookup, not the routing decision), MCP servers
cut off (`--strict-mcp-config` with an empty config), and the shell, file writes, web, subagents and
workflows disallowed. **This skill needs a browser, so the session must SEE one**: pass `--chrome` and
disallow every browser tool except the read-only browser listing. Without a visible browser the model
correctly declines to load a browser-only skill, and the run measures the harness instead of the
description. "Fired" = a `Skill` call naming this skill.

**On Codex** there is no per-run plugin directory, so a run measures the INSTALLED copy: run the
same prompts in fresh Codex sessions only once the installed copy carries this exact description
(diff it against the working tree first), with a signed-in browser available to it, and record the
row with host `Codex`. Until such a row exists, Codex routing is unverified.

**Runs:**

| Date | Host · model | Browser visible | Description | Fired | Silent | Note |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-11-14 | Claude Code · claude-fable-5-2 | no | previous | 5/10 | 10/10 | misses said "this session has no browser"; confounded |
| 2026-11-14 | Claude Code · claude-fable-5-2 | no | current | 4/10 | 10/10 | same confound |
| 2026-11-14 | Claude Code · claude-fable-5-2 | yes | previous | 10/10 | 10/10 | |
| 2026-11-14 | Claude Code · claude-fable-5-2 | yes | current (shipped) | 10/10 | 10/10 | ran with `<id>`/`<user>` placeholders in two should-not rows |
| 2026-11-14 | Claude Code · claude-fable-5-2 | yes | current | — | 2/2 | only the two rows whose placeholders were replaced, full environment; `watch-video` and `read-twitter` fired, as their column says |

What these runs do not establish: Codex routing (not run), other models, repeat stability (each
prompt ran once per row), or behaviour beyond the routing decision (no council was run).

## With-skill vs baseline (2026-11-14, Claude Code)

One run of "have several AIs debate whether we should rewrite the backend in Rust" with the
browser visible: the skill loaded on the first turn and registered all of its Step-0 items (14 at that
commit; the list has 15 now, and this run was not repeated on it) before any browser call. The baseline is confounded: it ran without a visible browser rather than with the skill
disallowed. There, with no skill loaded, the same prompt got one model arguing
four positions itself, labelled as such, with no outside model consulted. Not established: a full
council run end to end (that spends the user's paid quotas, so it was not done for a test).

Clean baseline, 2026-11-14 (Claude Code · claude-fable-5-2, browser visible, the skill tool
disallowed, `--max-turns 4`): the same prompt never checked for a browser and never mentioned
ChatGPT or Gemini; it said it had no way to reach other AIs and argued both sides itself, labelled
as one model. So the measured difference is in routing and setup: with the skill, the run loaded it
and registered its council steps; without it, the run never considered outside models. Not
established: that the skill then checks the browser or convenes the models (the with-skill run
stopped before any browser call), the with-skill side on this exact setup, repeat stability.

## Should fire

| Prompt | What it exercises |
| --- | --- |
| "get a second opinion from ChatGPT and Gemini on whether I should refinance now" | the explicit multi-model ask |
| "ask other models whether this migration plan is sound" | "other models" without vendor names |
| "cross-check this claim with other AIs: intermittent fasting extends lifespan" | cross-check |
| "run a council on which vector database to pick for 50M embeddings" | the word "council" |
| "I want ChatGPT's and Gemini's take on this contract clause" | vendors named, no verb "research" |
| «зроби рісерч з іншими моделями: чи варто переходити на Kotlin Multiplatform» | native-language ask |
| «спитай інші моделі, що вони думають про цей бізнес-план» | native-language "ask other models" |
| "do a deep research with ChatGPT deep research and Gemini deep research on heat pumps for an old house" | vendors' DR modes named |
| "have several AIs debate whether we should rewrite the backend in Rust" | debate / several AIs |
| "deep research this: is a 4-day week viable for a 20-person agency?" | the bare "deep research" ask — the skill fires to OFFER the council |

## Should NOT fire

| Prompt | Why not — and what should fire instead |
| --- | --- |
| "what's the capital of Australia?" | a quick factual lookup |
| "review this function for bugs: function add(a, b) { return a - b }" | a review of code in front of you, by this agent |
| "summarise this YouTube talk: https://youtu.be/8kN2mQx4vTs" | a video → `watch-video` |
| "read this tweet: https://x.com/example_user/status/1856203317452990112" | an X post → `read-twitter` |
| "fetch this article and summarise it: https://example.com/post" | one web page → the host's own fetch (`fetch-web-sources` only if that fails) |
| "check which of these 30 listing links are still alive" | dead links → `link-rot-checker` |
| "write me a ChatGPT prompt for summarising meeting notes" | prompt writing, not research |
| "what's the difference between GPT and Gemini?" | a question ABOUT the models, not one put to them |
| "log in to my ChatGPT account and export my chat history" | account admin, not a council |
| "search the web for today's EUR/USD rate" | a live lookup |
