#!/usr/bin/env bun
// check-brief.ts — the mechanical half of SKILL.md's pre-handoff check, run on a council's brief.md.
//
// Read-only. It checks what a script can be sure of: the template's sections are all present (or
// carry a reason for being empty), the header fields are filled, the header's depth/rounds agree with
// the round files on disk, and every entry under «Sources» carries a URL. Whether each source really
// says what it is cited for is still the Chairman's own check — the script cannot open a page for you.
//
//   bun run check-brief.ts <path to brief.md> [--json]
//
// Exit codes: 0 every check passed · 1 at least one finding (each is printed) · 2 usage error.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";

const USAGE = `usage: bun run check-brief.ts <path to brief.md> [--json]

Checks a council brief against references/brief-template.md:
  - every template section is present, and an empty one says why;
  - the header fields Question / Council / Depth / Rounds / Date are filled;
  - Rounds is 1, 2 or 3 (Stage 1 counts as round 1) and agrees with the 02_/03_/04_ round files
    beside the brief; a third round only in a Deep Research council;
  - every «Sources» entry carries an http(s) URL.

Exit: 0 clean · 1 findings · 2 usage error.`;

const SECTIONS = [
  "tl;dr",
  "What the council agreed on",
  "Where the council disagreed",
  "What I (Chairman) checked or pushed back on",
  "Recommendation",
  "Open questions",
  "Sources",
];
const HEADER = ["Question", "Council", "Depth", "Rounds", "Date"];
const PLACEHOLDER = /\[(?:the framed question|each member|Quick \/ Standard|1, 2 or 3|YYYY-MM-DD|Topic)[^\]]*\]/i;

function main() {
  const args = process.argv.slice(2);
  if (args.includes("-h") || args.includes("--help")) { console.log(USAGE); process.exit(0); }
  const json = args.includes("--json");
  const rest = args.filter((a) => a !== "--json");
  if (rest.length !== 1 || rest[0].startsWith("--")) { console.error(`check-brief: expected one brief.md path\n\n${USAGE}`); process.exit(2); }
  const path = rest[0];
  if (!existsSync(path)) { console.error(`check-brief: no such file: ${path}`); process.exit(2); }

  const text = readFileSync(path, "utf8");
  const findings: string[] = [];

  // Sections: split on level-2 headings and match each template section by its opening words.
  const blocks = new Map<string, string>();
  const parts = text.split(/^## +/m).slice(1);
  for (const part of parts) {
    const nl = part.indexOf("\n");
    const title = (nl < 0 ? part : part.slice(0, nl)).trim();
    const body = nl < 0 ? "" : part.slice(nl + 1).trim();
    const key = SECTIONS.find((s) => title.toLowerCase().startsWith(s.toLowerCase()));
    if (key) blocks.set(key, body);
  }
  for (const s of SECTIONS) {
    const body = blocks.get(s);
    if (body === undefined) findings.push(`section missing: «${s}»`);
    else if (body.replace(/\s+/g, "").length === 0) findings.push(`section «${s}» is empty — say why it is empty`);
    else if (/^\[.*\]$/s.test(body)) findings.push(`section «${s}» still holds the template's bracketed instruction`);
  }

  // Header fields: "**Field:** value" anywhere before the first section.
  const head = text.split(/^## +/m)[0];
  const header: Record<string, string> = {};
  for (const f of HEADER) {
    const m = new RegExp(`\\*\\*${f}:\\*\\*\\s*([^;\\n*]*)`, "i").exec(head);
    const v = m?.[1]?.trim() ?? "";
    header[f] = v;
    if (!v) findings.push(`header field missing or empty: ${f}`);
  }
  if (PLACEHOLDER.test(head)) findings.push("the header still carries a template placeholder in [brackets]");
  if (header.Date && !/^\d{4}-\d{2}-\d{2}$/.test(header.Date)) findings.push(`Date is not YYYY-MM-DD: "${header.Date}"`);

  // Header vs the round files on disk.
  const dir = dirname(path);
  let files: string[] = [];
  try { files = readdirSync(dir); } catch {}
  const round1 = files.filter((f) => /^02_.+_round1\.md$/.test(f));
  const round2 = files.filter((f) => /^03_.+_round2\.md$/.test(f));
  const round3 = files.filter((f) => /^04_.+_round3\.md$/.test(f));
  if (!round1.length) findings.push("no 02_*_round1.md beside the brief — the header cannot be checked against the rounds");
  // Rounds count overall (Stage 1 is round 1), so the only valid values are 1, 2 and 3.
  const roundsText = header.Rounds;
  const rounds = /^[123]$/.test(roundsText) ? Number(roundsText) : NaN;
  if (roundsText && Number.isNaN(rounds)) findings.push(`Rounds must be 1, 2 or 3, got "${roundsText}"`);
  if (!Number.isNaN(rounds)) {
    const present = round3.length ? 3 : round2.length ? 2 : round1.length ? 1 : 0;
    if (present && rounds !== present) findings.push(`Rounds says ${rounds}, but the files beside the brief show ${present} round(s)`);
    if (round3.length && !round2.length) findings.push("a round-3 file exists without any round-2 file");
    if (rounds === 3 && !/deep research/i.test(header.Depth)) findings.push("a third round runs only in a Deep Research council, but Depth says otherwise");
  }

  // Sources: each list entry carries a URL; an empty list must say so.
  const sources = blocks.get("Sources");
  if (sources !== undefined) {
    const entries = sources.split("\n").filter((l) => /^\s*([-*]|\d+\.)\s+/.test(l));
    if (!entries.length && !/no (verified )?sources|none verified|empty/i.test(sources)) {
      findings.push("«Sources» has no list entries and does not say why it is empty");
    }
    for (const e of entries) {
      if (!/https?:\/\/\S+/.test(e)) findings.push(`source without a URL: ${e.trim().slice(0, 100)}`);
    }
  }

  const out = { brief: join(dir, path.split("/").pop() ?? ""), round1, round2, round3, findings };
  if (json) console.log(JSON.stringify(out, null, 2));
  else if (!findings.length) console.log(`check-brief: clean — ${SECTIONS.length} sections, header filled, ${round1.length} round-1, ${round2.length} round-2 and ${round3.length} round-3 files`);
  else { console.log(`check-brief: ${findings.length} finding(s)`); for (const f of findings) console.log(`  - ${f}`); }
  process.exit(findings.length ? 1 : 0);
}

main();
