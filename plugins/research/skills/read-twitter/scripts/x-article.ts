#!/usr/bin/env bun
// Render one X Article (the long-form post format) as Markdown, with every figure resolved to its
// image URL and every link kept. Read-only: one GET to api.fxtwitter.com, no browser needed.
//
//   bun run x-article.ts <x.com status URL | handle/status id>
//
// Exit codes: 0 = article rendered; 1 = the post was read but is not an X Article (read it with the
// normal steps); 2 = the post could not be read — the message on stderr says why.

const USAGE = `usage: bun run x-article.ts <x.com status URL | <handle>/<status id>>
  Prints the article as Markdown: title, paragraphs, headings, lists, figures as image links (in
  their place in the prose), and inline links. Figures are pbs.twimg.com URLs — download and read each.
exit 0 = rendered, 1 = not an X Article, 2 = the post could not be read`;

type EntityRange = { key: number; offset: number; length: number };
type Block = { type: string; text: string; entityRanges?: EntityRange[] };
type Entity = { key: string; value: { type: string; data: Record<string, any> } };
type MediaEntity = { media_id: string; media_info?: { original_img_url?: string } };
type Article = {
  title?: string;
  cover_media?: { media_info?: { original_img_url?: string } };
  content?: { blocks?: Block[]; entityMap?: Entity[] | Record<string, Entity["value"]> };
  media_entities?: MediaEntity[];
};

function fail(message: string): never {
  console.error(`x-article: ${message}`);
  process.exit(2);
}

function parseTarget(arg: string | undefined): { handle: string; id: string } {
  if (!arg || arg === "--help" || arg === "-h") {
    console.log(USAGE);
    process.exit(arg ? 0 : 2);
  }
  const m = arg.match(/(?:x\.com|twitter\.com)\/([^/]+)\/status(?:es)?\/(\d+)/) ?? arg.match(/^([^/]+)\/(\d+)$/);
  if (!m) fail(`expected an x.com status URL or <handle>/<id>, got: ${arg}`);
  return { handle: m![1], id: m![2] };
}

// entityMap arrives as an array of {key: "<string>", value} entries NOT in key order (as of
// 2026-09); an object keyed by string is accepted too. Ranges reference keys as NUMBERS.
function entityLookup(map: unknown): Map<string, Entity["value"]> {
  const out = new Map<string, Entity["value"]>();
  if (Array.isArray(map)) for (const e of map) out.set(String(e.key), e.value);
  else if (map && typeof map === "object") for (const [k, v] of Object.entries(map)) out.set(String(k), v as Entity["value"]);
  return out;
}

export function render(article: Article): { markdown: string; unresolved: number } {
  const entities = entityLookup(article.content?.entityMap);
  const media = new Map((article.media_entities ?? []).map((m) => [String(m.media_id), m.media_info?.original_img_url]));
  const lines: string[] = [];
  let unresolved = 0;
  let figure = 0;
  if (article.title) lines.push(`# ${article.title}`, "");
  const cover = article.cover_media?.media_info?.original_img_url;
  if (cover) lines.push(`![cover](${cover})`, "");
  for (const block of article.content?.blocks ?? []) {
    if (block.type === "atomic") {
      for (const range of block.entityRanges ?? []) {
        const entity = entities.get(String(range.key));
        if (entity?.type === "MEDIA") {
          for (const item of entity.data.mediaItems ?? []) {
            const url = media.get(String(item.mediaId));
            figure += 1;
            if (url) lines.push(`![figure ${figure}](${url})`, "");
            else {
              unresolved += 1;
              lines.push(`[figure ${figure}: media ${item.mediaId} not found in media_entities]`, "");
            }
          }
        } else {
          unresolved += 1;
          lines.push(`[embedded ${entity?.type ?? "unknown"} entity — not rendered]`, "");
        }
      }
      continue;
    }
    let text = block.text;
    // Apply LINK ranges right to left so earlier offsets stay valid.
    const ranges = [...(block.entityRanges ?? [])].sort((a, b) => b.offset - a.offset);
    for (const range of ranges) {
      const entity = entities.get(String(range.key));
      if (entity?.type !== "LINK" || !entity.data.url) continue;
      const span = text.slice(range.offset, range.offset + range.length);
      text = `${text.slice(0, range.offset)}[${span}](${entity.data.url})${text.slice(range.offset + range.length)}`;
    }
    const prefix: Record<string, string> = {
      "header-one": "## ",
      "header-two": "### ",
      "header-three": "#### ",
      "unordered-list-item": "- ",
      "ordered-list-item": "1. ",
      blockquote: "> ",
    };
    const isList = block.type.endsWith("list-item");
    lines.push(`${prefix[block.type] ?? ""}${text}`);
    if (!isList) lines.push("");
  }
  return { markdown: lines.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n", unresolved };
}

if (import.meta.main) {
  const { handle, id } = parseTarget(process.argv[2]);
  let res: Response;
  try {
    res = await fetch(`https://api.fxtwitter.com/${handle}/status/${id}`);
  } catch (e) {
    fail(`request failed: ${(e as Error).message}`);
  }
  if (!res!.ok) fail(`HTTP ${res!.status} from api.fxtwitter.com`);
  let body: { tweet?: { id?: string; article?: Article } };
  try {
    body = await res!.json();
  } catch {
    fail("the API answered with something other than JSON — the post is missing, protected, or the API changed");
  }
  if (!body!.tweet) fail("no tweet in the payload — the post is missing, protected, or the API changed");
  if (body!.tweet!.id !== id) fail(`asked for ${id} but the API served ${body!.tweet!.id} — do not trust it`);
  if (!body!.tweet!.article) {
    console.error("x-article: this post is not an X Article — read it with the normal steps");
    process.exit(1);
  }
  const { markdown, unresolved } = render(body!.tweet!.article);
  process.stdout.write(markdown);
  if (unresolved > 0) console.error(`x-article: ${unresolved} embedded item(s) could not be resolved — marked in the output`);
}
