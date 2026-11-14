# Trigger tests for `read-twitter`

> Reference for the `read-twitter` skill. Read it when you change this skill's `description`, and
> re-run the prompts below against the new text. The near-misses aim at what shares its words: a
> YouTube link (`watch-video`), a page a fetch can't read (`fetch-web-sources`), posting or
> engaging on X, and batch work.

Run each prompt in a fresh session with the marketplace installed, and record whether this skill
loads. Use realistic URLs: a model asked about `x.com/<user>/status/<id>` correctly answers that the
link is a placeholder, which measures the prompt, not the description (the invalid run is in the table below). A prompt passes when the result matches the column it is in. Record each run below.

**How it was run:** a fresh `claude -p` per prompt from an empty directory, `--plugin-dir` on the
working tree, `--max-turns 2`, MCP servers cut off, writes/shell/web/subagents/workflows disallowed, and
`--chrome` with only the read-only browser listing allowed, because this skill needs a browser and a
session without one would rightly decline it. "Fired" = a `Skill` call naming this skill.

**Runs:**

| Date | Host · model | Description | Fired | Silent | Note |
| --- | --- | --- | --- | --- | --- |
| 2026-11-14 | Claude Code · claude-fable-5-2 | previous | 3/10 | 10/10 | prompts used `<user>/<id>` placeholders; the model asked for a real link. Invalid run |
| 2026-11-14 | Claude Code · claude-fable-5-2 | previous | 9/10 | 10/10 | realistic URLs; the miss was a 402 prompt carrying no link |
| 2026-11-14 | Claude Code · claude-fable-5-2 | previous | 10/10 | 10/10 | 402 prompt given its link |
| 2026-11-14 | Claude Code 2.1.325 · default model | current (shipped: "Several posts: run it once per post") | 11/11 | 10/10 | isolated (`--setting-sources project`) AND full environment (installed copy disabled, one copy in `init`): both 11/11 + 10/10; the new several-posts row fired in both |

What these runs do not establish: Codex routing (not run), other models, repeat stability (each prompt
ran once per row), or anything past the routing decision.

## Should fire

| Prompt | What it exercises |
| --- | --- |
| "read this tweet: https://x.com/jack/status/20" | the core ask |
| "what does this thread say? https://x.com/devtools_daily/status/1856345678901234567" | a thread |
| "summarise https://twitter.com/ml_notes/status/1849012345678901234 and the replies" | twitter.com host, replies |
| "is the claim in this post true? https://x.com/buildinpublic/status/1861234567890123456" | a claim to check |
| "fetching https://x.com/infra_notes/status/1857766554433221100 gave me HTTP 402, can you read it?" | the 402 symptom |
| "what's in the screenshot attached to https://x.com/devlog_daily/status/1853456789012345678?" | an image post |
| "this X article looks interesting: https://x.com/rustlang_news/status/1847654321098765432" | an X Article |
| "what's in the video in this tweet? https://x.com/gpu_bench/status/1859876543210987654" | native video |
| «прочитай твіт https://x.com/oss_weekly/status/1851122334455667788» | a native-language ask |
| «що там у треді? https://x.com/frontend_fm/status/1862233445566778899» | native-language thread |
| "read these and tell me what they have in common: https://x.com/jack/status/20 https://x.com/devtools_daily/status/1856345678901234567 https://x.com/ml_notes/status/1849012345678901234" | several posts — run once per post, not refused as a batch |

## Should NOT fire

| Prompt | Why not — and what should fire instead |
| --- | --- |
| "summarise this talk: https://youtu.be/dQw4w9WgXcQ" | a video → `watch-video` |
| "this docs page renders empty in fetch: https://docs.example.com/guide" | not X → `fetch-web-sources` |
| "post a tweet saying we shipped v2" | writing to X; this skill is read-only |
| "like and retweet https://x.com/data_eng/status/1848899001122334455" | engaging; read-only skill |
| "go through all my X bookmarks and file them" | a bookmarks sweep: no single post given (a bookmarks skill, where one is installed, can call this one per post) |
| "what's the character limit for a tweet?" | a fact about X, no post to read |
| "write a LinkedIn post about our launch" | another network, and writing |
| "search X for posts about bun 2.0" | a search, not one post |
| "who is @jack?" | no post given |
| "translate this tweet I pasted: «just setting up my twttr»" | the text is already here; nothing to read from X |

## Task prompts — behaviour, not routing

Each names the shape of post to pick, what a run must produce and what it must not do. Not yet run as
a with-skill vs baseline comparison (2026-11-14): pick a live post of each shape on the day you run it.

| Post shape | Must | Must not |
| --- | --- | --- |
| A quote-tweet whose point is in the quoted post | a separate «Quoted post» block; the quoted post's media under it | fold the quoted text into the root body |
| A thread whose artifact (repo, prompt) is in an author self-reply | find it via the conversation search (Step 5.3) and list it | report "no link" off the status page alone |
| A post that is only an image of text or code | transcribe the image (Step 6) | describe it from `alt`, or skip it |
| A post with a native video | name whose video it is; report audio as stream-missing / silent / transcribed | call the video "unreadable" without the ffmpeg checks |
| A protected account | report the post unreadable, with the screenshot and the endpoint's tombstone | look for the text in archive copies or third-party caches |
