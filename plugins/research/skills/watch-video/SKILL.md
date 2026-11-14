---
name: watch-video
description: >-
  Get what a video says and shows. A LOCAL VIDEO FILE (a path, an attachment, a phone clip, a screen
  or Zoom recording, an .mp4/.mov — "watch this clip", «що на цьому відео»): read offline with ffmpeg +
  whisper.cpp, never uploaded. A YOUTUBE URL (youtu.be, watch, /shorts/) with intent to extract —
  "summarise this video", "what's in it", "get the transcript/captions", "extract the steps", "chat
  with this video": a quick one-shot via Gemini, or a saved knowledge file (captions + Gemini's
  timestamped visual overview) answered from with [MM:SS] citations. Not for a multi-model second
  opinion (deep-research, where installed), a video posted on X (read-twitter fetches the mp4, then
  uses this skill's file mode). Hosted non-YouTube video (Loom, Vimeo): ask for the file and use the
  file mode.
---

# Watch Video

Get what a video says and shows. Three modes; pick one before anything else:

- **Local video file** — anything you can put on disk (a path, a task or chat attachment, a clip the
  user recorded). Offline: `ffmpeg` frames + a `whisper.cpp` transcript. No browser, no Gemini — do
  not ask for a YouTube link.
- **Quick extract** (default for a YouTube URL) — one Gemini call, nothing saved. "Summarise this",
  "extract the steps". About a minute or two per video.
- **Knowledge file + chat** — a saved markdown file (the captions + Gemini's timestamped visual
  overview), then follow-ups answered from it with `[MM:SS]` citations. "Chat with this video", "let's
  discuss this talk", "get me the transcript", a URL plus an obvious series of follow-ups.

Unsure between the two YouTube modes: one concrete question → quick; "discuss / ingest / transcript /
remember" → knowledge file. If Gemini's answer is thin or load-bearing for a real decision, say it
rests on one model and name what a second source should check (or hand it to `deep-research`, if
installed).

Reply in the user's language.

## Step 0 — register the run

Register these as todo items now — only the chosen mode's list — before doing anything else, in
whatever todo/plan tool this host gives you, and while work remains keep exactly one in progress:

- **Local video file:** 1. Bring the file into a scratch directory · 2. Anything to transcribe —
  stream + level check · 3. Transcribe (conditional; a first install needs a yes) · 4. Watch it —
  frames scaled to the length · 5. Read the transcript before concluding anything from the frames
- **Quick extract:** 1. Prerequisites — a browser tool + Gemini login verified (else the
  captions-only route) · 2. Open a fresh chat · 3. Pick the model · 4. Insert the prompt · 5. Submit
  and confirm it sent · 6. Wait for the response · 7. Extract it · 8. Check Gemini's answer (the close
  names both controls, or which was skipped and why)
- **Knowledge file + chat:** 1. Before you start — existing file, live stream, `yt-dlp` (the close
  names each) · 2. Egress probe · 3. A browser tool + Gemini login verified · 4. Fetch the captions · 5. Gemini's overview —
  Quick extract steps 2–7 (the close names each, or why one was skipped) · 6. Check the overview —
  timecode + numbers · 7. Assemble the file · 8. Reply short + hand over the file · 9. Answer
  follow-ups from the file

Register the conditional steps too: one a branch makes moot is completed WITH THAT REASON, never
left open — an unfinished list at the end must mean something really is unfinished.
No such tool? SEARCH for one first — on hosts with deferred tools it exists but is not loaded, and
its name differs per host. Anything that creates items and marks them in progress and completed IS
that tool, whatever it is called. Search by that capability, then by any name you remember: one empty
result is evidence about the name; two are a real absence on this host — say so plainly, it is not
your mistake. It must be the SESSION's own planner, never an external tracker (Jira, Linear, a task
app): your bookkeeping is not their backlog. If there truly is none, keep the list in your
replies — state it once, name each item as you start it, account for every one at the end.
Invoked from another workflow, these items ADD to the caller's list; the calling item stays open
until your last one closes.

---

## Local video file

