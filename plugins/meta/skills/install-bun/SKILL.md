---
name: install-bun
description: >-
  Install or upgrade the Bun runtime that this marketplace's Bun + TypeScript scripts and its
  session-start hook run on. Use when Bun is missing or too old: a session-start message says a check
  "runs on Bun, which isn't installed", a shell says `command not found: bun`, a script says it needs
  a newer Bun, or the user asks how to "install bun" or "get bun" on their OS, "set up bun",
  "upgrade bun" / «встанови bun». Do not use for installing Node, Deno or other runtimes, for
  a session-start warning about stale or missing plugins (marketplace-health), nor when a current Bun
  is installed and a Bun script or `bun install` fails for another reason — read that command's own
  error instead. Covers choosing the installer, the user's consent, verifying it and fixing PATH.
---

# install-bun — get the Bun runtime

Done means: a `bun` that prints its version, and the work that sent you here resumed. This
marketplace writes its executables in Bun + TypeScript, so without Bun its scripts and its
session-start check cannot run — which is also why this skill ships no script of its own: it has to
work before Bun exists. It is a short task skill, not a multi-step workflow, so it keeps no Step-0
todo list.

## 0. Is it already there?

"Not found" often means Bun is on disk and only missing from PATH: a shell started before the
install, or a host launched without the user's shell profile. Probe before offering anything:

```
"$HOME/.bun/bin/bun" --version                 # official installer, macOS / Linux / WSL
"$(brew --prefix)/bin/bun" --version           # Homebrew
"$(npm prefix -g)/bin/bun" --version           # npm, macOS / Linux / WSL
```

In a host started without the shell profile, `brew` and `npm` may be off PATH too; then the
`$(…)` in those two lines is empty, they test `/bin/bun` and prove nothing. Then also probe the
default Homebrew prefixes (`/opt/homebrew/bin/bun`, `/usr/local/bin/bun`,
`/home/linuxbrew/.linuxbrew/bin/bun`), and for npm the `bin` directory next to the user's `node`
(ask where it is when no `node` is on PATH either).

```
& "$env:USERPROFILE\.bun\bin\bun.exe" --version   # official installer, Windows PowerShell
& "$(npm prefix -g)\bun.cmd" --version            # npm, Windows PowerShell
```

Bun from a version manager is not in those places: where the user has one, also ask it
(`mise which bun`, `asdf which bun`, `scoop which bun`).

One that prints a version is a working Bun at that path → do not install. Use that path until the
session restarts, and go to §3 if its directory is not on PATH. A version older than a script needs →
the upgrade branch in §1. **More than one answers?** First resolve each path that answered
(`realpath <path>`; on Windows the path itself): Homebrew and npm can share one bin directory, so two
probes that land on the same target are one copy, not two. Still more than one? Scripts get the
one a bare `bun` resolves to (`command -v bun`; PowerShell: `(Get-Command bun).Source`), which need
not be the newest. Report each path and version, and either upgrade that one or ask the user which
should come first on PATH; never remove one without asking.

## 1. Pick the method — and who runs it

- **Never pipe the remote installer to a shell yourself.** `curl … | bash` and `irm … | iex` run an
  unpinned script straight from the web, so present that line and let the user run it.
- **A package manager you may run, once the user says yes, never with `sudo`.** It installs a
  published, versioned package (npm's postinstall fetches the binary of that exact version, not a
  script that can change).
