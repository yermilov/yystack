---
name: watch-video
description: >-
  Extract content from a video. A LOCAL VIDEO FILE (a disk path, a task attachment, a phone clip —
  "analyze /path/clip.mov", «що на цьому відео»): read it offline with ffmpeg + whisper.cpp, no upload.
  A YOUTUBE URL (youtu.be/…, youtube.com/watch, /shorts/) with intent to extract or discuss —
  "summarise this video", "transcript", "extract the steps", "chat with this video": Gemini's native
  ingestion, either QUICK one-shot or a saved KNOWLEDGE FILE (transcript + Gemini's timestamped visual
  overview) answered from with [MM:SS] citations. Do not use for a multi-model second opinion on a
  high-stakes question (that's deep-research, where installed), for a video posted on X (read-twitter
  pulls the mp4, then uses the local-file mode here), or for hosted non-YouTube video (Loom, Vimeo,
  Wistia), which Gemini can't ingest.
---

# Watch Video

Get what a video says and shows. Three modes; pick one before anything else:

- **Local video file** — anything you can put on disk (a path, a task or chat attachment, a clip the
  user recorded). Offline: `ffmpeg` frames + `whisper.cpp` transcript. No browser, no Gemini, no URL —
  do not ask for a YouTube link.
- **Quick extract** (default for a YouTube URL) — one Gemini call, nothing saved. "Summarise this",
  "extract the steps", "transcript". 60–90 s per video.
- **Knowledge file + chat** — a saved markdown file (yt-dlp transcript + Gemini's timestamped
  visual overview), then follow-ups answered from it with `[MM:SS]` citations. "Chat with this
  video", "let's discuss this talk", a URL plus an obvious series of follow-ups.

Unsure between the two YouTube modes: one concrete question → quick; "discuss / ingest / remember" →
knowledge file. If Gemini's answer is thin or load-bearing for a real decision, escalate to the
`deep-research` skill if it is installed; otherwise say the answer rests on one model and name what a
second source should check.

Reply in the user's language.

## Step 0 — register the run

Register these as todo items now — only the chosen mode's list — before doing anything else, in
whatever todo/plan tool this host gives you, and while work remains keep exactly one in progress:

- **Local video file:** 1. Bring the file into a scratch directory · 2. Is there anything to
  transcribe? (`ffprobe`) · 3. Transcribe (conditional; a first install needs a yes) · 4. Watch it —
  frames scaled to the length · 5. Read the transcript before concluding anything from the frames
- **Quick extract:** 1. Prerequisites — browser + Gemini login verified · 2. Open a fresh chat ·
  3. Pick the model · 4. Insert the prompt · 5. Submit and confirm it sent · 6. Wait for the response ·
  7. Extract it · 8. Check Gemini's answer (the close names both controls, or which was skipped and why)
- **Knowledge file + chat:** 1. Prerequisites — browser + Gemini login, `yt-dlp`, egress probe ·
  2. Fetch the transcript · 3. Gemini's structured + visual overview · 4. Assemble the file ·
  5. Reply short + hand over the file · 6. Answer follow-ups from the file

Register the conditional steps too: one a branch makes moot is completed WITH THAT REASON, never left
open. No such tool? SEARCH for one first — on hosts with deferred tools it exists but is not loaded,
and its name differs per host; anything that creates items and marks them in progress and completed IS
that tool. It must be the SESSION's own planner, never an external tracker. If there truly is none,
keep the list in your replies and account for every item at the end. Invoked from another workflow,
these items ADD to the caller's list; the calling item stays open until your last one closes.

---

## Local video file

Use this whenever the video is a **file**. Gemini cannot ingest it, and such a file is usually
**private** (a home walk-through, a screen recording, a family member) — **never upload it to a video
or AI service.**

⚠️ "Local" is not total privacy: the file never leaves the machine, but the transcript lines and the
frames you look at enter your own context like any file you read. Quote onward only what the task
needs.

**Work in a scratch directory, never in a repo checkout** — the model is 1.6 GB and frames run to
hundreds of files. On a sandboxed host, check that the directory is writable first: a read-only `/tmp`
makes `curl` fail with exit 23, which reads like a bad URL.

```sh
WORK=$(mktemp -d "${TMPDIR:-/tmp}/watchvideo.XXXXXX") && cd "$WORK"
curl -fsS '<download url>' -o clip.mp4     # an attachment: verify its checksum if one is published
ln -s /absolute/path/to/their.mov clip.mp4  # a file already on disk: no copy
```

**Anything to transcribe?** Check before installing anything — a screen recording or silent clip has
no audio stream:

```sh
ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 clip.mp4 | grep -q . \
  && echo "has audio — transcribe" || echo "silent — go straight to the frames"
```

**Transcribe.** ⚠️ **The first run installs software and downloads 1.6 GB — say so and get a yes
first**; a request to look at a clip is not consent to that.

