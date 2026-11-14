# A plugin that never appeared — the reads and the install (Claude Code)

Read this when a plugin "never appeared at all" (Step-0 item 4). The ruling — enabled is not
installed, the registry is the authority, state changes only under the go-ahead rule — is in
`SKILL.md`; this file is the procedure.

**Why it happens.** The catalog clone under `~/.claude/plugins/marketplaces/<name>/` is a git
checkout that lags the push. Until it is re-pulled, the catalog has no such plugin and there is
nothing to install, whatever `enabledPlugins` says.

**Read 1 — is it installed?** `claude plugin list --json`, looking for `<plugin>@<marketplace>`.
That registry is the authority. A cache directory can linger from an uninstalled or superseded copy
(`.orphaned_at` marker files sit inside retained version directories), so `ls` gives false positives.

**Read 2 — does the catalog know it yet?** Check that the clone's `.claude-plugin/marketplace.json`
lists `<plugin>`, and compare `git -C ~/.claude/plugins/marketplaces/<name> rev-parse HEAD` with
`git ls-remote origin HEAD` from the same directory. Also compare the catalog's `metadata.version` with the remote's: if the plugin list
changed and that number did not, the client may not re-read the catalog.

**The fix is two steps** — refreshing alone only makes the plugin visible:
1. `claude plugin marketplace update <name>`
2. `claude plugin install <plugin>@<marketplace> --scope <scope>`, where `<scope>` is exactly one of
   `project`, `user` or `local` — the one the plugin is enabled at. (An unquoted `a|b|c` in a real
   shell is a pipeline, not a choice.)

Verify with `claude plugin list --json`, and expect the skills to become invokable at the next
session start.
