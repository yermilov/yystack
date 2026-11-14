#!/usr/bin/env bun
/**
 * clone-marketplace.ts — bootstrap a NEW skills marketplace, or UPDATE an existing
 * one, from the source marketplace's structure + its meta plugin.
 *
 * It ALWAYS fetches the meta plugin and scaffold from the source repo at its LATEST commit
 * (a shallow clone of the default branch) — the canonical GitHub repo unless --source names
 * another git URL — never from a copy installed on this machine, so a clone/update gets the
 * current meta plugin.
 *
 * Usage:
 *   bun run clone-marketplace.ts --new    <target-dir> --name <marketplace-name> \
 *          [--display "<UI name>"] [--owner-name "<name>"] [--owner-email "<email>"] \
 *          [--source <git-url>]
 *   bun run clone-marketplace.ts --update <target-dir> [--source <git-url>] [--force]
 *   add --dry-run to either mode to print the actions and change nothing
 *
 * --update refuses (exit 1) when plugins/meta has uncommitted or ignored files, when the target is
 * not a git repo, or when the target IS the source marketplace; --force skips those three checks.
 *
 * Manifests are built with JSON.stringify, so owner/display/description values with
 * quotes or other special characters are always valid JSON. Does NOT create the
 * GitHub repo or push — that stays a human step (auth, naming, visibility).
 */
import { execFileSync } from 'node:child_process';
import {
  copyFileSync,
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
  constants as fsConstants,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const DEFAULT_SOURCE = 'https://github.com/yermilov/yystack';

function die(msg: string): never {
  console.error(`error: ${msg}`);
  process.exit(1);
}
function say(msg: string): void {
  console.log(`clone-marketplace: ${msg}`);
}

// --- args -------------------------------------------------------------------------
const argv = process.argv.slice(2);
let mode = '';
let target = '';
let name = '';
let display = '';
let ownerName = 'Your Name';
let ownerEmail = 'you@example.com';
let source = DEFAULT_SOURCE;
let dryRun = false;
let force = false;

for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  const next = () => argv[++i] ?? '';
  switch (a) {
    case '--new':
      mode = 'new';
      target = next();
      break;
    case '--update':
      mode = 'update';
      target = next();
      break;
    case '--name':
      name = next();
      break;
    case '--display':
      display = next();
      break;
    case '--owner-name':
      ownerName = next();
      break;
    case '--owner-email':
      ownerEmail = next();
      break;
    case '--source':
      source = next();
      break;
    case '--dry-run':
      dryRun = true;
      break;
    case '--force':
      force = true;
      break;
    case '-h':
    case '--help':
      console.log(
        'Usage:\n' +
          '  clone-marketplace.ts --new <dir> --name <kebab-name> [--display <ui name>]\n' +
          '                       [--owner-name <name>] [--owner-email <email>] [--source <git-url>] [--dry-run]\n' +
          '  clone-marketplace.ts --update <dir> [--source <git-url>] [--dry-run] [--force]\n' +
          '\n--dry-run prints every action and changes nothing.\n' +
          '--update refuses when plugins/meta has uncommitted or ignored files, when <dir> is not a git repo,\n' +
          '  or when <dir> is the source marketplace itself; --force skips those checks (local edits\n' +
          '  under plugins/meta are then lost).\n' +
          `\n--source defaults to ${DEFAULT_SOURCE} (the canonical meta plugin).`,
      );
      process.exit(0);
    default:
      die(`unknown argument: ${a}`);
  }
}

if (!mode) die('pass --new <dir> or --update <dir> (see --help)');
if (!target) die('missing target directory');
if (mode === 'new') {
  if (!name) die('--new requires --name <marketplace-name> (kebab-case)');
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) die(`--name must be kebab-case (got '${name}')`);
}

function run(desc: string, fn: () => void): void {
  if (dryRun) console.log(`  would: ${desc}`);
  else fn();
}

