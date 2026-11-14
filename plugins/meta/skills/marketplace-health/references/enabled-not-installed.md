# A plugin that never appeared — the reads and the install (Claude Code)

Read this when a plugin "never appeared at all" (Step-0 item 4). The rulings — enabled is not
installed, `claude plugin list --json` is the authority, state changes only under the go-ahead rule —
are in `SKILL.md`; this file adds only the catalog read and the two-step fix.

**Does the catalog know it yet?** In the clone at `<installLocation>` (from
`~/.claude/plugins/known_marketplaces.json`), check that `.claude-plugin/marketplace.json` lists
`<plugin>`, and compare `git -C <installLocation> rev-parse HEAD` with
`git -C <installLocation> ls-remote origin HEAD`. Compare the catalog's `metadata.version` with the
remote's too: if the plugin list changed and that number did not, the client may not re-read the
catalog — an upstream defect for `plugin-dev`.

**The fix is two steps** — refreshing alone only makes the plugin visible:
1. `claude plugin marketplace update <name>`
2. `claude plugin install <plugin>@<marketplace> --scope <scope>`, where `<scope>` is exactly one of
   `project`, `user` or `local` — the one the plugin is enabled at. (An unquoted `a|b|c` in a real
   shell is a pipeline, not a choice.)

Verify with `claude plugin list --json`, and expect the skills to become invokable at the next
session start.
