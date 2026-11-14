#!/usr/bin/env bun
// Audits the two STRING mandates skill-authoring places on a SKILL.md body (its §2 and §8):
//   1. a body over 500 lines (wc -l, frontmatter included) carries a line starting
//      `Length verdict (§2):`;
//   2. which skills carry a Step-0 marker sentence — `Register these as todo items` or
//      `Register them in this session's own todo/plan tool`.
// Both are matched only OUTSIDE code fences and inline backticks, so a skill that merely QUOTES a
// marker in code is not counted as carrying it. The marker sentence may
// wrap across a line break; whitespace is normalised before matching.
//
// Usage: bun run audit-markers.ts [marketplace-root] [--json]

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const args = process.argv.slice(2);
// --help wins only when nothing else on the line is wrong: `--bad --help` or two roots must still exit 2.
const badFlag =
  args.some((a) => a.startsWith("-") && !["--json", "--help", "-h"].includes(a)) ||
  args.filter((a) => !a.startsWith("-")).length > 1;
if ((args.includes("--help") || args.includes("-h")) && !badFlag) {
  console.log(`usage: bun run audit-markers.ts [marketplace-root] [--json]

Scans <root>/plugins/*/skills/*/SKILL.md (default root: the current directory).

Exits 1 when a SKILL.md over 500 lines has no line starting "Length verdict (§2):" outside a code
fence — the one defect here a machine can be sure of.

Also lists every skill that carries a Step-0 marker sentence, and every skill that does not. That
second list is a SHORTLIST, not a verdict: a knowledge or task skill rightly has no marker, so only
your inventory of workflow skills can turn "no marker" into "missing". A marker that appears only
inside a code fence or backticks does not count — that is a skill discussing the block, not one
running it.

Exit codes: 0 clean, 1 a length verdict is missing, 2 the audit could not run (the root has no
plugins/ directory, an unknown flag, or more than one root).`);
  process.exit(0);
}
// Refuse what we do not parse: a typo'd flag silently ignored would audit the wrong thing and pass.
const unknown = args.filter((a) => a.startsWith("-") && !["--json", "--help", "-h"].includes(a));
const positional = args.filter((a) => !a.startsWith("-"));
if (unknown.length > 0 || positional.length > 1) {
  console.error(
    unknown.length > 0
      ? `audit-markers: unknown flag ${unknown.join(" ")} — the flags are --json and --help.`
      : `audit-markers: one marketplace root at most, got ${positional.length}: ${positional.join(" ")}`,
  );
  process.exit(2);
}
const json = args.includes("--json");
const root = resolve(positional[0] ?? ".");
const pluginsDir = join(root, "plugins");

function isDir(p: string): boolean {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

if (!isDir(pluginsDir)) {
  console.error(
    `audit-markers: no plugins/ directory under ${root}. Pass the marketplace root (the directory ` +
      `that holds plugins/<plugin>/skills/<skill>/SKILL.md) as the first argument; a retry will not help.`,
  );
  process.exit(2);
}

const LENGTH_CAP = 500;
const VERDICT = /^Length verdict \(§2\):/m;
const MARKERS = [
  "Register these as todo items",
  "Register them in this session's own todo/plan tool",
];

// Remove inline code spans the CommonMark way: a run of N backticks opens a span that only a run of
// exactly N backticks closes; an unmatched run is literal text.
function stripCodeSpans(text: string): string {
  let out = "";
  let i = 0;
  while (i < text.length) {
    if (text[i] !== "`") {
      out += text[i++];
      continue;
    }
    let n = 0;
    while (text[i + n] === "`") n++;
    let j = i + n;
    let close = -1;
    while (j < text.length) {
      if (text[j] !== "`") {
        j++;
        continue;
      }
      let m = 0;
      while (text[j + m] === "`") m++;
      if (m === n) {
        close = j;
        break;
      }
      j += m;
    }
    if (close === -1) {
      out += "`".repeat(n);
      i += n;
    } else {
      i = close + n;
    }
  }
  return out;
}

// Drop fenced blocks (a fence closes only on the same character, at least as long as the opener,
// with nothing after it), then inline code spans. Lines outside code are kept in order.
function prose(text: string): string {
  const out: string[] = [];
  let fence: { char: string; len: number } | null = null;
  for (const line of text.split("\n")) {
    if (fence === null) {
      const open = line.match(/^ {0,3}(`{3,}|~{3,})/);
      if (open) {
        fence = { char: open[1][0], len: open[1].length };
        continue;
      }
      out.push(line);
    } else {
      const close = line.match(/^ {0,3}(`{3,}|~{3,})\s*$/);
      if (close && close[1][0] === fence.char && close[1].length >= fence.len) fence = null;
    }
  }
  // A code span never crosses a blank line (a paragraph break), so strip spans per paragraph: one
  // stray backtick must not swallow a real verdict line further down.
  return out.join("\n").split(/\n[ \t]*\n/).map(stripCodeSpans).join("\n\n");
}

type Row = { path: string; lines: number; verdict: boolean; marker: boolean };
const rows: Row[] = [];
function list(dir: string): string[] {
  try {
    return readdirSync(dir).sort();
  } catch (e) {
    console.error(`audit-markers: cannot read ${dir} (${(e as Error).message}) — the audit did not run (permanent: fix the permissions or the path).`);
    process.exit(2);
  }
}
for (const plugin of list(pluginsDir)) {
  const skillsDir = join(pluginsDir, plugin, "skills");
  if (!isDir(skillsDir)) continue;
  for (const skill of list(skillsDir)) {
    const file = join(skillsDir, skill, "SKILL.md");
    let text: string;
    try {
      text = readFileSync(file, "utf8");
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") continue; // a skill dir with no SKILL.md
      // Anything else (permissions, a directory named SKILL.md) would silently shrink the audit.
      console.error(`audit-markers: cannot read ${file} (${(e as Error).message}) — the audit did not run (permanent: fix the permissions or the path).`);
      process.exit(2);
    }
    const body = prose(text);
    const flat = body.replace(/\s+/g, " ");
    rows.push({
      path: relative(root, file),
      lines: (text.match(/\n/g) ?? []).length, // what `wc -l` reports
      verdict: VERDICT.test(body),
      marker: MARKERS.some((m) => flat.includes(m)),
    });
  }
}

const missingVerdict = rows.filter((r) => r.lines > LENGTH_CAP && !r.verdict);
const withMarker = rows.filter((r) => r.marker);
const withoutMarker = rows.filter((r) => !r.marker);

if (json) {
  console.log(
    JSON.stringify(
      {
        root,
        skills: rows.length,
        missingLengthVerdict: missingVerdict.map((r) => ({ path: r.path, lines: r.lines })),
        withStep0Marker: withMarker.map((r) => r.path),
        withoutStep0Marker: withoutMarker.map((r) => r.path),
      },
      null,
      2,
    ),
  );
} else {
  console.log(`${rows.length} skills under ${root}\n`);
  console.log(`over ${LENGTH_CAP} lines with no "Length verdict (§2):" line — fails: ${missingVerdict.length}`);
  for (const r of missingVerdict) console.log(`  ${r.lines}  ${r.path}`);
  console.log(`\ncarry a Step-0 marker outside code: ${withMarker.length}`);
  for (const r of withMarker) console.log(`  ${r.path}`);
  console.log(
    `\nno Step-0 marker — shortlist; a WORKFLOW skill here is missing its block, any other kind is fine: ${withoutMarker.length}`,
  );
  for (const r of withoutMarker) console.log(`  ${r.path}`);
}
process.exit(missingVerdict.length > 0 ? 1 : 0);
