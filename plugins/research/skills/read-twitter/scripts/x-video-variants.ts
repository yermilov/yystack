#!/usr/bin/env bun
// List every native video on one X post (root AND quoted post) with its best mp4 variant and a
// contact-sheet grid sized from its duration. Read-only: one GET to X's syndication endpoint.
//
//   bun run x-video-variants.ts <status id | x.com status URL> [--fps <frames per second>]
//
// Prints one JSON object per video on stdout. Exit codes: 0 = at least one video listed;
// 1 = the post was read but carries no native video; 2 = the post could not be read (network,
// wrong id served, unknown payload) — the message on stderr says which.

const USAGE = `usage: bun run "SKILLDIR/scripts/x-video-variants.ts" <status id | x.com status URL> [--fps <n>]
  Lists each native video on the post and on its quoted post: the highest-bitrate mp4 URL, the
  duration in seconds, and a contact-sheet grid (columns x rows) for ffmpeg's tile filter.
  --fps   frames per second to sample (default: 1, lowered so the sheet stays at <= 36 cells)
output: one JSON line per video —
  owner            "root" or "quoted" (whose video it is)
  postId, type     the post the video belongs to; "video" or "animated_gif"
  mp4, bitrate     the highest-bitrate mp4 variant
  smaller[]        the other mp4 variants, highest first (the last is the smallest)
  durationSeconds  the clip length in seconds (X reports milliseconds; already divided)
  poster           the poster frame's image URL
  sheet            {fps, columns, rows} for ffmpeg: -vf "fps=<fps>,scale=360:-1,tile=<columns>x<rows>"
exit 0 = videos listed, 1 = no native video, 2 = the post could not be read`;

type Variant = { bitrate?: number; content_type: string; url: string };
type Media = {
  type?: string;
  media_url_https?: string;
  video_info?: { duration_millis?: number; variants?: Variant[] };
};
type Tweet = { id_str?: string; mediaDetails?: Media[]; quoted_tweet?: Tweet };

function parseArgs(argv: string[]): { id: string; fps: number | null } {
  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) {
    console.log(USAGE);
    process.exit(argv.length === 0 ? 2 : 0);
  }
  let fps: number | null = null;
  const fpsAt = argv.indexOf("--fps");
  if (fpsAt >= 0) {
    const raw = argv[fpsAt + 1] ?? "";
    const [n, d] = raw.split("/").map(Number);
    fps = d ? n / d : n;
    if (!Number.isFinite(fps!) || fps! <= 0) fail(`--fps must be a positive number or fraction, got "${raw}"`);
    argv = argv.filter((_, i) => i !== fpsAt && i !== fpsAt + 1);
  }
  const target = argv[0];
  // Same host rule as x-post.ts: a non-X URL is never read as an X post id.
  let id: string | undefined;
  if (/^\d+$/.test(target)) id = target;
  else {
    try {
      const u = new URL(target.startsWith("http") ? target : `https://${target}`);
      if (/^(?:(?:www|mobile)\.)?(?:x|twitter)\.com$|^(?:fxtwitter|fixupx|vxtwitter|fixvx)\.com$|^nitter\.net$/i.test(u.hostname))
        id = u.pathname.match(/\/status(?:es)?\/(\d+)/)?.[1];
    } catch {}
  }
  if (!id) fail(`not a status id or status URL: ${target}`);
  return { id: id!, fps };
}

function fail(message: string): never {
  console.error(`x-video-variants: ${message}`);
  process.exit(2);
}

// Smallest near-square grid with at least `cells` cells.
export function grid(cells: number): { columns: number; rows: number } {
  const n = Math.max(1, Math.ceil(cells));
  const columns = Math.ceil(Math.sqrt(n));
  return { columns, rows: Math.ceil(n / columns) };
}

const MAX_CELLS = 36;

export function videosOf(tweet: Tweet, owner: "root" | "quoted", requestedFps: number | null) {
  const out = [];
  for (const media of tweet.mediaDetails ?? []) {
    const variants = (media.video_info?.variants ?? []).filter((v) => v.content_type === "video/mp4");
    if (variants.length === 0) continue;
    const byBitrate = [...variants].sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0));
    const best = byBitrate[0];
    const millis = media.video_info?.duration_millis;
    // duration_millis is MILLIseconds; fps is per second — divide before multiplying.
    const seconds = typeof millis === "number" ? millis / 1000 : null;
    // Default: 1 frame/s, lowered for long clips so one sheet stays readable.
    // Round DOWN to 3 decimals before sizing the grid, so the printed rate is the one the grid fits.
    const fps = requestedFps ?? (seconds === null ? 1 : Math.floor(Math.min(1, MAX_CELLS / seconds) * 1000) / 1000);
    out.push({
      owner,
      postId: tweet.id_str,
      type: media.type,
      mp4: best.url,
      bitrate: best.bitrate ?? null,
      // Smaller variants, best first: a long clip's frames and audio need only the lowest one.
      smaller: byBitrate.slice(1).map((v) => ({ bitrate: v.bitrate ?? null, mp4: v.url })),
      durationSeconds: seconds,
      poster: media.media_url_https ?? null,
      sheet: seconds === null ? null : { fps, ...grid(seconds * fps) },
    });
  }
  return out;
}

if (import.meta.main) {
  const { id, fps } = parseArgs(process.argv.slice(2));
  // Without a token parameter the endpoint answers 200 with `{}` — the token's value does not matter.
  const url = `https://cdn.syndication.twimg.com/tweet-result?id=${id}&lang=en&token=a`;
  let res: Response;
  try {
    res = await fetch(url);
  } catch (e) {
    fail(`request failed: ${(e as Error).message}`);
  }
  if (!res!.ok) fail(`HTTP ${res!.status} from the syndication endpoint`);
  let body: Tweet;
  try {
    body = await res!.json();
  } catch {
    fail("the endpoint answered with something other than JSON");
  }
  if (!body.id_str) fail("empty payload — the post is missing, protected, or the endpoint changed");
  if (body.id_str !== id) fail(`asked for ${id} but the endpoint served ${body.id_str} — do not trust it`);
  const videos = [...videosOf(body, "root", fps), ...(body.quoted_tweet ? videosOf(body.quoted_tweet, "quoted", fps) : [])];
  for (const v of videos) console.log(JSON.stringify(v));
  if (!videos.length) console.error(`x-video-variants: no native video on ${id} (or its quoted post)`);
  process.exit(videos.length > 0 ? 0 : 1);
}