```sh
MODEL=~/.cache/whisper.cpp/ggml-large-v3-turbo.bin
command -v whisper-cli >/dev/null || brew install whisper-cpp   # macOS; elsewhere use an existing whisper
if [ ! -s "$MODEL" ]; then
  mkdir -p "$(dirname "$MODEL")"
  curl -fsSL --retry 3 -o "$MODEL.part" \
    https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo.bin && mv "$MODEL.part" "$MODEL"
fi
ffmpeg -i clip.mp4 -vn -ac 1 -ar 16000 -c:a pcm_s16le audio.wav
whisper-cli -m "$MODEL" -f audio.wav -l <lang> --output-srt -of transcript
```

No way to install a transcriber here → say the clip cannot be transcribed on this host and do the
visual pass; never report as if you had heard it. **Name the language** (`-l en`, `-l de`, …) when you
know it — `-l auto` drifts on short clips in smaller languages, and a forced wrong language translates
instead of transcribing. `--output-srt` gives timecodes to line sentences up with frames.

**Watch it — scale the sampling to the length.** Aim at ~40 frames (eight strips of five):

```sh
FPS=$(ffprobe -v error -show_entries format=duration -of csv=p=0 clip.mp4 | awk '{printf "%.4f", 40/($1>1?$1:1)}')
ffmpeg -i clip.mp4 -vf "fps=$FPS,scale=-1:600" -q:v 2 g_%03d.jpg
ffmpeg -i g_%03d.jpg -vf "tile=5x1" -q:v 2 st_%d.jpg          # strips to read at once
ffmpeg -ss 72.2 -i clip.mp4 -frames:v 1 -q:v 2 detail.jpg     # one full-size frame
```

Over ~20 minutes, don't sweep frames: read the transcript, pick the moments it points at, and pull
single frames there. Portrait phone video carries a rotation flag that ffmpeg applies, so frames come
out upright even when `ffprobe` reports landscape dimensions.

⚠️ **Read the transcript BEFORE concluding anything from the frames** — a picture of an action can mean
the opposite of what the narration says (case: `references/precedents.md`).

---

## Quick extract (one-shot, Gemini)

**Prerequisites:** a browser-automation tool driving a profile signed in to `https://gemini.google.com/`
(a paid tier preferred). Verify the login by the account avatar or the greeting with the user's name —
not by "the page renders": Gemini shows a usable-looking UI to anonymous visitors.

UI labels below are the English ones, verified as of 2026-09; Gemini localises them to the account's
language and renames them every few months — screenshot when one doesn't match.

1. **Open a fresh chat** — click "New chat" in the sidebar. Navigating to `/app` does not always start
   a new conversation.
2. **Pick the model** — the strongest **Pro**/thinking model for steps and structured output; Flash
   only when speed matters.
3. **Insert the prompt with `execCommand`, not by typing** — the box is a `contenteditable`, and typed
   characters may not reach the app's state (Send stays disabled):

   ```js
   const el = document.querySelector('rich-textarea [contenteditable="true"], div[contenteditable="true"][role="textbox"]');
   el.focus(); document.execCommand('insertText', false, '<your prompt>');
   ```
4. **Submit by clicking Send (not Enter, which adds a newline), then confirm it sent:** the input must be
   empty afterwards. ⚠️ A click on the button's element reference has silently done nothing before —
   if the text is still there, click the button's on-screen coordinates.
5. **Wait** — 30–90 s. While generating there is a Stop button; poll, don't spam screenshots:

   ```js
   const r = [...document.querySelectorAll('.markdown, model-response, .model-response-text')];
   ({ len: r.at(-1)?.textContent?.length || 0,
      hasStop: !!document.querySelector('button[aria-label*="Stop"]') });
   ```

   Done when `hasStop` is false and the length has been stable ~10 s. ⚠️ **Read `textContent`, never
   `innerText`** — `innerText` has read 0 on a fully rendered answer. If `len` is tiny with no Stop
   button, compare `document.querySelector('main')?.textContent?.length` before calling the answer
   empty: thousands more means the response rendered outside the selector — screenshot it. A browser
   tool's script timeout mid-poll is harmless: call again.
6. **Extract** — the last response's `textContent`. It can glue adjacent blocks together with no
   separator; skim for that. For long answers, read it in overlapping slices if your tool truncates.
7. **Check Gemini's answer before it goes in a report** — Gemini invents details and timecodes:
   - **Cross-check each NUMBER you quote** against an independent source. That validates that claim
     only — not that Gemini watched anything.
   - **Pixel-check the most important TIMECODE**: open `youtube.com/watch?v=<id>&t=<s>s`, mute, seek,
     screenshot, and compare with Gemini's description. Mark every timecode you did not check as
     unverified.

**A multi-hour stream: ask about a window, not the video.** `ytInitialPlayerResponse.videoDetails
.shortDescription` holds the full description (often the only timecode map); with
`meta[itemprop=startDate]` you can turn a wall-clock agenda slot into an offset and ask about those
minutes. Don't count on chapters existing.

**Prompt pattern:**

