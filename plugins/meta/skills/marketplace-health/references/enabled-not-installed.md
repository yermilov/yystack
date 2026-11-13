# Enabled is not installed — the depth behind the ruling in marketplace-health

Read this when a plugin "never appeared at all" (todo item 5), before you run the two reads.

**⚠️ ENABLED IS NOT INSTALLED — the trap that makes a brand-new plugin's
cross-references inert.** `enabledPlugins: {"<plugin>@<marketplace>": true}` in
a `settings.json` records an *intent*; the plugin is only usable once
`~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/` actually exists. A
plugin created today fails that on day one, and not because of a version pin:
the marketplace **clone** under `~/.claude/plugins/marketplaces/<name>/` is a
git checkout that lags the push, so until it is re-pulled the catalog has no
such plugin and there is nothing to cache. Observed: a plugin pushed and enabled
the same day, with the clone still sitting a day behind at an older commit — the
settings file said `true`, the cache directory did not exist, and a routing table
added to a *different* skill that same day pointed at skills nobody could invoke.
Diagnose with two reads. **The authority is the installed-plugin registry, not the
cache directory** — `claude plugin list --json` (or
`~/.claude/plugins/installed_plugins.json`); a cache directory can linger from an
uninstalled or superseded copy, so `ls` alone gives false positives (verified:
`.orphaned_at` marker files sit inside retained version directories, and a folded-away
plugin still had a cache dir with zero registry entries). Second read: compare
`git -C ~/.claude/plugins/marketplaces/<name> log --oneline -1` against the commit
that added the plugin, to see whether the catalog even knows about it yet.

**The fix is TWO steps, and refreshing alone is not enough** — both are
**state-changing, so report the diagnosis and get the go-ahead first** (§ When to
act); do not install off the back of a "why is it missing?" question. Re-pull the
catalog (`claude plugin marketplace update <name>`, or `git pull --ff-only` on
the clone — what the auto-updater does anyway), *then* actually install it:
`claude plugin install <plugin>@<marketplace> --scope <scope>`, where `<scope>` is exactly one of
`project`, `user` or `local` (pick the one the plugin is enabled at — an unquoted `a|b|c` in a real
shell is a pipeline, not a choice).
The refresh only makes the plugin *visible* in the catalog; the install is what
populates `~/.claude/plugins/cache/…` and the installed-plugin registry. Verify
with `claude plugin list --json` (the registry, not an `ls`), and expect the skills
to become invokable on the next session start. (For authors: the same day's lesson is that a routing rule pointing at a just-shipped plugin
needs a capability gate and a named fallback — that rule lives in `plugin-dev` §4.)