Use this whenever the video is a **file**. Such a file is usually **private** (a home walk-through, a screen recording, a family member) — **never upload it to a video
or AI service.** "Local" is not total privacy: the transcript lines and the frames you look at enter
your own context like any file you read, so quote onward only what the task needs.

**1. Work in a scratch directory, never in a repo checkout** — frames run to hundreds of files. On a
sandboxed host, check that the directory is writable first: a read-only `/tmp` makes `curl` fail with
exit 23, which reads like a bad URL.

```sh
WORK=$(mktemp -d "${TMPDIR:-/tmp}/watchvideo.XXXXXX") && cd "$WORK"
curl -fsS '<download url>' -o clip.mp4     # an attachment: verify its checksum if one is published
ln -s /absolute/path/to/their.mov clip.mp4  # a file already on disk: no copy
```

**2. Anything to transcribe?** Check before installing anything. A clip may have no audio stream —
or, more often (screen, meeting and phone recordings), a stream that carries only silence, on which
whisper can invent text:

```sh
if ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 clip.mp4 | grep -q .; then
  ffmpeg -nostats -i clip.mp4 -map 0:a:0 -af volumedetect -f null - 2>&1 | grep -E 'mean_volume|max_volume'
else
  echo "no audio stream — go straight to the frames"
fi
```

A `max_volume` near −90 dB is digital silence — go straight to the frames; speech peaks within a few
dB of 0. Anything in between (a hum, faint background) → transcribe, and read the result with
suspicion.

**3. Transcribe.** If `whisper-cli` or its model is missing, **say the first run installs software and
downloads 1.6 GB, and get a yes** — a request to look at a clip is not consent to that. Then follow
`references/install-transcriber.md`. No way to install one here → say the clip cannot be transcribed
on this host and do the visual pass; never report as if you had heard it.

```sh
MODEL=~/.cache/whisper.cpp/ggml-large-v3-turbo.bin
ffmpeg -i clip.mp4 -vn -ac 1 -ar 16000 -c:a pcm_s16le audio.wav
whisper-cli -m "$MODEL" -f audio.wav -l <lang> --output-vtt -of transcript
bun run "SKILLDIR/scripts/fetch-transcript.ts" --vtt transcript.vtt --with-timestamps   # [MM:SS] prose
```

**Name the language** (`-l en`, `-l de`, …) when you know it — `-l auto` drifts on short clips in
smaller languages, and a forced wrong language translates instead of transcribing. The VTT keeps cue
times so sentences line up with frames; the last line prints JSON whose `transcript` is prose with a marker every ~30 s.
`SKILLDIR` is a placeholder: substitute the **literal** directory you loaded this `SKILL.md` from.

**4. Watch it — scale the sampling to the length.** Aim at ~40 frames (eight strips of five):

```sh
FPS=$(ffprobe -v error -show_entries format=duration -of csv=p=0 clip.mp4 | awk '{printf "%.4f", 40/($1>1?$1:1)}')
ffmpeg -i clip.mp4 -vf "fps=$FPS,scale=-1:600" -q:v 2 g_%03d.jpg
ffmpeg -i g_%03d.jpg -vf "tile=5x1" -q:v 2 st_%d.jpg          # strips to read at once
ffmpeg -ss 72.2 -i clip.mp4 -frames:v 1 -q:v 2 detail.jpg     # one full-size frame
```

Over ~20 minutes, don't sweep frames: read the transcript, pick the moments it points at, and pull
single frames there. Portrait phone video carries a rotation flag that ffmpeg applies, so frames come
out upright even when `ffprobe` reports landscape dimensions.

**5. Read the transcript BEFORE concluding anything from the frames** — a picture of an action can
mean the opposite of what the narration says (case: `references/precedents.md`).

---

## Quick extract (one-shot, Gemini)

The UI labels and the selectors below were verified on Gemini's live page as of 2026-09 (English UI);
Gemini localises labels to the account's language and renames things every few months — when one
doesn't match, screenshot and find its current equivalent.

