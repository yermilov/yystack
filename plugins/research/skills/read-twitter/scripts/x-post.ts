#!/usr/bin/env bun
// x-post.ts — read ONE public X post without a browser, as Markdown.
//
// The no-browser path of read-twitter's Capability note, with its traps encoded once:
//   - X's syndication endpoint answers 200 with `{}` when the `token` parameter is missing, which
//     reads as an empty post — so the token is always sent;
//   - it has served a DIFFERENT tweet's payload for a correct id — so `id_str` is checked;
//   - it carries only a `note_tweet` id for a long post, never its body, and inside `quoted_tweet` the
//     note can be missing even when the post has one — so the full text comes from api.fxtwitter.com,
//     and a quoted long post is reported as "possibly clipped", never as complete.
// It cannot collect the self-thread or replies: say so in the report (SKILL.md Step 5 needs a browser).
//
//   bun run x-post.ts <x.com status URL | status id> [--json]
//
// Exit codes: 0 read · 1 not found, protected or withheld (a tombstone) · 2 usage error or unreadable.

const USAGE = `usage: bun run "SKILLDIR/scripts/x-post.ts" <x.com status URL | status id> [--json]

Reads one public X post with no browser: author, time, full text (long posts via api.fxtwitter.com),
expanded links, photos at original size, native-video presence, the quoted post, and counters.
It cannot read the self-thread or replies — those need a signed-in browser.

Exit: 0 read · 1 not found / protected / withheld · 2 usage error or unreadable.`;

type Out = Record<string, unknown>;

// X itself and the mirror hosts that keep X's path (SKILL.md Step 1). Any other host is refused, so a
// URL like example.com/status/20 is never read as X post 20. A self-hosted Nitter instance cannot be
// told apart from any other site by its name, so pass its status id instead of its URL.
const X_HOSTS = /^(?:(?:www|mobile)\.)?(?:x|twitter)\.com$|^(?:fxtwitter|fixupx|vxtwitter|fixvx)\.com$|^nitter\.net$/i;

