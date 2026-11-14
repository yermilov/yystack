# watch-video — the measured cases behind the rulings

Every ruling in `SKILL.md` stands on its own; read a section here to justify one or to check whether it
still holds. UI labels and selectors were measured on Gemini's and YouTube's live pages and drift every
few months.

## Local file: the frames said one thing, the audio the opposite (2026-08)

The frames of a phone clip showed a small household object being picked up, and the obvious reading
was "the missing one was found". The narration said this was a *different* one brought in from
elsewhere, and the missing one was still missing. One sentence of audio inverted the conclusion —
which is why the transcript is read before anything is concluded from the frames.

On an 80 s clip, `whisper-cli` with `large-v3-turbo` took seconds and produced clean segments. On
short clips in a smaller language, `-l auto` drifted to a neighbouring larger language; a forced wrong
language silently translated instead of transcribing.

## Gemini: a Send click that did nothing (2026-08-30, 2026-09-11)

`left_click` on the Send button's element reference silently no-op'd both times it was measured — the
prompt stayed in the field (`inputLen` 1197 afterwards). Clicking the same button's on-screen
coordinates worked first time, both times. Two observations on one browser bridge: enough to expect the
failure, not to retire the ref path.

## Gemini: `innerText` read 0 on a rendered answer (2026-08-30)

`innerText` on the response container returned `0` and `19` (the input's placeholder) twice in a row
while the response was fully rendered (9 806 and 2 186 chars, confirmed by screenshot). `textContent`
returned the full text immediately. Hypothesis, not proven: Gemini's fade-in leaves the container
looking unrendered to the layout engine for a beat after the text is in the DOM.

## Checking Gemini's answer — the two controls (2026-09-11)

1. Gemini reported a well-known repository's star count with a timecode; the GitHub API returned the
   same number the same minute. That validated **that claim** only — a model can know a popular repo's
   stars without watching anything, so it says nothing about ingestion.
2. Seeking the embedded YouTube player to Gemini's most important timecode and screenshotting it
   worked on a cloud sandbox host (`readyState: 4`, 1280×720, the seek took effect). A different
   site's player on a different driver had not decoded video on that host — two claims about two
   instruments, not a contradiction.

## A multi-hour stream: ask about a window (2026-09-11)

`ytInitialPlayerResponse.videoDetails.shortDescription` returned the description in full (1 342 chars)
while the visible expander was truncated, and on that stream the description was the only timecode map:
`ytInitialData` had zero `chapterRenderer` nodes. Combined with `meta[itemprop=startDate]` /
`endDate` / `duration`, a wall-clock agenda slot converted to an offset into the recording (slot
start minus stream start — a slot ~39 minutes after the stream began is `00:39:00` in), and a
question about those 20 minutes got a pointed answer where "summarise the video" would not have.

## Knowledge-file mode on a cloud sandbox (2026-09-11)

In one sandbox session `yt-dlp` was absent and `www.youtube.com` answered HTTP `000` from the shell
(no HTTP response at all — the egress proxy). That is one session, not the host: the same host's egress
allowlist has varied between sessions. The obvious fallbacks were measured and failed:

- a caption track's `baseUrl` (from `captionTracks`) returned **200 with an empty body** — plain,
  `&fmt=json3` and `&fmt=srv3` alike — although the tracks were listed. An empty body there is the
  instrument not moving, not "no captions";
- the UI transcript panel opened and still held zero segment nodes after 9 s;
- scraping the player's caption segments at 2.5× playback collected 4 unique lines from 95 s.

## The caption script: one marker, and every track at once (2026-11-14)

Two defects in `fetch-transcript.ts`, both measured on live videos with yt-dlp 2026.06:

- **`--with-timestamps` gave one marker per video.** YouTube auto-captions are one unbroken rolling
  run, and the merge folded the whole run into a single segment stamped with its first cue: a 12-minute
  talk came out as 2 254 words under one `[00:13]`. Each appended chunk now keeps its own cue time —
  the same talk gives 24 markers, at most 33 s apart, with the words unchanged.
- **The default `--sub-lang 'en.*,en'` asked for every English-prefixed track**, machine translations
  included (`en-de`, …); a `429` on the second track failed the whole run after the first had already
  downloaded, and the alphabetical pick could land on a translation. The script now reads the
  metadata, picks ONE track (human captions, then the auto-captions' `<lang>-orig`), and downloads only
  that — a human-captioned talk came back punctuated, a Ukrainian lecture as `auto:uk-orig`.
