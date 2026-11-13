---
name: install-bun
description: >-
  Install the Bun runtime that this marketplace's scripts (the meta plugin's SessionStart health hook,
  clone-marketplace, the audit and manifest checkers) run on. Use when Bun is missing: a session-start
  message says a check "runs on Bun, which isn't installed", a `bun` command fails with "command not
  found", or the user asks to "install bun" / "set up bun" / «встанови bun». Do not use for installing
  Node, Deno or other runtimes, nor when Bun IS installed and a Bun script fails for another reason —
  read that script's own error instead. Covers the official installer, Homebrew and npm, verifying it,
  and fixing PATH.
---

# install-bun — get the Bun runtime

Bun is a fast JavaScript/TypeScript runtime. This marketplace writes its executables in **Bun + TypeScript**
(see the repo `CLAUDE.md`), so without Bun the SessionStart health hook and `clone-marketplace` can't run.

**Never pipe the remote installer to a shell yourself** — it runs a downloaded script, so present the
`curl … | bash` / `irm … | iex` line and let the user run it. A package-manager install (`brew`,
`npm`) runs no remote script; you may run that one once the user says yes. Pick the line for their
setup (installer URLs verified as of 2026-11 — if one 404s, take the current command from bun.sh):

## macOS / Linux / WSL

```
# Official installer (adds ~/.bun/bin to PATH):
curl -fsSL https://bun.sh/install | bash

# …or Homebrew (macOS/Linux):
brew install oven-sh/bun/bun

# …or via npm, if Node is already present:
npm install -g bun
```

## Windows (PowerShell)

```
powershell -c "irm bun.sh/install.ps1 | iex"
```

## Verify + PATH

```
bun --version
```

If `bun` is "not found" right after installing, the shell hasn't picked up the new PATH yet:
- The `curl` installer adds `export PATH="$HOME/.bun/bin:$PATH"` to your shell profile (`~/.zshrc`,
  `~/.bashrc`). **Open a new terminal** or `source` that profile.
- Homebrew/npm put `bun` on the standard bin path — a new shell is usually enough.
- Windows: the installer adds `%USERPROFILE%\.bun\bin` to the user PATH — open a new terminal.

Once `bun --version` prints a version, re-open your agent session: the marketplace-health hook will
run automatically, and `clone-marketplace` / other Bun scripts will work.
