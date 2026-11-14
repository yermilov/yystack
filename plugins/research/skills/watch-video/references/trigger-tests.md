# Trigger tests for `watch-video`

> Reference for the `watch-video` skill. Read it when you change this skill's `description`, and
> re-run the prompts below against the new text. The near-misses aim at the siblings that share its
> words: `deep-research` (a multi-model answer), `read-twitter` (a video posted on X) and
> `fetch-web-sources` (a web page that is not a video).

Run each prompt in a fresh session that loads this skill from the working tree (see **How it was
run**), and record whether this skill loads. Use realistic URLs and paths: a `<id>` placeholder gets
answered as a placeholder, which measures the prompt, not the description. A prompt passes when the result matches the column it is in. Record each run below.

**How it was run:** a fresh `claude -p` per prompt from an empty directory, `--plugin-dir` on the
working tree, `--max-turns 2`, MCP servers cut off, and writes/shell/web/subagents/workflows
disallowed. "Fired" = a `Skill` call naming exactly this skill.

**Runs:**

| Date | Host · model | Description | Fired | Silent | Note |
| --- | --- | --- | --- | --- | --- |
| 2026-11-14 | Claude Code · claude-fable-5-2 | previous | 12/12 | 9/9 | first measured run, realistic URLs and paths |
| 2026-11-14 | Claude Code · claude-fable-5-2 | boundary moved before the mode summary | 12/12 | 8/9 | the voice memo fired this skill |
| 2026-11-14 | Claude Code · claude-fable-5-2 | same + an audio-only boundary | 11/12 | 9/9 | the Loom prompt missed: its clause now sat behind the boundary. Reverted |
| 2026-11-14 | Claude Code · claude-fable-5-2 | original order + the audio-only boundary | 12/12 | 9/9 | run twice, both 12/12 + 9/9 |
| 2026-11-14 | Claude Code · claude-fable-5-2 | current: same + "answer it directly" | 12/12 | 9/9 | |

The order is measured, not stylistic: the mode summary and the Loom clause stay before the "Not
for" list (third row).

What these runs do not establish: Codex routing (not run), other models, or anything past the routing
decision.

## Should fire

| Prompt | What it exercises |
| --- | --- |
| "summarise this video: https://youtu.be/aircAruvnKk" | the core YouTube ask |
| "get me the transcript of https://www.youtube.com/watch?v=kCc8FmEb1nY" | transcript / captions |
| "what are the steps in this tutorial? https://www.youtube.com/watch?v=Yocja_N5s1I" | extract the steps |
| "let's discuss this talk — https://www.youtube.com/watch?v=zjkBMFhNj_g" | the knowledge-file mode |
| "what's in this clip? /Users/me/Downloads/clip.mov" | a local file by path |
| "here's my screen recording, what went wrong? ~/Desktop/Screen Recording 2026-11-12 at 10.14.03.mov" | a screen recording, no speech likely |
| "watch the Zoom recording ~/Documents/Zoom/standup.mp4 and list the action items" | a meeting recording |
| "what does the guy say at the end of this short? https://youtube.com/shorts/9bZkp7q19f0" | /shorts/ |
| «що на цьому відео? ~/Downloads/video_2026-11-10.mp4» | a native-language phrasing |
| «зроби конспект цього відео https://www.youtube.com/watch?v=8pTEmbeENF4» | native-language summary |
| "watch this and tell me if the advice is outdated: https://www.youtube.com/watch?v=rfscVS0vtbw" | "watch", a judgement |
| "summarise this Loom: https://www.loom.com/share/4f1e2d3c5b6a47889a0b1c2d3e4f5a6b" | hosted video → asks for the file |

## Should NOT fire

| Prompt | Why not — and what should fire instead |
| --- | --- |
| "ask ChatGPT and Gemini whether intermittent fasting extends lifespan" | a multi-model answer → `deep-research` |
| "read this tweet: https://x.com/jack/status/20" | an X post → `read-twitter` |
| "summarise this article: https://martinfowler.com/articles/microservices.html" | a web page → `fetch-web-sources` |
| "download this YouTube video as mp4: https://youtu.be/aircAruvnKk" | saving the video is out of scope |
| "make a video of my app's onboarding" | creating video, not reading it |
| "convert ~/Downloads/clip.mov to mp4" | a format conversion, answer directly |
| "what's a good YouTube channel about woodworking?" | a recommendation, no video given |
| "compress ~/Movies/demo.mov for email" | an edit, not extraction |
| "transcribe this voice memo: ~/Downloads/memo.m4a" | audio only — not a video, answer directly |
