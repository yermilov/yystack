# watch-video — the measured cases behind the rulings

Every ruling in `SKILL.md` stands on its own; read a section here to justify one or to check whether it
still holds. UI labels and selectors were measured on Gemini's and YouTube's live pages and drift every
few months.

## Local file: the frames said one thing, the audio the opposite (2026-08)

The frames of a phone clip showed a household thermometer being picked up, and the obvious reading was
"the missing one was found". The narration said this was a *different* unit brought in from another
room, and the missing one was still missing. One sentence of audio inverted the conclusion — which is
why the transcript is read before anything is concluded from the frames.

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
`endDate` / `duration`, a wall-clock agenda slot converted to an offset into the recording (a slot at
`15:30Z` on a stream that started `14:51:11Z` ≈ `00:38:49`), and a question about those 20 minutes got
a pointed answer where "summarise the video" would not have.

## Knowledge-file mode on a cloud sandbox (2026-09-11)

In one sandbox session `yt-dlp` was absent and `www.youtube.com` answered HTTP `000` from the shell
(no HTTP response at all — the egress proxy). That is one session, not the host: the same host's egress
allowlist has varied between sessions. The obvious fallbacks were measured and failed:

- a caption track's `baseUrl` (from `captionTracks`) returned **200 with an empty body** — plain,
  `&fmt=json3` and `&fmt=srv3` alike — although the tracks were listed. An empty body there is the
  instrument not moving, not "no captions";
- the UI transcript panel opened and still held zero segment nodes after 9 s;
- scraping the player's caption segments at 2.5× playback collected 4 unique lines from 95 s.
