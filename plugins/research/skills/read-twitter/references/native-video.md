# read-twitter — native video and CDN media (depth)

The depth behind read-twitter's native-video ruling (SKILL.md, *When to use*) and the CDN-media recipe
in `references/x-native.md`. «Above»/«below» refer to this file.

---

- **Media pixels straight off the CDN**, when the Step 6 lightbox walk is not available — a
  **native X video**, which has no `/photo/<N>` link at all, or a media node you can see in the
  DOM but cannot navigate to.

  **Photos** (verified): match the id and rebuild the URL —

  ```
  /pbs\.twimg\.com\/media\/([A-Za-z0-9_\-]+)/
  ```

  then `curl "https://pbs.twimg.com/media/<ID>?format=png&name=4096x4096"` and open it with `Read`.

  **Native X video — read it as SAMPLED FRAMES via `ffmpeg`, not just a poster.** The primary path
  is the same `tweet-result` endpoint this skill already uses for text (see «To check one tweet's
  text against the DOM» below): its JSON carries a `video_info.variants[]` on each `mediaDetails[]`
  entry that has one — mp4s at several bitrates plus an `application/x-mpegURL` playlist. **A
  `tweet-result?id=<id>` call covers that status's own media AND, when it is a quote-tweet, the
  QUOTED post's media too:** `quoted_tweet.mediaDetails[]` carries its own `video_info.variants[]`
  mp4 ladder, so a quoted post's video needs **no second call**. Measured 2026-09-17 on
  `2096456060207001806` (quoting `2095612137582526615`), and re-checked the same day: one ~8 KB
  payload yielded 5 mp4 variants for the root's 64 s video and 4 for the quoted 78 s one, both
  downloaded and frame-sampled without ever fetching `tweet-result` for the quoted id. A **reply's**
  video (or a parent post's, up a thread) still needs its own call against
  `tweet-result?id=<that post's own id>`. And X allows a single status to carry more than one video,
  so walk **every** `mediaDetails[]` entry with a `video_info` — in the root's array **and** in
  `quoted_tweet`'s — not just index 0. For each video found, take the
  highest-bitrate mp4 variant as-is — no need to reconstruct a CDN path by hand — and work in its
  own scratch dir (`mktemp -d`) so downloads and frames never overwrite or mix across videos:

  ```
  curl -s "https://cdn.syndication.twimg.com/tweet-result?id=<id>&lang=en&token=a"
  # → for EACH mediaDetails[] entry with a video_info (root AND quoted_tweet), pick the highest-bitrate
  #   entry in its variants[] whose content_type is "video/mp4".
  #   The SAME entry also carries `video_info.duration_millis` (size the grid below
  #   from it) and `media_url_https` / the `poster` — no DOM regex needed for either.
  workdir=$(mktemp -d)   # fresh dir per video
  curl -s -o "$workdir/vid.mp4" "<that variant's url>"

  # (a) ONE CONTACT SHEET — the default. One image, one Read, the whole arc at once.
  ffmpeg -i "$workdir/vid.mp4" -vf "fps=<rate>,scale=<w>:-1,tile=<C>x<R>" \
         -frames:v 1 -q:v 2 "$workdir/sheet.jpg"

  # (b) FULL-SIZE FRAMES — fall back to this when the sheet's cells are too small to read text.
  ffmpeg -i "$workdir/vid.mp4" -vf "fps=1/3,scale=1148:-1" -q:v 3 "$workdir/f_%02d.jpg"
  ```

  **Size the grid from `duration_millis`; do not hardcode it.** ⚠️ Mind the unit — the field is
  MILLIseconds and `fps` is per second, so the executable form is
  **`C×R ≥ ceil((duration_millis / 1000) × fps)`**; multiplying by the raw millisecond value asks
  for a grid a thousand times too large.
  Two measured points: a **27 s** clip → `fps=1, scale=360:-1, tile=6x5` (30 cells); a **92 s** clip
  → `fps=1/6, scale=640:-1, tile=4x4` (~96 s of coverage in one image). **Prefer (a):** one 4×4 sheet
  replaced ~15 separate `Read` calls, and on the 92 s clip it alone established that a game demo used
  the original Westwood/EA assets — the EA splash, the load screen, the version string, the briefing
  and the FMV — a fact the tweet text never mentions. Use (b) when the point turns on **reading text**
  in the frame rather than on the sequence of scenes. `ffmpeg` is present in the Cowork sandbox at
  `/usr/bin/ffmpeg` (checked 2026-09-02). Keep the `mktemp -d` — one run that wrote into a hand-made
  `/tmp/frames/...` path got `Could not open file / Input/output error` (single occurrence, no
  negative control, so treat it as a reason to keep using `mktemp -d`, not as a rule about `/tmp`).

  **Verified 2026-08-25** on a 47s screencast → 16 sampled frames (at `fps=1/3`, one every 3s),
  read with `Read`: this surfaced the demo's entire content (`79 PIECES`, `122 OUTFITS`, tab
  labels, an item-card schema with a hex color and tags, a look card with its rationale) — none of
  which is visible in the poster frame alone, which showed only the opening tab. This is a
  **sample, not every frame** — say so, and drop to a higher `fps` (or a scene-change extraction)
  if the content looks like it changes faster than the sampling interval.

  **Burned-in subtitles: crop the SUBTITLE BAND and tile it, rather than reading full frames.** When
  the narration is captioned into the picture — the norm for agent-POV and lore videos — the whole
  spoken track is readable without any transcription service, and a narrow vertical tile of just the
  caption strip is far cheaper and more accurate than full frames. Measured 2026-09-05 on
  @artficialisabel `2095678312773554533` (62 characters of tweet text, one 1:52 native video that
  carried the entire substance): ~120 lines of narration recovered this way.

  ```
  # (c) SUBTITLE BAND — one crop per ~28 s of video, read with `Read`.
  # ⚠️ -y AND a per-chunk filename: without both, the second chunk hits an existing subs.png,
  #    ffmpeg declines to overwrite it, and every later Read silently re-reads chunk 1's tile.
  ffmpeg -y -ss <t> -t 28 -i "$workdir/vid.mp4" \
         -vf "fps=1,crop=1280:110:0:592,scale=760:-1,tile=1x28" \
         -frames:v 1 "$workdir/subs_<t>.png"
  ```

  The `crop=w:h:x:y` values are per-video — take one probe frame at full size, find the band, and
  reuse it (`1280:110:0:592` was the measured 1280×720 case). ⚠️ **`fps=1` DROPS SHORT LINES, and it
  does NOT reliably leave a gap where one went missing.** Measured in the same run: the caption
  «you listen» was on screen ~0.9 s and is absent from the 1 fps tile entirely; it only appeared at
  `fps=3` over the 95.5–99.5 s stretch. A blank band between two lines is one tell, but a sub-second
  caption sandwiched between two longer ones leaves **no** blank at all — the tile just steps from
  one line to the next and reads as complete. So treat 1 fps as a MAP of the video's structure, and
  **when the transcript itself is the deliverable, run the whole subtitle pass at 2–3 fps** rather
  than resampling only the visibly empty stretches.
  ⚠️ **Raising `fps` means shortening `-t` (or growing the tile) — the two are one setting, and
  getting it wrong truncates silently.** `-frames:v 1` writes exactly ONE image, so the tile has to
  hold every sampled frame: **cells ≥ `-t` × fps**. `tile=1x28` with `-t 28` at `fps=1` is exactly
  28 and fits; leave both alone and switch to `fps=3` and ffmpeg fills the 28 cells after **9
  seconds**, writes the image and stops — the remaining 19 seconds of captions are simply not in the
  file, with a successful exit. So at 2 fps use `-t 14`, at 3 fps `-t 9` (keeping `tile=1x28`), and
  step `-ss` by that same chunk length.
  **Honest limit: spoken narration with NO burned-in captions is still not covered** — say that
  rather than implying you heard it.

  **A FRAME-SEQUENCE claim needs a MEASUREMENT, not a description — and it is ten lines of numpy.**
  When the post's claim is about the video's *construction* rather than its content ("stop motion",
  "consistent frames", "no flicker"), sampled frames tell you the story and say nothing about the
  claim. Decode every frame to small grayscale and take the mean absolute difference between
  consecutive frames. ⚠️ **Segmenting that curve into "stills" is valid only for HELD-FRAME footage**
  (stop motion, slideshows, animation on twos): on continuous motion nearly every pair crosses the
  threshold, the count is just the frame count, and the sweep below can still look stable. For those
  claims report the `diff` curve itself — spikes are CANDIDATE cuts and periodic jitter CANDIDATE
  flicker (fast motion produces both), so pull those frame numbers and look before naming either.

  ```bash
  S=96   # decode size; use 256 when you also want the bounding box below at readable resolution
  # -y AND a per-size filename: a rerun at S=256 must not read the 96px file (reshape then fails)
  ffmpeg -y -v error -i "$workdir/vid.mp4" -vf "scale=$S:$S,format=gray" -f rawvideo "$workdir/f$S.gray"
  workdir="$workdir" S=$S python3 - <<'EOF'
  import os, numpy as np
  S = int(os.environ["S"])
  d = np.fromfile(f'{os.environ["workdir"]}/f{S}.gray', dtype=np.uint8); n = d.size // (S*S)
  v = d.reshape(n, S, S).astype(np.int16)
  diff = np.abs(v[1:] - v[:-1]).mean(axis=(1, 2))      # per consecutive pair, in /255
  steps = np.where(diff > 0.5)[0]                       # transitions between held stills
  starts = [0] + [int(s) + 1 for s in steps]            # first frame of each still
  print(len(starts), starts)
  EOF
  ```

  Then two controls, and neither is optional — without them the count is just a threshold you
  picked:
  - **Sweep the threshold.** Re-count at 0.3 / 0.5 / 0.8 / 1.0. If the count barely moves, the
    structure is the video's. ⚠️ A stable count of **1** is the opposite verdict — every transition
    sat below the sweep (a small or low-contrast change is diluted by a whole-frame mean). Then
    print `np.sort(diff)[-20:]` and re-sweep between ~3× the noise floor (next bullet) and 0.3. Measured 2026-09-13 on `2097399137142772071` (@charlierguo, «GPT-Image
    2.5 … stop motion»): **57–58 stills across 0.3–0.8**. (Positive control on a synthetic clip
    holding 2 stills/s for 5 s: exactly 10 at every threshold.)
  - **Establish the noise floor** as the diff between two consecutive frames *inside* one held
    still, on the SAME background patch you compare across stills. Measured on the same video:
    **0.083/255** inside a hold, against **1.3–1.5/255** for that background between distinct stills.
    ⚠️ The intra-hold figure understates what re-encoding a new still adds, so a ~16× gap is
    suggestive of a plate regenerated per still, not proof — a pasted plate re-encoded at each
    transition also moves. What the control does rule out is reading 1.3/255 as "identical" or as
    "different" with no reference at all.

  Feed `starts` back to `ffmpeg -vf "select='eq(n\,A)+eq(n\,B)+…',tile=CxR" -vsync vfr -frames:v 1`
  to get the **exposure sheet** — one cell per distinct still, the whole animation as one image, and
  the right thing to attach to the task. ⚠️ **Size `C×R ≥ len(starts)`** (58 stills → `tile=8x8`
  fits; 70 does not): `-frames:v 1` writes one sheet, so an undersized grid silently drops every
  still past the last cell — the same truncation as the subtitle tile above.

  Two more measurements the same array gives you for free:
  - **Cumulative drift?** Take a background patch in every still and compute its distance from the
    FIRST still, for all k — a curve, not two points, because loss can oscillate or saturate. A flat
    curve with no trend means no visible accumulation in that patch; say which patch. Measured (two
    points only, so weaker than the curve): first-vs-last 1.86, first-vs-middle 1.44 — no sign of the
    naive image→image chaining a replier had assumed.
  - **Where does the variation live?** Take one frame per still, `u = v[starts]`, then
    `dev = np.abs(u - np.median(u, axis=0)).max(axis=0)` and the bounding box of `np.where(dev > 8)`.
    Coordinates are in the decode size `S`, so decode at `S=256` for this one. Measured at 256×256:
    x 55–168, y 70–188 — the character. That is the region changing by MORE than 8 levels, not proof
    the rest is static: the 1.3–1.5/255 background variation above sits under that cut by design.

  ⚠️ `format=gray` measures LUMINANCE only — an equal-brightness hue shift reads as zero. Say
  "no luminance flicker", or decode `format=rgb24` (3 bytes per pixel: `n = d.size // (S*S*3)`, reshape `(n, S, S, 3)`, and average over `axis=(1, 2, 3)` so each pair
  still yields one number) when
  colour consistency is the claim.

  ⚠️ Report the numbers, not a verdict: this measures *what the file looks like*, never *how it was
  made*. A background near the noise floor fits a composited plate AND a masked edit; say what you
  measured and leave the pipeline to the author's own words.

  **Check for audio before saying anything about it — don't assume it's unwatchable:**

  ```
  ffprobe -v error -show_entries stream=index,codec_type,codec_name -of csv=p=0 "$workdir/vid.mp4"
  ```

  If this lists no `audio` stream (common for screencasts — the measured case was video-only
  h264), say the video had **no audio to transcribe** rather than that "audio wasn't
  transcribed" — the latter implies a gap that doesn't exist here.

  ⚠️ **A PRESENT audio stream is not the same as AUDIBLE audio — measure the level before you
  report a gap.** A macOS screen recording routinely ships a real AAC track that is digitally
  silent, and `ffprobe` cannot tell you that: it reports `aac (LC), 48000 Hz, stereo, 128 kb/s`
  exactly as it would for speech, so a stream-exists test produces a confident false caveat. One
  extra command settles it:

  ```
  ffmpeg -hide_banner -i "$workdir/vid.mp4" -af volumedetect -f null /dev/null 2>&1 \
    | grep -E "mean_volume|max_volume"
  ```

  Measured 2026-09-17 on @iamBarronRoth `2096407730030530762` (16 s, stream `aac (LC) 48000 Hz
  stereo 128 kb/s`): `mean_volume: -91.0 dB`, `max_volume: -91.0 dB`. **`max_volume` at the
  −91.0 dB floor (equal to `mean`) is the signature of a track silent for its whole length** —
  controls the same day on synthetic AAC: `anullsrc` → −91.0/−91.0, a 440 Hz sine → mean −21.1 /
  max −16.3, and the same sine attenuated by 60 dB → mean −80.8 / max −76.3. So do NOT pick a
  loudness threshold like "> −50 dB": a genuinely quiet track sits far below it and is still not
  silent. Report a floor reading as «the clip carries an audio track that is digitally silent
  (max_volume −91 dB) — nothing to transcribe»; anything above the floor has signal, so quote the
  two numbers and flag audio as unwatched only then.

  ⚠️ For a LONG video whose point is speech, skip the «highest-bitrate mp4» download above — it can be a 4K file of
  hundreds of MB; fetch the 640x360 variant instead, as below.

  **Signal that is SPEECH → transcribe it; «present, not transcribed» is not an ending for a talk or
  tutorial.** Measured 2026-10-26 on a 30:37 native X talk (`@theo`, status `2114623574371963360`),
  Mac Claude Code:

  ```
  # 1. variants: fxtwitter lists them with bitrate (480x270 … 3840x2160); 640x360 is enough for audio
  curl -s https://api.fxtwitter.com/i/status/<id> | jq '.tweet.media.all[] | {type, formats}'   # EVERY media entry, not [0]; a quoted post's is under .tweet.quote
  #    download the 640x360 mp4 variant's url (not the 4K one) as vid.mp4 into $workdir:
  #    curl -s -o "$workdir/vid.mp4" "<that variant's url>"
  # 2. audio → whisper, exactly the watch-video «Local video file» recipe (name the language)
  cd "$workdir"   # outputs land in the cwd — never run this from a repo checkout
  ffmpeg -i vid.mp4 -vn -ac 1 -ar 16000 -c:a pcm_s16le audio.wav
  whisper-cli -m ~/.cache/whisper.cpp/ggml-large-v3-turbo.bin -f audio.wav -l en --output-srt --output-txt
  # 3. frames at the moments the transcript names — remote seek, no full download
  ffmpeg -ss <sec> -i "<1280x720 variant URL>" -frames:v 1 -q:v 3 "$workdir/f_<sec>.jpg"   # one name per moment
  ```

  The 42 MB 640x360 file had an aac track (`volumedetect` max −1.8 dB, mean −22.7 dB); the transcript
  was 6 835 words, readable as plain text. Remote seek over the mp4 URL returned a 720p frame
  (~100 KB) without downloading the file; find the second with `grep -n '<phrase>'` on the `.srt`.
  A frame showed a `fleet/skills/universal/` tree that the voice never named. **Whisper mangles
  proper names** («sole loop» for «sol loop», a person → «Tebow», model names) — take every name
  from the repo or a frame, not from the transcript. Not measured: how long `whisper-cli` takes on a
  30-min file — do not quote a duration.

  **A claim that the SOUND is synced to the picture («timed it perfectly with the animation») is
  measurable too — scene cuts against audio onsets, with a LOCAL-JITTER control.** A present,
  audible track still leaves you able to say nothing about speech, but a sync claim needs no
  listening.
  - **Cuts.** Reuse the `diff` array from the frame-sequence recipe above (raw 0–255 scale, not
    divided by 255). A hard cut is `diff > th`, merged with a REFRACTORY window anchored on the last KEPT cut:
    `hits = np.where(diff > th)[0] + 1` (frame numbers — `diff[i]` is the step INTO frame `i+1`),
    then `for x in hits: if not cuts or x - cuts[-1] > 3: cuts.append(x)`, time `x/fps`. Three
    frames is 125 ms at 24 fps; at another rate use `round(0.125 * fps)` so the window keeps its
    duration. That is what was measured below; a transitive merge gives 15 cuts instead of 17 on
    the same clip, so say which rule you used.
    **Fix `th = 65` BEFORE you look at the result, and sweep other values only as a robustness
    check, never to pick the smallest p.** The cut count depends on it: 28 / 23 / 17 / 10 cuts at
    40 / 50 / 65 / 80 on the clip below. Check it against the picture BEFORE touching the audio:
    look for scene changes the threshold MISSED, not only at the ones it found — on a DENSE sheet
    (`fps=6` or more), since the 1 fps contact sheet can skip a sub-second shot entirely. Dark or low-contrast cuts can sit well below 65. If it cannot recover the cuts you
    can see, report the test as inconclusive.
  - **Onsets.** A log-magnitude spectral flux over 8 kHz mono, exactly as measured (94 onsets on
    the clip below):

    ```python
    import os, numpy as np                # run as: workdir="$workdir" python3 - <<'EOF'
    workdir = os.environ["workdir"]       # a.raw = ffmpeg -i vid.mp4 -ac 1 -ar 8000 -f s16le a.raw
    a = np.fromfile(f"{workdir}/a.raw", np.int16) / 32768
    sr, hop, w = 8000, 80, np.hanning(256)
    L = np.log1p(np.abs(np.fft.rfft([a[i:i+256]*w for i in range(0, len(a)-256, hop)], axis=1)) * 10)
    f = np.maximum(0, np.diff(L, axis=0)).sum(1); f = (f - f.mean()) / f.std()   # half-wave, z-scored
    t = (np.arange(len(f)) + 1) * hop / sr
    on = t[[i for i in range(1, len(f)-1) if f[i] > 2 and f[i] >= f[i-1] and f[i] >= f[i+1]]]
    ```

    Autocorrelating `f` over lags of 0.3–2.0 s shows the pulse, but it is octave-ambiguous. On the
    clip below the two strongest lags were 0.30 s and 0.60 s, i.e. 200 or 100 BPM, and nothing in
    the envelope says which one is the beat. Report both lags rather than one BPM.
  - **One timeline.** Both raw dumps drop timestamps, so array index equals elapsed time only if
    both streams start at 0 and the video is constant-frame-rate. Check
    `ffprobe -v error -show_entries stream=codec_type,start_time "$workdir/vid.mp4"`: INDEX-derived times (audio samples, CFR
    video frames) need that stream's `start_time` added once. Rate fields cannot prove CFR, so
    either take the video cut times from frame PTS
    (`ffprobe -v error -select_streams v -show_entries frame=pts_time -of csv=p=0 "$workdir/vid.mp4"`,
    which already include
    the offset — do not add it again), or re-decode with `-vf fps=<rate>` so the index is time by
    construction. On the PTS path, decode the raw frames with `-fps_mode passthrough` too, or
    ffmpeg's default CFR sync may drop or duplicate frames and `diff[i]` stops matching PTS `i+1`. `diff[i]` is the step INTO frame `i+1`, so the cut's time is `(i+1)/fps` on
    CFR and `frame_pts[i+1]` on the PTS path — one
    frame (42 ms at 24 fps) is nearly the whole ±50 ms window, so get this right.
  - **Calibrate the detector's LATENCY first — on a synthetic click track, before any real
    number.** Build a few seconds of near-silence with 5 ms clicks at known times, run the same
    detector, and take the mean latency = (detected − true). Measured −20 ms for the snippet above:
    an uncentred window labels each peak early. SUBTRACT the latency from every onset, which here
    moves each one 20 ms later.
  - **Count** the cuts within ±50 ms of an onset, AND print the count as a function of a global
    lag from −200 to +200 ms in 20 ms steps — match `cuts + lag` against the onsets, so a
    POSITIVE lag means the sound trails the cut — because sound can trail a cut by a frame or two. Take
    the profile's MAXIMUM as the statistic, and compute the same maximum over the same lag sweep
    in every null draw. Comparing the best lag against a null at one fixed lag is picking the
    winner after the race.
  - **Null.** Move EACH cut independently to a uniform point within ±J (J = 0.5 s) of where it
    was, truncated to the clip's own start and end on the SAME timeline as the onsets (if you
    re-zero, subtract ONE common origin from both streams, never each stream's own `start_time`,
    which would erase a real A/V offset). Take 5 000 draws. That keeps where the busy
    stretches are and breaks only the fine alignment. ⚠️ **Neither uniformly random times nor a
    whole-series circular shift is a valid null here.** Both move cuts into the quiet intro and
    outro, which lowers the baseline and makes sync look stronger than it is.

  Measured 2026-09-25 on @kevin_t_ngo `2099858454043349342` (27 s, 24 fps CFR, both streams
  `start_time` 0, «the music … timed it perfectly», `th = 65`, 17 cuts, 94 onsets):

  | statistic | real | null mean | P(null ≥ real) |
  |---|---|---|---|
  | uncalibrated onsets, lag 0 | 11/17 | 6.5 | 0.02 |
  | calibrated (+20 ms), lag 0 | 5/17 | 6.6 | 0.86 |
  | calibrated, MAX over −200…+200 ms | 11/17 (at +20 ms) | 9.8 | 0.28 |

  So the calibrated profile does peak just after lag 0: sound trails a cut by 20–70 ms on about
  seven cuts. But random jitter reaches that height over the same sweep 28% of the time, and
  equal counts appear at −200 ms. **Verdict: no evidence that the scene cuts were placed on sound
  events.** The «significant» first reading came from 20 ms of detector latency plus a fixed-lag
  test. That is the lesson, and it is why both the calibration step and the max-over-lags null
  are there: with a ±50 ms window, one uncorrected constant decides the
  answer. ⚠️ **Scope the verdict to cuts.** Sync within a shot (an
  impact, a wing beat, a pose change) is invisible to this test, so it can neither confirm nor
  refute sync overall. It measures cut-to-onset alignment and nothing else. Report the numbers,
  not the author's adjective.
  ⚠️ **Onset DENSITY sets the chance level.** 94 onsets in 27 s put a random time within 50 ms of
  one about a third of the time, so a bare «N/17 matched» means nothing without the control.
  A spectrogram is worth one `Read` alongside it, because it shows WHAT the sound is:
  `ffmpeg -y -v error -i "$workdir/vid.mp4" -lavfi showspectrumpic=s=1600x500:legend=1:scale=log "$workdir/spec.png"`.
  That clip's spectrogram shows clean harmonic stacks and flat-topped noise bursts, which fits
  the author's «Web Audio API» answer. Say *consistent with* it: a spectrogram cannot prove how a
  sound was made.

  **Fallback — only when the `variants` list isn't reachable** (`tweet-result` fails, or the post
  isn't publicly embeddable): the poster frame's CDN path still works, but ⚠️ **do NOT rebuild it
  under `/media/`.** It lives on deeper, differently-shaped paths
  (`ext_tw_video_thumb/<video-id>/pu/img/<file>.jpg`, `amplify_video_thumb/<video-id>/img/<file>.jpg`),
  so reconstructing from a captured id alone yields a URL that does not exist. **Keep the whole
  matched path** and fetch that — match against the whole page HTML, not just the article subtree:

  ```js
  document.documentElement.innerHTML.match(/pbs\.twimg\.com\/(?:ext_tw_video_thumb|amplify_video_thumb)\/[^"'\s)\\]+/g)
  ```

  then `curl "https://<matched>?format=png&name=4096x4096"` (strip any existing `?name=`/`?format=`
  query first), then `Read` it. Three posters came back this way in one run — 800×424, 1920×1080,
  1280×794 — all valid PNGs. A single poster frame can be the whole substance of a post (measured
  case: it carried a full README diff and `Cargo.toml` — version, license, repo URL, dependencies),
  but it is still ONE frame — reach for the `ffmpeg` path above whenever the mp4 is reachable at
  all.

  ⚠️ **Dedupe the matches and take the SHORTEST — a match can carry an escaped tail.** The
  exclusion class above stops at `\`, but `&`, `q`, `u`, `o`, `t` and `;` are all ordinary
  characters, so an `innerHTML` occurrence followed by `&quot;` is captured with that tail attached
  and shows up beside the clean match as a second "unique" URL. `.replace(/&quot;.*$/, '')` on each
  match, then dedupe, before you count or fetch anything.

  **Read the poster frame FIRST when the post claims a demo but links nothing — the address bar is
  in the picture.** A screencast's poster usually shows the browser chrome, and the URL in it is the
  cheapest evidence about what was recorded. Measured 2026-09-05 on @tomkrcha's «GPT-6 Astra +
  three.js» post: `entities.urls` was empty and no reply carried a link, and the poster showed
  **`127.0.0.1:4173`** — the default `vite preview` port. The same frame also gave the app's name,
  its whole UI and the numbers on screen.
  ⚠️ **Say what that actually proves, which is less than it feels like.** It establishes that **the
  instance being demonstrated was local and the post supplied no public URL** — not that no public
  deployment exists, since an author can record locally and deploy elsewhere. If availability is
  what the task turns on, keep looking (the author's other posts, a repo, a pinned reply) and report
  the local address bar as evidence rather than as the answer.

  ⚠️ **The count of unique video IDs among the poster-path matches is a cheap workload signal — but
  normalize first, and it is not an exact post count.** The regex captures the whole matched path
  including any query string, so the same video served with a different `?format=`/`?name=` shows
  up as two "unique" matches — strip the query string and dedupe on the id segment right after
  `ext_tw_video_thumb/`/`amplify_video_thumb/` before counting. Even normalized, one post can carry
  more than one video and the match runs over the whole page (which may include quoted/reply
  media), so **treat the id count as a rough sizing hint for the Step 5 read, not a post count** —
  it tells you native video is present and roughly how much, before you've read a word.

  ⚠️ If the fetch 404s, the URL shape may have changed for that post — read the real `src` off the
  `video`/`img` element and use it verbatim rather than pattern-building.

  ⚠️ The chrome MCP redacts a bare media id or a `src` carrying a query string, so return it from
  the page defanged — `{kind, url: url.split('').join('.')}` — and strip the dots on your side.