1. **Prerequisites** — a browser-automation tool driving a profile signed in to
   `https://gemini.google.com/` (a paid tier preferred). On a host with deferred tools, search for a
   browser capability before concluding there is none: one empty search is about the name, two are a
   real absence. Verify the login by the account avatar or the greeting with the user's name — not by
   "the page renders": Gemini shows a usable-looking UI to anonymous visitors. **No browser tool, or
   no login:** tell the user, and offer the **captions-only route** — fetch the captions with
   `scripts/fetch-transcript.ts` (Knowledge file step 4) and answer from them, saying the answer
   covers what is said, not what is shown.
2. **Open a fresh chat** — click "New chat" in the sidebar. Navigating to `/app` does not always start
   a new conversation.
3. **Pick the model** — the strongest **Pro**/thinking model for steps and structured output; Flash
   only when speed matters.
4. **Insert the prompt with `execCommand`, not by typing** — the box is a `contenteditable`, and typed
   characters may not reach the app's state (Send stays disabled):

   ```js
   const el = document.querySelector('rich-textarea [contenteditable="true"], div[contenteditable="true"][role="textbox"]');
   el.focus(); document.execCommand('insertText', false, '<your prompt>');
   ```
5. **Submit by clicking Send (not Enter, which adds a newline), then confirm it sent:** the input must
   be empty afterwards. A click on the button's element reference has silently done nothing before —
   if the text is still there, click the button's on-screen coordinates.
6. **Wait** — 30–90 s. While generating there is a Stop button; poll, don't spam screenshots:

   ```js
   const r = [...document.querySelectorAll('.markdown, model-response, .model-response-text')];
   ({ len: r.at(-1)?.textContent?.length || 0,
      hasStop: !!document.querySelector('button[aria-label*="Stop"]') });
   ```

   Done when `hasStop` is false and the length has been stable ~10 s. **Read `textContent`, never
   `innerText`** — `innerText` has read 0 on a fully rendered answer. If `len` is tiny with no Stop
   button, compare `document.querySelector('main')?.textContent?.length` before calling the answer
   empty: thousands more means the response rendered outside the selector — screenshot it. A browser
   tool's script timeout mid-poll is harmless: call again.
7. **Extract** — the last response's `textContent`. It can glue adjacent blocks together with no
   separator; skim for that. For long answers, read it in overlapping slices if your tool truncates.
8. **Check Gemini's answer before it goes in a report** — Gemini invents details and timecodes:
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

### 1. Before you start

- **A file for that id already exists** → ask: reuse it or re-run.
- **A live stream or premiere** → wait for the recording. **Age-gated, private or paywalled** → don't
  bypass; say so.
- `yt-dlp` on `PATH` — if missing, the script's error says how to install it.

### 2. The egress probe

`curl -o /dev/null -sS -w '%{http_code}' https://www.youtube.com/`. `000` means no HTTP response at
all (proxy, DNS, TLS, timeout), so the shell cannot fetch captions this session. Don't scrape them out
of the browser instead — those routes return empty bodies that look like "no captions"
(`references/precedents.md`). Tell the user and offer a **Gemini-only** file (`caption_source: none`)
or Quick extract; ask which.

### 3. The browser + Gemini login

As in Quick extract step 1. None → a **transcript-only** file (`visual_overview_source: skipped`);
say what it lacks.

### 4. Fetch the captions

```bash
bun run "SKILLDIR/scripts/fetch-transcript.ts" "<url>" --with-timestamps --output <scratch>/transcript.json
```

A video with no speech (music, a silent demo) → skip this step; the file is Gemini-only.

It picks one track: human captions first, then the auto-captions' original — in the video's own
language, else English. `--sub-lang 'de'` (comma-separated regexes, tried in order) overrides that.
Exit 1 prints yt-dlp's error (a `429` is YouTube rate-limiting this IP: wait, or use Quick extract).
Exit **2** = no captions in that language: tell the user and offer local transcription (a first run
installs whisper.cpp and downloads a 1.6 GB model — Local video file step 3) or a Gemini-only file —
ask which; picking local transcription without knowing that is not a yes to the install. Local transcription, in a scratch directory (whisper as in Local
video file step 3):