// --- fetch latest upstream (shallow clone of default branch) ----------------------
const tmp = mkdtempSync(join(tmpdir(), 'clone-mp-'));
// Remove the temp checkout on EVERY exit path. die() calls process.exit(), which skips any
// pending `finally` — so, exactly like the old shell `trap … EXIT`, a process 'exit' handler
// is what makes cleanup reliable on the git-clone / validation failure paths (the `finally`
// below then only matters for the normal-completion path).
process.on('exit', () => {
  try {
    rmSync(tmp, { recursive: true, force: true });
  } catch {
    /* best-effort: the OS clears its temp dir eventually */
  }
});
try {
  const upstream = join(tmp, 'src');
  say(`fetching latest meta plugin + structure from ${source}`);
  try {
    execFileSync('git', ['clone', '--depth', '1', source, upstream], { stdio: 'ignore' });
  } catch (e: any) {
    if (e?.code === 'ENOENT') die('git is not installed (or not on PATH) — install git, then rerun.');
    die(`could not clone ${source} (check the URL / network)`);
  }
  if (!existsSync(join(upstream, 'plugins/meta'))) {
    die('upstream has no plugins/meta — is --source a marketplace repo?');
  }
  const upstreamManifest = JSON.parse(
    readFileSync(join(upstream, 'plugins/meta/.claude-plugin/plugin.json'), 'utf8'),
  );
  const upstreamVersion: string = upstreamManifest.version ?? 'unknown';
  say(`upstream meta plugin version: ${upstreamVersion}`);

  // The source marketplace's own name (e.g. "yystack"), read from its manifest rather
  // than hard-coded — it's the token the copied meta's SessionStart health hook self-identifies
  // with, and what we retarget to the destination below.
  const upstreamName: string = (() => {
    try {
      return (
        JSON.parse(readFileSync(join(upstream, '.claude-plugin/marketplace.json'), 'utf8')).name ?? ''
      );
    } catch {
      return '';
    }
  })();

  const sourceLabel = upstreamName || source;
  // The meta entry's description, minus any "for the <source> marketplace" self-reference, so a
  // clone's manifests and README do not present it as the source marketplace.
  const metaDescription: string = String(upstreamManifest.description ?? '').replace(
    upstreamName ? ` for the ${upstreamName} marketplace` : /^$/,
    ' for a skills marketplace',
  );

  // The source's guide says the repo is the CANONICAL source of meta and invites edits under
  // plugins/meta. In a clone both are false — meta is vendored, and the next --update replaces it —
  // so that section is swapped for one that says so. Only the heading is retitled otherwise: a
  // blanket replace of the source name would mangle ordinary words (a source named "skills").
  const vendoredSection = (toName: string) => `## The \`meta\` plugin is vendored — do not edit it here

\`plugins/meta/\` is a copy of the meta plugin from ${source}. \`clone-marketplace --update\`
replaces that directory wholesale, so a local edit there is lost on the next update. To change a
meta skill, propose the change upstream, or put your own variant in a plugin of your own.
Everything else in ${toName} is yours.

`;
  const renamedClaudeMd = (toName: string): string => {
    let md = readFileSync(join(upstream, 'CLAUDE.md'), 'utf8').replace(
      `# ${upstreamName} —`,
      `# ${toName} —`,
    );
    const start = md.search(/^## This repo is the canonical source of the `meta` plugin.*$/m);
    if (start >= 0) {
      const rest = md.slice(start + 3);
      const nextHeading = rest.search(/^## /m);
      const end = nextHeading >= 0 ? start + 3 + nextHeading : md.length;
      md = md.slice(0, start) + vendoredSection(toName) + md.slice(end);
    } else {
      md = `${md.trimEnd()}\n\n${vendoredSection(toName)}`;
    }
    return md;
  };

  // Retarget the copied meta's SessionStart health hook to the DESTINATION marketplace, so it
  // watches the marketplace it's installed in — not the canonical source it was cloned from.
  // Rewrites ONLY the two self-identity tokens, never a blanket name-replace: a blanket replace
  // would corrupt hook internals if the SOURCE marketplace's name happened to be a substring of
  // them (e.g. a `--source` named "codex" would maul `codexSourceType` / `/.codex/`). Every other
  // mention of the source in meta — the --source URL, the plugin-dev/clone-marketplace doc
  // examples — legitimately points at the canonical upstream and is left untouched.
  const retargetMetaHooks = (metaDir: string, toName: string): void => {
    if (!upstreamName || upstreamName === toName) return;
    let changed = false;
    // .ts — the `const MARKETPLACE = '<name>';` self-identity assignment (matched structurally,
    // so it's robust to whatever the source name is).
    const tsHook = join(metaDir, 'hooks/scripts/marketplace-health-check.ts');
    if (existsSync(tsHook)) {
      const src = readFileSync(tsHook, 'utf8');
      const out = src.replace(/(const MARKETPLACE = ')[^']*(';)/, `$1${toName}$2`);
      if (out !== src) {
        writeFileSync(tsHook, out);
        changed = true;
      }
    }
    // .sh — only the `[<name>]` prefix in the Bun-missing nudge text.
    const shHook = join(metaDir, 'hooks/scripts/marketplace-health-check.sh');
    if (existsSync(shHook)) {
      const src = readFileSync(shHook, 'utf8');
      const out = src.replaceAll(`[${upstreamName}]`, `[${toName}]`);
      if (out !== src) {
        writeFileSync(shHook, out);
        changed = true;
      }
    }
    if (changed) say(`retargeted meta SessionStart health hook to '${toName}'`);
  };

  if (mode === 'new') {
    if (existsSync(target)) die(`target ${target} already exists — use --update for an existing repo`);
    if (!display) {
      display = name
        .split('-')
        .map((w) => (w ? w[0]!.toUpperCase() + w.slice(1) : w))
        .join(' ');
    }

    say(`scaffolding new marketplace '${name}' at ${target}`);
    run(`mkdir -p ${target}/{.claude-plugin,.agents/plugins,plugins}`, () => {
      mkdirSync(join(target, '.claude-plugin'), { recursive: true });
      mkdirSync(join(target, '.agents/plugins'), { recursive: true });
      mkdirSync(join(target, 'plugins'), { recursive: true });
    });
    run(`cp -R plugins/meta → ${target}/plugins/meta`, () =>
      cpSync(join(upstream, 'plugins/meta'), join(target, 'plugins/meta'), { recursive: true }),
    );
    run(`retarget meta health hook → ${name}`, () =>
      retargetMetaHooks(join(target, 'plugins/meta'), name),
    );

    if (ownerName === 'Your Name' || ownerEmail === 'you@example.com') {
      say('WARNING: owner name/email are placeholders — pass --owner-name / --owner-email, or fix LICENSE and .claude-plugin/marketplace.json before pushing.');
    }
    if (dryRun) {
      for (const f of ['.claude-plugin/marketplace.json', '.agents/plugins/marketplace.json', 'CLAUDE.md (meta section rewritten as vendored)', 'AGENTS.md → CLAUDE.md symlink', 'LICENSE (MIT)', 'README.md'])
        console.log(`  would: write ${f}`);
      console.log('  would: git init + git add -A');
    } else {
      writeFileSync(
        join(target, '.claude-plugin/marketplace.json'),
        `${JSON.stringify(
          {
            name,
            owner: { name: ownerName, email: ownerEmail },
            metadata: {
              description: `A skills marketplace bootstrapped from ${sourceLabel}.`,
              version: '0.1.0',
            },
            plugins: [{ name: 'meta', source: './plugins/meta', description: metaDescription }],
          },
          null,
          2,
        )}\n`,
      );
      writeFileSync(
        join(target, '.agents/plugins/marketplace.json'),
        `${JSON.stringify(
          {
            name,
            interface: { displayName: display },
            plugins: [
              {
                name: 'meta',
                source: { source: 'local', path: './plugins/meta' },
                policy: { installation: 'AVAILABLE', authentication: 'ON_INSTALL' },
                category: 'Productivity',
                description: metaDescription,
              },
            ],
          },
          null,
          2,
        )}\n`,
      );
      writeFileSync(join(target, 'CLAUDE.md'), renamedClaudeMd(name));
      linkAgentsMd(target);
      writeFileSync(join(target, 'LICENSE'), mitLicense(new Date().getFullYear(), ownerName));
      writeFileSync(
        join(target, 'README.md'),
        starterReadme(name, ownerName, metaDescription, sourceLabel, source),
      );
      execFileSync('git', ['init', '-q'], { cwd: target });
      execFileSync('git', ['add', '-A'], { cwd: target });
    }

    say(`done. new marketplace scaffolded at ${target} (meta v${upstreamVersion}).`);
    say('next (human steps): check LICENSE + manifest owner, commit, create the GitHub repo, push; add your own plugins with plugin-dev.');
  } else {
    if (!existsSync(target)) die(`target ${target} does not exist`);
    if (!existsSync(join(target, '.claude-plugin/marketplace.json'))) {
      die(`${target} is not a marketplace repo (no .claude-plugin/marketplace.json)`);
    }
    // The destination's own marketplace name — the target repo always has this manifest (checked
    // above), so it's readable on a dry-run too.
    const tgtName: string =
      JSON.parse(readFileSync(join(target, '.claude-plugin/marketplace.json'), 'utf8')).name ??
      'marketplace';
    // Guards: --update deletes plugins/meta, so refuse where that would lose work. --force skips.
    if (!force) {
      if (upstreamName && tgtName === upstreamName) {
        die(
          `${target} is named '${tgtName}', like the source marketplace — it looks like the source itself, which is edited directly, never updated from GitHub. (--force to override.)`,
        );
      }
      let porcelain = '';
      try {
        porcelain = execFileSync('git', ['status', '--porcelain', '--ignored', '--', 'plugins/meta'], {
          cwd: target,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore'],
        });
      } catch {
        die(`${target} is not a git repo, so local edits under plugins/meta cannot be checked. (--force to override.)`);
      }
      if (porcelain.trim()) {
        die(
          `plugins/meta has uncommitted or git-ignored files — --update would delete them. Commit, stash or move them first (--force to discard them):\n${porcelain.trimEnd()}`,
        );
      }
    }

    say(`updating meta plugin + structure in ${target} to upstream latest (meta v${upstreamVersion})`);
    run(`rm -rf ${target}/plugins/meta`, () =>
      rmSync(join(target, 'plugins/meta'), { recursive: true, force: true }),
    );
    run(`mkdir -p ${target}/plugins`, () => mkdirSync(join(target, 'plugins'), { recursive: true }));
    run(`cp -R plugins/meta → ${target}/plugins/meta`, () =>
      cpSync(join(upstream, 'plugins/meta'), join(target, 'plugins/meta'), { recursive: true }),
    );
    run(`retarget meta health hook → ${tgtName}`, () =>
      retargetMetaHooks(join(target, 'plugins/meta'), tgtName),
    );

    if (dryRun) {
      if (!present(join(target, 'CLAUDE.md'))) console.log('  would: add CLAUDE.md (missing)');
      if (!present(join(target, 'AGENTS.md'))) console.log('  would: add AGENTS.md → CLAUDE.md symlink (missing)');
    } else {
      if (!present(join(target, 'CLAUDE.md'))) {
        writeFileSync(join(target, 'CLAUDE.md'), renamedClaudeMd(tgtName));
        say('added CLAUDE.md (was missing)');
      }
      if (!present(join(target, 'AGENTS.md'))) {
        linkAgentsMd(target);
        say('added AGENTS.md → CLAUDE.md symlink (was missing)');
      }
    }
    // Read-only checks, so they run in --dry-run too: the preview shows them before anything changes.
    // The refreshed plugin is only discoverable if `meta` is registered.
    // Parsed, not grepped: a marketplace itself named "meta" must not pass for a registered plugin.
    if (metaEntryDescription(join(target, '.claude-plugin/marketplace.json')) === undefined) {
      say(
        "WARNING: 'meta' is not listed in .claude-plugin/marketplace.json — clients won't discover it. Add a meta plugin entry (see plugin-dev) and bump metadata.version before committing.",
      );
    }
    const codexMkt = join(target, '.agents/plugins/marketplace.json');
    if (existsSync(codexMkt) && metaEntryDescription(codexMkt) === undefined) {
      say(
        "WARNING: 'meta' is not listed in .agents/plugins/marketplace.json (Codex) — add its entry too (plugin-dev).",
      );
    }
    // The copied plugin may describe itself differently now; the manifests' meta entries and the
    // README row are the target's own files, so the script only says when they have drifted.
    for (const rel of ['.claude-plugin/marketplace.json', '.agents/plugins/marketplace.json']) {
      // metaDescription is exactly what --new writes into both entries, so a fresh scaffold is clean.
      const have = metaEntryDescription(join(target, rel));
      if (metaDescription && have !== undefined && have !== metaDescription) {
        say(
          `WARNING: the meta entry's description in ${rel} ${have === '' ? 'is missing' : 'differs from the refreshed meta plugin'} — set it to the text below (and update the README's meta row to match), then bump metadata.version (plugin-dev, Version discipline):\n  ${metaDescription}`,
        );
      }
    }

    say(`done. plugins/meta refreshed to v${upstreamVersion}.`);
    say(
      `review: git -C '${target}' status && git -C '${target}' diff — then commit (meta's version bump travels with the files).`,
    );
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

// The `description` of the `meta` entry in a marketplace manifest: '' when the entry has none,
// undefined when the file or the entry is missing or unreadable (the caller reports that as unlisted).
function metaEntryDescription(file: string): string | undefined {
  try {
    const m = JSON.parse(readFileSync(file, 'utf8'));
    const e = (m.plugins ?? []).find((p: any) => p?.name === 'meta');
    if (!e) return undefined;
    return typeof e.description === 'string' ? e.description : '';
  } catch {
    return undefined;
  }
}

// lstat, not existsSync: a dangling symlink "does not exist" to existsSync, and writing through
// it would create a file wherever it points — possibly outside the marketplace.
function present(p: string): boolean {
  try {
    lstatSync(p);
    return true;
  } catch {
    return false;
  }
}

// AGENTS.md is a symlink to CLAUDE.md so every host reads one guide. Where symlinks are not
// allowed (Windows without the privilege), write a copy instead and say so, rather than dying
// halfway through a scaffold.
function linkAgentsMd(dir: string): void {
  try {
    symlinkSync('CLAUDE.md', join(dir, 'AGENTS.md'));
  } catch (e) {
    // Fall back only when the platform refuses symlinks; anything else (EEXIST, …) is a real error.
    const code = (e as NodeJS.ErrnoException).code ?? '';
    if (!['EPERM', 'EACCES', 'ENOTSUP', 'ENOSYS'].includes(code)) throw e;
    copyFileSync(join(dir, 'CLAUDE.md'), join(dir, 'AGENTS.md'), fsConstants.COPYFILE_EXCL);
    say(
      'WARNING: could not create the AGENTS.md symlink here — wrote a copy of CLAUDE.md instead; keep the two in sync by hand.',
    );
  }
}

function mitLicense(year: number, holder: string): string {
  return `MIT License

Copyright (c) ${year} ${holder}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;
}

function starterReadme(mp: string, owner: string, desc: string, label: string, src: string): string {
  return `# ${mp}

${owner}'s skills marketplace — an installable Claude Code / Codex plugin
marketplace, bootstrapped from [${label}](${src}).

## Plugins

| Plugin | What it is |
| ------ | ---------- |
| **meta** | ${desc} |

## Install

**Claude Code:** \`/plugin marketplace add <owner>/${mp}\` then \`/plugin install meta@${mp}\`.
**Codex:** \`codex plugin marketplace add <owner>/${mp}\` then install \`meta\`.

(Replace \`<owner>/${mp}\` with your GitHub \`owner/repo\` once pushed.)
`;
}
