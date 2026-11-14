---
name: install-bun
description: >-
  Install or upgrade the Bun runtime that this marketplace's Bun + TypeScript scripts and its
  session-start hook run on. Use when Bun is missing or too old: a session-start message says a check
  "runs on Bun, which isn't installed", a shell says `command not found: bun`, a script says it needs
  a newer Bun, or the user asks how to "install bun" or "get bun" on their OS, "set up bun", "upgrade bun" /
  «встанови bun». Do
  not use for installing Node, Deno or other runtimes, nor when a current Bun is installed and a Bun
  script or `bun install` fails for another reason — read that command's own error instead. Covers
  choosing the installer, the user's consent, verifying it and fixing PATH.
---

# install-bun — get the Bun runtime

Done means: a `bun` that prints its version, and the work that sent you here resumed. This
marketplace writes its executables in Bun + TypeScript, so without Bun its scripts and its
session-start check cannot run.

## 0. Is it already there?

"Not found" often means Bun is on disk and only missing from PATH: a shell started before the
install, or a host launched without the user's shell profile. Probe before offering anything:

```
"$HOME/.bun/bin/bun" --version                 # official installer, macOS / Linux / WSL
"$(brew --prefix)/bin/bun" --version           # Homebrew
"$(npm prefix -g)/bin/bun" --version           # npm, macOS / Linux / WSL
```

```
& "$env:USERPROFILE\.bun\bin\bun.exe" --version   # official installer, Windows PowerShell
& "$(npm prefix -g)\bun.cmd" --version            # npm, Windows PowerShell
```

One that prints a version is a working Bun at that path → do not install. Use that path until the
session restarts, and go to §3 if its directory is not on PATH. A version older than a script needs → the
upgrade branch in §1.

## 1. Pick the method — and who runs it

**Never pipe the remote installer to a shell yourself.** `curl … | bash` and `irm … | iex` run an
unpinned script straight from the web, so present that line and let the user run it. A package
manager installs a published, versioned package instead (npm's postinstall fetches the binary of
that exact version, not a script that can change); you may run that command once the user
says yes, never with `sudo`. If it fails on permissions, offer the next option instead. Choose in
this order:

1. `brew` on PATH (macOS, Linux) → offer Homebrew.
2. Else `npm` on PATH (any OS) → offer npm.
3. Else → present the official installer for the user's OS.

Installer URLs and the installer behaviour below verified 2026-11; if one fails, take the current command from https://bun.com/docs/installation.

**macOS / Linux / WSL**

```
brew install oven-sh/bun/bun          # Homebrew
npm install -g bun                    # npm (runs a postinstall that fetches the platform binary)
curl -fsSL https://bun.com/install | bash   # official installer — the USER runs this
```

The official installer needs `unzip`; on a minimal Linux or WSL it stops with "unzip is required to
install bun". Tell the user to install `unzip` with their package manager first.

**Windows (PowerShell)**

```
npm install -g bun                                # npm
powershell -c "irm bun.com/install.ps1 | iex"     # official installer — the USER runs this
```

**Already installed but too old** (a script names a minimum version): take the Bun you found — the
§0 path that answered, or `command -v bun` (PowerShell: `(Get-Command bun).Source`) — and resolve it
with `realpath <path>` (without `realpath`: `ls -l <path>` and read the link target). Homebrew and
npm can share one bin directory, so the resolved target, not the directory, decides. On Windows
there is no link to resolve: the path itself decides.

- under `.bun/bin` → `<that path> upgrade` (e.g. `"$HOME/.bun/bin/bun" upgrade`, which works off PATH)
- under a Homebrew `Cellar` → `brew upgrade bun`
- under `node_modules/bun` (on Windows, a `bun.cmd`/`bun.ps1` shim in npm's global directory, `npm
  prefix -g`) → `npm install -g bun@latest`
- anything else (mise, asdf, a distro package, Scoop) → upgrade with the tool that owns that path;
  if that is unclear, tell the user where the binary is and ask. Never install a second Bun on top.

Run the upgrade after the user says yes, under §1's rule.

**The user declines?** Stop here and say what stays off. Declining an install: every Bun script is
unavailable, and the session-start message saying Bun isn't installed repeats each session. Declining
an upgrade: only the scripts that named a newer version fail; the rest keep working. Don't offer
again this session. If a skill sent you here, go back to its no-Bun fallback where it names
one.

## 2. Verify — with the absolute path first

Your own shell started before the install and keeps its old PATH, so a bare `bun --version` can say
"not found" after a successful install. Check the binary directly:

```
"$HOME/.bun/bin/bun" --version        # official installer, macOS / Linux / WSL
command -v bun && bun --version       # Homebrew or npm, macOS / Linux / WSL
```

```
& "$env:USERPROFILE\.bun\bin\bun.exe" --version   # official installer, Windows PowerShell
Get-Command bun; bun --version                    # npm, Windows PowerShell
```

A version printed here plus a bare `bun` "not found" means the install worked and only PATH is stale.
Do not reinstall.

## 3. Fix PATH

- **Official installer, macOS / Linux / WSL:** it adds `export BUN_INSTALL=…` and
  `export PATH="$BUN_INSTALL/bin:$PATH"` to the profile of the user's `$SHELL` (`~/.zshrc`,
  `~/.bash_profile` or `~/.bashrc`, fish's `config.fish`), but only when that file already exists
  and is writable. Otherwise it prints the two lines and adds nothing. The user ran it, so check the
  profile yourself (`grep BUN_INSTALL <profile>`) or ask whether it printed them; if they are
  missing, ask the user to add them.
- **Windows:** the installer adds `%USERPROFILE%\.bun\bin` to the user PATH.
- **Homebrew / npm:** nothing to add while their bin directory is on PATH, which it normally is. If
  §0 found Bun there but a bare `bun` is not found in a new terminal, ask the user to add that
  directory to their shell profile — on Windows, to their user PATH (Settings → Environment
  Variables), which desktop-launched hosts also inherit.

If a skill sent you here, resume it now: where a bare `bun` is not found in your shell, call Bun by
the absolute path from §2 until the session restarts. When PATH changed (the official installer),
also ask the user to open a new terminal and, when convenient, restart the agent session from it.
The session-start check looks for `bun` on the PATH the host was started with, so a host launched
from the desktop rather than a terminal may still miss it.

## References

- `references/trigger-tests.md` — should-fire / should-not prompts and their run record; re-run them
  after any edit to the `description`.
