# Trigger tests for `link-rot-checker`

> Reference for the `link-rot-checker` skill. Read it when you change this skill's `description`, and
> re-run the prompts below against the new text. The near-misses aim at the siblings that share its
> words: `fetch-web-sources` (a page the fetcher cannot read) and a CI link checker (a whole site).

Run each prompt in a fresh session with the marketplace installed, and record whether this skill
loads. A prompt passes when the result matches the column it is in. Record each run below.

**Runs:** none yet. The set was written on 2026-11-14 from the description and has not been run.
Until a dated row appears here (host, fired x/10, stayed silent y/10), the description's routing has
been reviewed but not measured.

## Should fire

| Prompt | What it exercises |
| --- | --- |
| "check these links: <url> <url> <url>" | the core ask |
| "are these listings still up?" (+ several URLs) | listings |
| "which of these ads are gone?" (+ URLs) | "gone" |
| "find the dead links in this list" (+ URLs) | dead links |
| "validate my bookmarks" (+ an exported list) | bookmarks |
| "half the citations in my draft look broken — which ones?" | citations |
| "before I forward this message, are the links still working?" | the forward-check |
| «перевір посилання» (+ URLs) | native-language phrasing |
| «чи живі ці оголошення?» (+ URLs) | native-language listings |
| "go through my reading list and tell me what's 404 now" | 404s, reading list |

## Should NOT fire

| Prompt | Why not — and what should fire instead |
| --- | --- |
| "is this link working? <one url>" | a single link — just open it |
| "this docs page returns an empty body, read it for me" | → `fetch-web-sources` |
| "crawl my website and find broken links" | a whole-site crawl — a link-checker tool |
| "add a link checker to our CI" | tooling setup, not a check |
| "summarise this article: <url>" | reading, not liveness |
| "shorten these URLs" | URL shortening |
| "why does my site return 404 on /about?" | debugging one's own server |
| "find me new apartment listings in this area" | a search, no links to check |
| "check my internet connection" | network, not links |
| "fix the broken image links in my README" | editing a repo file directly |