- **What counts as yes:** a request that already asks you to install or upgrade ("install it for
  me", or the session-start nudge forwarded with "can you do that?") is that yes once you have
  named the exact command you will run. Anything vaguer: offer and wait.
- **It fails on file permissions** → offer the next option below. An automatic refusal by your own
  sandbox (no network, no global writes) is not that failure: ask the user to allow the command
  rather than dropping to another installer. A user who denies that approval has declined
  (see «The user declines?» below).

Choose in this order:

1. `brew` on PATH (macOS, Linux) → offer Homebrew.
2. Else `npm` on PATH (any OS) → offer npm, unless `npm prefix -g` sits under a Node version
   manager (nvm, fnm, volta): a global package there belongs to one Node version and disappears on
   a switch, so offer the official installer instead.
3. Else → present the official installer for the user's OS.

Installer URLs and the installer behaviour below verified 2026-11; if one fails, take the current
command from https://bun.com/docs/installation.

**macOS / Linux / WSL**

```
brew install oven-sh/bun/bun          # Homebrew
npm install -g bun                    # npm
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
§0 path that answered, or the bare-`bun` lookup from §0 — and resolve it
with `realpath <path>` (without `realpath`: `ls -l <path>` and read the link target). Homebrew and
npm can share one bin directory, so the resolved target, not the directory, decides. On Windows
there is no link to resolve: the path itself decides.

- under `.bun/bin` → `<that path> upgrade` (e.g. `"$HOME/.bun/bin/bun" upgrade`, which works off PATH)
- under a Homebrew `Cellar` → `brew upgrade <formula>`, naming the formula that is installed:
  `brew list --full-name --formula | grep -E '(^|/)bun$'` prints `bun` (Homebrew's own) or
  `oven-sh/bun/bun` (Bun's tap, as §1 installs it). Both live under `Cellar/bun`, so the path
  alone cannot tell them apart.
- under `node_modules/bun` (on Windows, a `bun.cmd`/`bun.ps1` shim in npm's global directory, `npm
  prefix -g`) → `npm install -g bun@latest`
- anything else (mise, asdf, a distro package, Scoop) → upgrade with the tool that owns that path;
  if that is unclear, tell the user where the binary is and ask. Never install a second Bun on top.

You may run that upgrade command yourself once the user says yes (it updates an installed,
versioned binary), never with `sudo`. As in the list above, a request that already asks you to
upgrade is that yes once you have named the exact command.

**The user declines?** Stop here and say what stays off. Declining an install: every Bun script is
unavailable, and the session-start message saying Bun isn't installed repeats each session. Declining
an upgrade: only the scripts that named a newer version fail; the rest keep working. Don't offer
again this session. If a skill sent you here, go back to its no-Bun fallback where it names
one.

## 2. Verify — with the absolute path first

Your own shell started before the install and keeps its old PATH, so a bare `bun --version` can say
"not found" after a successful install. Re-run the §0 probe line for the method used: it calls the
binary by its absolute path.

- **Installed:** a version printed there is the verdict. A bare `bun` "not found" beside it means
  only PATH is stale (§3). Do not reinstall.
- **Upgraded:** the upgraded absolute path must print at least the minimum the script asked for.
  That is the verdict. With no minimum named (the user just asked to upgrade), it must print a
  version newer than before, or the upgrade command must have said it is already the latest.
- **Bare `bun --version` still old after an upgrade:** either another copy comes earlier on PATH
  (§0, «More than one answers?»), or a version manager's shim is first and still selects an old
  version (`mise current bun`, `asdf current bun`); the user changes that selection, PATH order will
  not.

## 3. Fix PATH

- **Official installer, macOS / Linux / WSL:** it adds `export BUN_INSTALL=…` and
  `export PATH="$BUN_INSTALL/bin:$PATH"` to the profile of the user's `$SHELL` (`~/.zshrc`,
  `~/.bash_profile` or `~/.bashrc`; in fish's `config.fish`, the `set --export` equivalents), but
  only when that file already exists and is writable. Otherwise it prints the two lines and adds
  nothing. The user ran it, so check the profile yourself (`grep BUN_INSTALL <profile>`) or ask
  whether it printed them; if they are missing, ask the user to add them.
- **Windows:** the installer adds `%USERPROFILE%\.bun\bin` to the user PATH.
- **Homebrew / npm:** nothing to add while their bin directory is on PATH, which it normally is. If
  §0 found Bun there but a bare `bun` is not found in a new terminal, ask the user to add that
  directory to their shell profile — on Windows, to their user PATH (Settings → Environment
  Variables), which desktop-launched hosts also inherit.

If a skill sent you here, resume it now: where a bare `bun` is not found in your shell, call Bun by
the absolute path from §0 until the session restarts. When PATH changed (the official installer),
also ask the user to open a new terminal and, when convenient, restart the agent session from it.
The session-start check looks for `bun` on the PATH the host was started with. On macOS and Linux a
host launched from the desktop does not read the shell profile, so it can keep reporting Bun as
missing after a good install. Tell the user, and offer the ways out: start the host from a
terminal; or have the user link `bun` into a directory the desktop session's PATH already has (it
may need admin rights, so the user does it, not you); or accept that the note repeats while Bun
works from terminals.

## References

- `references/trigger-tests.md` — should-fire / should-not prompts and their run record; re-run them
  after any edit to the `description`.
