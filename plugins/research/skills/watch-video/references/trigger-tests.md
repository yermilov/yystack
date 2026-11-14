# Trigger tests for `watch-video`

> Reference for the `watch-video` skill. Read it when you change this skill's `description`, and
> re-run the prompts below against the new text. The near-misses aim at the siblings that share its
> words: `deep-research` (a multi-model answer), `read-twitter` (a video posted on X) and
> `fetch-web-sources` (a web page that is not a video).

Run each prompt in a fresh session with the marketplace installed, and record whether this skill
loads. A prompt passes when the result matches the column it is in. Record each run below.

**Runs:** none yet. The set was written on 2026-11-14 from the description and has not been run.
Until a dated row appears here (host, fired x/11, stayed silent y/10), the description's routing has
been reviewed but not measured.

## Should fire

| Prompt | What it exercises |
| --- | --- |
| "summarise this video: https://youtu.be/<id>" | the core YouTube ask |
| "get me the transcript of https://www.youtube.com/watch?v=<id>" | transcript / captions |
| "what are the steps in this tutorial? <YouTube URL>" | extract the steps |
| "let's discuss this talk — <YouTube URL>" | the knowledge-file mode |
| "what's in this clip? /Users/me/Downloads/clip.mov" | a local file by path |
| "here's my screen recording, what went wrong?" (an .mp4 attached) | an attachment, no speech likely |
| "watch the Zoom recording and list the action items" (a file) | a meeting recording |
| "what does the guy say at the end of this short? youtube.com/shorts/<id>" | /shorts/ |
| «що на цьому відео?» (a file) | a native-language phrasing |
| «зроби конспект цього відео» (a YouTube URL) | native-language summary |
| "watch this and tell me if the advice is outdated: <YouTube URL>" | "watch", a judgement |

## Should NOT fire

| Prompt | Why not — and what should fire instead |
| --- | --- |
| "ask ChatGPT and Gemini whether this claim holds" | a multi-model answer → `deep-research` |
| "read this tweet: https://x.com/<user>/status/<id>" | an X post → `read-twitter` |
| "summarise this Loom: https://www.loom.com/share/<id>" | hosted non-YouTube video, out of scope |
| "summarise this article: https://example.com/post" | a web page → `fetch-web-sources` |
| "download this YouTube video as mp4" | saving the video is out of scope |
| "make a video of my app's onboarding" | creating video, not reading it |
| "convert clip.mov to mp4" | a format conversion, answer directly |
| "what's a good YouTube channel about woodworking?" | a recommendation, no video given |
| "compress this video for email" | an edit, not extraction |
| "transcribe this voice memo" (an .m4a) | audio only — not a video, answer directly |
