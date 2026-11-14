#!/usr/bin/env bun
/**
 * SessionStart marketplace-health check — the Bun + TypeScript half. The shell
 * wrapper (marketplace-health-check.sh) bootstraps this only when Bun is installed.
 *
 * Runs on Claude Code AND Codex. It emits ONE cross-host JSON object whose
 * `additionalContext` the model surfaces to the user — but ONLY when this
 * marketplace won't stay current on its own; otherwise it stays completely silent.
 * It must never break the session, so every read is guarded and any uncertainty
 * degrades to silence.
 */
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';

const MARKETPLACE = 'yystack';
const PLUGIN_ROOT = process.env.CLAUDE_PLUGIN_ROOT ?? process.env.PLUGIN_ROOT ?? '';

function emit(text: string): void {
  process.stdout.write(
    `${JSON.stringify({
      hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: text },
    })}\n`,
  );
}

// --- Installed version (this copy's own manifest) ---------------------------------
function readVersion(): string {
  for (const manifest of [
    `${PLUGIN_ROOT}/.claude-plugin/plugin.json`,
    `${PLUGIN_ROOT}/.codex-plugin/plugin.json`,
  ]) {
    if (!PLUGIN_ROOT || !existsSync(manifest)) continue;
    try {
      const v = JSON.parse(readFileSync(manifest, 'utf8')).version;
      return typeof v === 'string' ? v : 'unknown';
    } catch {
      return 'unknown';
    }
  }
  return 'unknown';
}

// --- Host detection from WHERE this copy lives (not the stdin payload, which is
// unreliable — Claude Code can also send permission_mode). Each host caches plugins
// under its own dir; honour a custom CODEX_HOME too. ------------------------------
function detectHost(): 'claude' | 'codex' | 'unknown' {
  if (PLUGIN_ROOT.includes('/.codex/')) return 'codex';
  if (PLUGIN_ROOT.includes('/.claude/')) return 'claude';
  const codexHome = process.env.CODEX_HOME;
  if (codexHome && PLUGIN_ROOT.startsWith(`${codexHome.replace(/\/$/, '')}/`)) return 'codex';
  return 'unknown';
}

// Read source_type of [marketplaces.<name>] from a Codex config.toml (regex, no TOML dep).
function codexSourceType(toml: string, name: string): string | null {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const header = new RegExp(`^\\s*\\[marketplaces\\.("?)${escaped}\\1\\]\\s*$`);
  let inSection = false;
  for (const line of toml.split('\n')) {
    if (/^\s*\[/.test(line)) {
      inSection = header.test(line);
    } else if (inSection) {
      const m = line.match(/source_type\s*=\s*"([^"]*)"/);
      if (m) return m[1] ?? null;
    }
  }
  return null;
}

type AutoUpdate = 'on' | 'off' | 'off_default' | 'unknown';

function autoUpdateState(host: 'claude' | 'codex' | 'unknown'): AutoUpdate {
  if (host === 'codex') {
    const cfg = `${process.env.CODEX_HOME ?? `${homedir()}/.codex`}/config.toml`;
    if (!existsSync(cfg)) return 'unknown';
    try {
      const src = codexSourceType(readFileSync(cfg, 'utf8'), MARKETPLACE);
      return src === 'git' ? 'on' : src === 'local' ? 'off' : 'unknown';
    } catch {
      return 'unknown';
    }
  }
  if (host === 'claude') {
    // DISABLE_AUTOUPDATER=1 globally kills ALL updates regardless of the per-marketplace
    // flag (FORCE_AUTOUPDATE_PLUGINS=1 keeps plugin updates on while pausing the rest).
    // Check it FIRST so an explicit autoUpdate:true can't mask a globally-disabled updater.
    if (process.env.DISABLE_AUTOUPDATER === '1' && process.env.FORCE_AUTOUPDATE_PLUGINS !== '1') {
      return 'off';
    }
    // The flag can be set in the settings scopes AND in the marketplace registry, which is where
    // the /plugin UI toggle stores it (observed on Claude Code 2.1.325, 2026-11). Which one wins is
    // not documented, so collect every explicit value and only nudge when none of them says on.
    const values: boolean[] = [];
    const read = (f: string, pick: (j: any) => unknown) => {
      if (!existsSync(f)) return;
      try {
        const v = pick(JSON.parse(readFileSync(f, 'utf8')));
        if (typeof v === 'boolean') values.push(v);
      } catch {
        /* ignore a malformed file */
      }
    };
    for (const f of ['.claude/settings.local.json', '.claude/settings.json', `${homedir()}/.claude/settings.json`]) {
      read(f, (j) => j?.extraKnownMarketplaces?.[MARKETPLACE]?.autoUpdate);
    }
    read(`${homedir()}/.claude/plugins/known_marketplaces.json`, (j) => j?.[MARKETPLACE]?.autoUpdate);
    if (values.length === 0) return 'off_default'; // third-party default when the key is absent everywhere
    if (values.every((v) => v === false)) return 'off';
    if (values.every((v) => v === true)) return 'on';
    return 'unknown'; // conflicting values: undetermined, so stay silent rather than guess
  }
  return 'unknown';
}

const version = readVersion();
const host = detectHost();
const autoupdate = autoUpdateState(host);

if (autoupdate === 'off' || autoupdate === 'off_default') {
  if (host === 'codex') {
    emit(
      `[${MARKETPLACE}] meta plugin v${version} is installed from a LOCAL (non-git) Codex marketplace, so Codex will not auto-update it ('codex plugin marketplace upgrade' only refreshes GIT marketplaces). If it is a snapshot of the Git repo, re-adding it from Git makes it self-update; if it is your own dev checkout, update it by hand. The enable-autoupdate skill covers both.`,
    );
  } else {
    emit(
      `[${MARKETPLACE}] meta plugin v${version} is installed, but auto-update is OFF for this marketplace (third-party marketplaces default to off), so it can go stale. Run the enable-autoupdate skill to turn it on.`,
    );
  }
}
// on | unknown → healthy or undetermined: say nothing.
