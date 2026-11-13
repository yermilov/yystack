# research

Skills for reading the web well — getting at content an agent's ordinary fetch or search cannot see,
and being honest about what was and wasn't read.

## Skills

- **fetch-web-sources** — a ladder of cheap, credential-free recipes for when a fetch comes back
  empty, 404 or all navigation: find the real docs path in `llms.txt`, ask for the markdown twin, run
  literal code search (Sourcegraph) and issue / repository search (GitHub) without a token, take an
  uptake census of a newly launched product, and research an open-source deployment behind a login
  from its own public issues and docs. Ships `scripts/sg-search.ts` and `scripts/gh-repos.ts`, which
  refuse to report a truncated or partial result as an answer. Triggers: "the page comes back empty",
  "find this string on GitHub", "code search 401", "what has anyone built with X".
- **watch-video** — extract what a video says and shows. A local file is read offline (ffmpeg frames
  + whisper.cpp transcript, never uploaded); a YouTube URL goes through Gemini, either as a quick
  one-shot or as a saved knowledge file (yt-dlp transcript + Gemini's timestamped visual overview)
  answered from with `[MM:SS]` citations. Ships `scripts/fetch-transcript.ts`. Triggers: "summarise
  this video", "transcript", "chat with this video", "what's in this clip".
- **link-rot-checker** — check which links in a batch are alive, dead or unknown, with a positive
  marker for every verdict and a made-up-id control, and offer replacements for the dead ones.
  Triggers: "check these links", "are these still working".

All scripts are Bun + TypeScript (`bun run "<skill dir>/scripts/<name>.ts" --help`).