function parseId(arg: string): string | null {
  if (/^\d{1,25}$/.test(arg)) return arg;
  try {
    const u = new URL(arg.startsWith("http") ? arg : `https://${arg}`);
    if (!X_HOSTS.test(u.hostname)) return null;
    const m = /\/status(?:es)?\/(\d{1,25})/.exec(u.pathname);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

async function getJson(url: string): Promise<{ status: number; body: any }> {
  const res = await fetch(url, { headers: { "user-agent": "read-twitter-skill" }, signal: AbortSignal.timeout(15000) });
  const text = await res.text();
  try { return { status: res.status, body: JSON.parse(text) }; } catch { return { status: res.status, body: null }; }
}

// t.co links in `text` → their expanded URLs, from the entities the endpoint returns.
function expand(text: string, urls: any[] | undefined): string {
  let t = text;
  for (const u of urls ?? []) if (u?.url && u?.expanded_url) t = t.split(u.url).join(u.expanded_url);
  return t;
}

async function main() {
  const args = process.argv.slice(2);
  const usage = (why: string): never => { console.error(`x-post: ${why}\n\n${USAGE}`); process.exit(2); };
  if (args.length === 1 && (args[0] === "-h" || args[0] === "--help")) { console.log(USAGE); process.exit(0); }
  // One pass: every argument is either --json or the single target; anything else is refused, so a
  // typo such as --jsn is never read as the post to fetch.
  let json = false;
  const positionals: string[] = [];
  for (const a of args) {
    if (a === "--json") { if (json) usage("--json given twice"); json = true; }
    else if (a.startsWith("-")) usage(`unknown flag ${a}`);
    else positionals.push(a);
  }
  if (positionals.length !== 1) usage(`expected exactly one status URL or id, got ${positionals.length}`);
  const id = parseId(positionals[0]);
  if (!id) usage(`not an x.com (or mirror) status URL or a status id: ${positionals[0]}`);

  let synd;
  try { synd = await getJson(`https://cdn.syndication.twimg.com/tweet-result?id=${id}&lang=en&token=a`); }
  catch (e: any) { console.error(`x-post: syndication endpoint unreachable (${e?.message ?? e})`); process.exit(2); }
  const t = synd.body;
  if (synd.status === 404) { console.error("x-post: post not found (404)"); process.exit(1); }
  if (synd.status >= 400) {
    console.error(`x-post: the syndication endpoint answered HTTP ${synd.status} — a claim about the endpoint (rate limit or outage), not the post; retry later`);
    process.exit(2);
  }
  if (!t || typeof t !== "object" || Object.keys(t).length === 0) {
    console.error(`x-post: the syndication endpoint returned an empty body (HTTP ${synd.status}) — a claim about the endpoint, not proof the post is empty`);
    process.exit(2);
  }
  if (t.__typename === "TweetTombstone") {
    console.error(`x-post: tombstone — the post is protected, withheld or deleted${t.tombstone?.text?.text ? `: ${t.tombstone.text.text}` : ""}`);
    process.exit(1);
  }
  if (t.id_str !== id) {
    console.error(`x-post: asked for ${id} but the endpoint returned ${t.id_str ?? "no id"} — refusing to report another post`);
    process.exit(2);
  }

  const handle: string = t.user?.screen_name ?? "";
  let body = expand(t.text ?? "", t.entities?.urls);
  let bodySource = "syndication";
  let fullLinks: string[] = [];
  const hasNote = Boolean(t.note_tweet);
  const out: Out = {};
  const notes: string[] = [];

  // A long post: the syndication body is clipped; take the full text from fxtwitter.
  if (hasNote) {
    try {
      const fx = await getJson(`https://api.fxtwitter.com/${handle || "i"}/status/${id}`);
      const ft = fx.body?.tweet;
      if (fx.status === 200 && ft && String(ft.id) === id && typeof ft.text === "string") {
        body = ft.text;
        bodySource = "api.fxtwitter.com";
        // The full body's links: fxtwitter's text already carries them expanded, and its url facets
        // list them — syndication's entities cover only the clipped part.
        fullLinks = (ft.raw_text?.facets ?? [])
          .filter((f: any) => f?.type === "url")
          .map((f: any) => f.replacement ?? f.original)
          .filter((u: any) => typeof u === "string");
      } else notes.push("long post: fxtwitter did not return it, so the body below is CLIPPED — read the permalink in a browser");
    } catch {
      notes.push("long post: fxtwitter unreachable, so the body below is CLIPPED — read the permalink in a browser");
    }
  }

  const photos = (t.mediaDetails ?? []).filter((m: any) => m.type === "photo").map((m: any) => `${m.media_url_https}?name=orig`);
  const videos = (t.mediaDetails ?? []).filter((m: any) => m.type === "video" || m.type === "animated_gif").length;
  const links = [...new Set([...(t.entities?.urls ?? []).map((u: any) => u.expanded_url).filter(Boolean), ...fullLinks])];

  let quoted: Out | null = null;
  if (t.quoted_tweet) {
    const q = t.quoted_tweet;
    quoted = {
      id: q.id_str,
      handle: q.user?.screen_name,
      created: q.created_at,
      text: expand(q.text ?? "", q.entities?.urls),
      // The quoted post's own media: SKILL.md Step 4b reports it separately from the root's.
      photos: (q.mediaDetails ?? []).filter((m: any) => m.type === "photo").map((m: any) => `${m.media_url_https}?name=orig`),
      nativeVideos: (q.mediaDetails ?? []).filter((m: any) => m.type === "video" || m.type === "animated_gif").length,
      // The nested object can clip text and drop note_tweet even for a long post: unknown, not absent.
      complete: false,
    };
    notes.push("quoted post: its text may be clipped here (the endpoint drops note_tweet inside quoted_tweet) — read it in full with this script on its own id, or its permalink");
  }

  Object.assign(out, {
    id, url: `https://x.com/${handle}/status/${id}`, handle, name: t.user?.name, created: t.created_at,
    text: body, bodySource, longPost: hasNote, links, photos, nativeVideos: videos,
    replies: t.conversation_count, likes: t.favorite_count, quoted, notes,
    notCollected: "self-thread and replies (need a signed-in browser)",
  });

  if (json) { console.log(JSON.stringify(out, null, 2)); process.exit(0); }
  const lines: string[] = [];
  lines.push(`# @${handle} — ${body.split("\n")[0].slice(0, 80)}`, "");
  lines.push(`_${t.created_at} · ${t.conversation_count ?? "?"} replies · ${t.favorite_count ?? "?"} likes_ · ${out.url}`, "");
  lines.push(body, "");
  if (quoted) {
    lines.push(`## Quoted post — @${quoted.handle}`, `_${quoted.created}_ · https://x.com/${quoted.handle}/status/${quoted.id}`, String(quoted.text));
    (quoted.photos as string[]).forEach((p, i) => lines.push(`- Quoted image ${i + 1}: ${p}`));
    if (quoted.nativeVideos) lines.push(`- ${quoted.nativeVideos} native video(s) on the QUOTED post: run x-video-variants.ts ${id} (it covers the quoted post)`);
    lines.push("");
  }
  if (links.length) { lines.push("## Embedded links"); for (const l of links) lines.push(`- ${l}`); lines.push(""); }
  if (photos.length) { lines.push("## Images (read each — SKILL.md Step 6)"); photos.forEach((p: string, i: number) => lines.push(`- Image ${i + 1}: ${p}`)); lines.push(""); }
  if (videos) lines.push(`## Video`, `- ${videos} native video(s): run x-video-variants.ts ${id}`, "");
  lines.push("## Not collected", "- the self-thread and replies need a signed-in browser (SKILL.md Step 5)");
  for (const n of notes) lines.push(`- ${n}`);
  console.log(lines.join("\n"));
  process.exit(0);
}

main();
