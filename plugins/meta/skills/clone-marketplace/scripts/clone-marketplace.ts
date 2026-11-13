#!/usr/bin/env bun
/**
 * clone-marketplace.ts — bootstrap a NEW skills marketplace, or UPDATE an existing
 * one, from the canonical yystack structure + its meta plugin.
 *
 * It ALWAYS fetches the meta plugin and scaffold from the source repo on GitHub at
 * its LATEST commit (a shallow clone of the default branch) — never a local copy —
 * so a clone/update gets the current meta plugin.
 *
 * Usage:
 *   bun run clone-marketplace.ts --new    <target-dir> --name <marketplace-name> \
 *          [--display "<UI name>"] [--owner-name "<name>"] [--owner-email "<email>"] \
 *          [--source <git-url>]
 *   bun run clone-marketplace.ts --update <target-dir> [--source <git-url>]
 *   bun run clone-marketplace.ts --new ... --dry-run   # print actions, change nothing
 *
 * Manifests are built with JSON.stringify, so owner/display/description values with
 * quotes or other special characters are always valid JSON. Does NOT create the
 * GitHub repo or push — that stays a human step (auth, naming, visibility).
 */
import { execFileSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
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
    case '-h':
    case '--help':
      console.log(
        'Usage:\n' +
          '  clone-marketplace.ts --new <dir> --name <name> [--display] [--owner-name]\n' +
          '                       [--owner-email] [--source] [--dry-run]\n' +
          '  clone-marketplace.ts --update <dir> [--source]\n' +
          `\n--source defaults to ${DEFAULT_SOURCE} (the canonical meta plugin).`,
      );
      process.exit(0);
    default:
      die(`unknown argument: ${a}`);
  }
}

if (!mode) die('pass --new <dir> or --update <dir> (see --help)');
if (!target) die('missing target directory');

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
  } catch {
    die(`could not clone ${source} (check the URL / network)`);
  }
  if (!existsSync(join(upstream, 'plugins/meta'))) {
    die('upstream has no plugins/meta — is --source a marketplace repo?');
  }
  const upstreamManifest = JSON.parse(
    readFileSync(join(upstream, 'plugins/meta/.claude-plugin/plugin.json'), 'utf8'),
  );
  const upstreamVersion: string = upstreamManifest.version ?? 'unknown';
  const metaDescription: string = upstreamManifest.description ?? '';
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

  const renamedClaudeMd = (toName: string) =>
    // Retitle only the guide's heading: a blanket replace of the source name would also mangle
    // ordinary words when the source marketplace is named something common (e.g. "skills").
    readFileSync(join(upstream, 'CLAUDE.md'), 'utf8').replace(`# ${upstreamName} —`, `# ${toName} —`);

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
    if (!name) die('--new requires --name <marketplace-name> (kebab-case)');
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

    if (!dryRun) {
      writeFileSync(
        join(target, '.claude-plugin/marketplace.json'),
        `${JSON.stringify(
          {
            name,
            owner: { name: ownerName, email: ownerEmail },
            metadata: {
              description: 'A skills marketplace bootstrapped from yystack.',
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
      symlinkSync('CLAUDE.md', join(target, 'AGENTS.md'));
      writeFileSync(join(target, 'LICENSE'), mitLicense(new Date().getFullYear(), ownerName));
      writeFileSync(join(target, 'README.md'), starterReadme(name, ownerName, metaDescription, source));
      execFileSync('git', ['init', '-q'], { cwd: target });
      execFileSync('git', ['add', '-A'], { cwd: target });
    }

    say(`done. new marketplace scaffolded at ${target} (meta v${upstreamVersion}).`);
    say('next (human steps): create the GitHub repo, then push; add your own plugins with plugin-dev.');
  } else {
    if (!existsSync(target)) die(`target ${target} does not exist`);
    if (!existsSync(join(target, '.claude-plugin/marketplace.json'))) {
      die(`${target} is not a marketplace repo (no .claude-plugin/marketplace.json)`);
    }

    say(`updating meta plugin + structure in ${target} to upstream latest (meta v${upstreamVersion})`);
    run(`rm -rf ${target}/plugins/meta`, () =>
      rmSync(join(target, 'plugins/meta'), { recursive: true, force: true }),
    );
    run(`mkdir -p ${target}/plugins`, () => mkdirSync(join(target, 'plugins'), { recursive: true }));
    run(`cp -R plugins/meta → ${target}/plugins/meta`, () =>
      cpSync(join(upstream, 'plugins/meta'), join(target, 'plugins/meta'), { recursive: true }),
    );
    // The destination's own marketplace name — the target repo always has this manifest (checked
    // above), so it's readable on a dry-run too.
    const tgtName: string =
      JSON.parse(readFileSync(join(target, '.claude-plugin/marketplace.json'), 'utf8')).name ??
      'marketplace';
    run(`retarget meta health hook → ${tgtName}`, () =>
      retargetMetaHooks(join(target, 'plugins/meta'), tgtName),
    );

    if (!dryRun) {
      if (!existsSync(join(target, 'CLAUDE.md'))) {
        writeFileSync(join(target, 'CLAUDE.md'), renamedClaudeMd(tgtName));
        say('added CLAUDE.md (was missing)');
      }
      if (!existsSync(join(target, 'AGENTS.md'))) {
        symlinkSync('CLAUDE.md', join(target, 'AGENTS.md'));
        say('added AGENTS.md → CLAUDE.md symlink (was missing)');
      }
      // The refreshed plugin is only discoverable if `meta` is registered.
      if (!/"meta"/.test(readFileSync(join(target, '.claude-plugin/marketplace.json'), 'utf8'))) {
        say(
          "WARNING: 'meta' is not listed in .claude-plugin/marketplace.json — clients won't discover it. Add a meta plugin entry (see plugin-dev) and bump metadata.version before committing.",
        );
      }
      const codexMkt = join(target, '.agents/plugins/marketplace.json');
      if (existsSync(codexMkt) && !/"meta"/.test(readFileSync(codexMkt, 'utf8'))) {
        say(
          "WARNING: 'meta' is not listed in .agents/plugins/marketplace.json (Codex) — add its entry too (plugin-dev).",
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

function starterReadme(mp: string, owner: string, desc: string, src: string): string {
  return `# ${mp}

${owner}'s skills marketplace — an installable Claude Code / Codex plugin
marketplace, bootstrapped from [yystack](${src}).

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