```bash
MODEL=~/.cache/whisper.cpp/ggml-large-v3-turbo.bin
yt-dlp -x --audio-format wav --postprocessor-args "ffmpeg:-ac 1 -ar 16000" -o audio.wav "<url>"
whisper-cli -m "$MODEL" -f audio.wav -l <lang> --output-vtt -of transcript
bun run "SKILLDIR/scripts/fetch-transcript.ts" --vtt transcript.vtt --with-timestamps
```

### 5. Gemini's overview

Quick extract steps 2–7, with exactly this prompt so files are consistent:

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

Over ~60 min, Gemini may truncate — offer per-15-minute windows. If Gemini refuses or is weak,
continue transcript-only and say so in the file.

### 6. Check the overview

Quick extract step 8 on the overview: pixel-check its most important timecode, and cross-check any
number you will quote. Record the result in `timecodes_verified` below.

### 7. Assemble the file

Save under the session's working output directory as `video-knowledge/<id>-<slug>.md` (`<slug>` =
3–6 ASCII words; the video id is the key). The caption route's JSON carries `title`, `channel` and
`duration`; on the whisper or Gemini-only routes, read them with
`yt-dlp --print '%(title)s|%(uploader)s|%(duration_string)s' "<url>"`, or off the video page.

```markdown
---
title: <title>
url: <canonical url>
channel: <uploader>
duration: <duration_string>
processed_at: <YYYY-MM-DD>
language: <language>
caption_source: <the script's caption_source, "whisper", or "none">
visual_overview_source: gemini   # or "skipped"
timecodes_verified: <"[MM:SS] matched" / "[MM:SS] did not match" / "none">
---

# <title>
*by <channel>* · [Watch on YouTube](<url>) · <duration>

## Structured overview (Gemini, with timestamps — unverified except as noted above)
<Gemini's response, [MM:SS] markers preserved — or, for a transcript-only file, the line
"No visual overview: <why>">

## Full transcript
<the script's transcript, [MM:SS] markers every ~30 s — or, for a Gemini-only file, the line
"No transcript: <why>">
```

### 8. Reply short, hand over the file

A 2–3 sentence TL;DR, the file (attach or link it the way your host hands over files), and one line:
"Ask anything about it — I'll answer with timestamps."

### 9. Answer follow-ups from the file

Read the file rather than re-ingesting; ground every answer in it; cite timecodes as links
(`?t=<seconds>`). Prefer the transcript's markers — they come from the captions — over the
overview's, which are Gemini's and unverified unless the frontmatter says otherwise; say which one an
answer rests on. If something isn't in the file, say so and offer to re-run — never fabricate.


---

## What this skill does NOT do

- Save a YouTube video's picture, or build a cross-video library — one file per video. (Fetching a
  local file into scratch, or a video's audio for transcription, is in scope.)
- Fetch hosted non-YouTube video (Loom, Vimeo, Wistia): pulling it off someone else's player is not
  this skill's call. Ask the user for the file (their own export or
  download) and use Local video file mode.
- Vouch for the content: Gemini and auto-captions both err. Step 8 checks the answer against the
  video; whether what the video *claims* is true is a separate check — caveat surprising claims.

When another skill finds a tutorial video relevant to its task, it hands the URL plus a context block
here for the extraction.

## Bundled resources

- `scripts/fetch-transcript.ts` — picks one caption track with yt-dlp, merges the rolling auto-caption
  window, adds `[MM:SS]` markers; `--vtt <file>` cleans captions or whisper output you already have,
  offline. `--help` for flags and exit codes.
- `references/install-transcriber.md` — installing whisper.cpp and its model, per OS.
- `references/precedents.md` — the measured cases behind the rulings (the Send no-op, `innerText`,
  the two answer checks, the sandbox caption dead ends, the caption-track fixes). Read a section when
  a ruling seems wrong.
- `references/trigger-tests.md` — should-fire / should-not prompts; re-run them after any edit to the
  `description`.
