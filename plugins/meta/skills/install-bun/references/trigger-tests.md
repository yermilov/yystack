# Trigger tests for `install-bun`

> Reference for the `install-bun` skill. Read it when you change this skill's `description`, and
> re-run the prompts below against the new text. The near-misses aim at what shares its words:
> other runtimes (Node, Deno), a Bun that is installed but failing, Bun's own package manager, and
> the siblings `clone-marketplace` and `marketplace-health`.

Run each prompt in a fresh session that loads this skill from the working tree (see **How it was
run**), and record whether this skill loads. A prompt passes when the result matches the column it
is in. Record each run below.

**How it was run:** a fresh `claude -p` per prompt from an empty directory, `--plugin-dir` on the
working tree, `--max-turns 2`, MCP servers cut off, and writes/shell/web/subagents/workflows
disallowed. "Fired" = a `Skill` call naming exactly this skill. "Isolated" adds
`--setting-sources project`, so no other installed plugin competes for the prompt.

**Runs:**

| Date | Host · model | Description | Fired | Silent | Note |
| --- | --- | --- | --- | --- | --- |
| 2026-11-14 | Claude Code · claude-fable-5-2 | previous ("install bun" / "set up bun" / "upgrade bun") | 10/10 | 10/10 | full environment, all other plugins installed |
| 2026-11-14 | Claude Code · claude-fable-5-2 | same | 9/10 | 10/10 | isolated: "how do I get bun on Windows?" was answered from memory |
| 2026-11-14 | Claude Code · claude-fable-5-2 | + "how to install bun or get bun on their OS" | 10/10 | 10/10 | full environment |
| 2026-11-14 | Claude Code · claude-fable-5-2 | same | 10/10 | 10/10 | isolated |

What these runs do not establish: Codex routing (not run), other models, repeat stability, or
anything past the routing decision.

**With the skill vs without it** (2026-11-14, Claude Code · claude-fable-5-2, `--max-turns 4`, no shell,
once each; observed behaviour, not a score):

| Task prompt | Without the skill | With the skill |
| --- | --- | --- |
| Install Bun on a Linux box with no Homebrew and no Node | a correct curl install with `sudo apt-get` prerequisites and `exec $SHELL` | also says it will not pipe the installer itself; verifies with `"$HOME/.bun/bin/bun"`; says the profile is edited only when it exists |
| The curl installer finished but the agent's `bun --version` says not found — reinstall? | no; restart, check `~/.bun/bin/bun` | the same answer — the skill changed nothing here |

**With a shell present** (2026-11-14, same model, `--permission-mode default` so every shell call
waits on an approval nobody gives, "Bun isn't installed … Install it for me.", twice each): no run,
with or without the skill, tried `curl … | bash`. Bun was in fact installed on the test machine, so
three of the four runs found it and stopped; the one with-skill run whose probes were all refused
offered Homebrew, then npm, then the official installer for the user to run, and ran nothing.

Not established: the consent rule on a machine with no Bun where the agent's shell calls are
approved, Windows, and Codex.

## Should fire

| Prompt | What it exercises |
| --- | --- |
| "install bun" | the bare ask |
| "My session started with: [marketplace] the session-start check runs on Bun, which isn't installed. Run the install-bun skill to set it up. Can you do that?" | the hook's nudge |
| "I ran `bun run scripts/audit.ts` and got `zsh: command not found: bun`" | the shell error |
| "set up bun on my Mac so the marketplace scripts work" | "set up" |
| «встанови bun, будь ласка» | native-language phrasing |
| "The audit script says it needs Bun >= 1.3 and I'm on 1.1.30. Upgrade it for me." | too old |
| "how do I get bun on Windows?" | another OS |
| "upgrade bun to the latest version" | "upgrade" |
| "I'm on WSL Ubuntu and the bun installer says `unzip is required to install bun`" | installer prerequisite |
| "I installed bun with the curl script but `bun` still isn't found in this session" | PATH after install |

## Should NOT fire

| Prompt | Why not — and what should fire instead |
| --- | --- |
| "install node 22 on my mac" | another runtime |
| "how do I install Deno?" | another runtime |
| "`bun install` fails with `error: lockfile had changes, but lockfile is frozen`" | Bun works; read that error |
| "bun test crashes with a segfault in my project" | Bun works; a bug in a run |
| "add zod to this project with bun" | using Bun, not installing it |
| "what's the difference between bun and node?" | a comparison, no install |
| "bootstrap a new skills marketplace from the canonical one" | → `clone-marketplace` |
| "is my plugin marketplace up to date?" | → `marketplace-health` |
| "install the python dependencies from requirements.txt" | another toolchain |
| "uninstall bun from my machine" | removal, not install |