```
Watch these YouTube videos and extract the steps for <task>.

Videos:
1. https://www.youtube.com/watch?v=<ID> — "<short title>"

Context: <what the user is trying to do, with the specifics that matter — product, account type, goal>

I need concrete UI steps:
- <bullet>

Flag anything that looks outdated (the interface may have changed). Structured, no filler, 600–800 words.
```

Write the prompt in the user's language if they want the answer in it. Be specific about context —
the specifics are what extract the useful 5% — cap the length (Pro over-elaborates), ask it to flag
stale UI, and keep to 2–4 videos per chat.

---

## Knowledge file + chat (persistent)

One markdown file per video: the clean transcript plus Gemini's overview of what the transcript can't
see (slides, on-screen code, diagrams). Follow-ups are then answered from the file.

### 1. Prerequisites and the egress probe

- `yt-dlp` on `PATH` (install it if missing — `pipx install yt-dlp` or `brew install yt-dlp`).
- **Probe egress before planning around it**:
  `curl -o /dev/null -sS -w '%{http_code}' https://www.youtube.com/`. `000` means no HTTP response at
  all (proxy, DNS, TLS, timeout) — the shell route is out on this host this session: use Quick
  extract. Don't try to scrape captions out of the browser instead; those routes return empty bodies
  that look like "no captions" (`references/precedents.md`).

### 2. Fetch the transcript

```bash
bun run "SKILLDIR/scripts/fetch-transcript.ts" "<url>" --with-timestamps --output <scratch>/transcript.json
```

`SKILLDIR` is a placeholder: substitute the **literal** directory you loaded this `SKILL.md` from. For a
non-English video pass `--sub-lang` (e.g. `'de.*,de'`). Exit **2** = no auto-captions: tell the user
and offer local transcription (download the audio with `yt-dlp -x`, then the whisper step above) or
Gemini alone — ask which. Exit 1 prints yt-dlp's error (a `429` is YouTube rate-limiting this IP: wait,
or use Quick extract).

### 3. Gemini's structured + visual overview

Same flow as Quick extract steps 1–7, with exactly this prompt so files are consistent:

```
Watch this YouTube video and produce a detailed knowledge document I can use later. Structure it as numbered sections:

(1) TL;DR — 2-3 sentences.
(2) Speaker(s) and core thesis — one paragraph.
(3) Section-by-section breakdown — every claim/transition gets a [MM:SS] timestamp link. Aim for at least one every 60 seconds.
(4) Visual content the transcript would miss — slide titles, on-screen code, diagrams (describe them), demos, charts. Each timestamped.
(5) Tools, books, papers, people, repos, websites cited — exhaustive, with timestamps.
(6) Memorable short quotes (each <15 words, in quotation marks) with timestamps.

URL: <PASTE THE FULL URL>
```

If Gemini refuses or is weak, continue transcript-only and say so in the file.

### 4. Assemble the file

Save under the session's working output directory as `video-knowledge/<id>-<slug>.md` (`<slug>` =
3–6 ASCII words; the video id is the key):

```markdown
---
title: <title>
url: <canonical url>
channel: <uploader>
duration: <duration_string>
processed_at: <YYYY-MM-DD>
language: <language>
caption_source: <file, or "whisper">
visual_overview_source: gemini   # or "skipped"
---

# <title>
*by <channel>* · [Watch on YouTube](<url>) · <duration>

## Structured overview (Gemini, with timestamps)
<Gemini's response, [MM:SS] markers preserved>

## Full transcript
<clean transcript with [MM:SS] markers every ~30 s>
```

### 5. Reply short, hand over the file

A 2–3 sentence TL;DR, the file (attach or link it the way your host hands over files), and one line:
"Ask anything about it — I'll answer with timestamps."

### 6. Answer follow-ups from the file

Read the file rather than re-ingesting; ground every answer in it; cite timecodes as links
(`?t=<seconds>`). If something isn't in the file, say so and offer to re-run — never fabricate.

**Edge cases:** a file for that id already exists → ask: reuse it or re-run. Over ~60 min → Gemini may
truncate; offer per-15-minute windows. Live stream or premiere → wait for the recording. Age-gated,
private or paywalled → don't bypass; say so. No speech → skip step 2, Gemini only.

---

## What this skill does NOT do

- Multi-model triangulation — that's `deep-research` where installed.
- Hosted non-YouTube video — out of scope (a local FILE is in scope, above).
- Fact-checking — Gemini and auto-captions both err; caveat surprising claims and cross-check
  load-bearing ones.
- Download videos or build a cross-video library — one file per video.

When another skill finds a tutorial video relevant to its task, it hands the URL plus a context block
here for the extraction.

## Bundled resources

- `scripts/fetch-transcript.ts` — yt-dlp transcript with rolling-caption dedup and `[MM:SS]` markers;
  `--vtt <file>` cleans captions you already have, offline. `--help` for flags and exit codes.
- `references/precedents.md` — the measured cases behind the rulings (the Send no-op, `innerText`,
  the two answer checks, the sandbox caption dead ends). Read a section when a ruling seems wrong.
