# Library maintenance — the depth behind SKILL.md §8

> Reference for the `skill-authoring` skill. Every ruling is inline in SKILL.md §8; this file holds
> the mechanics: how a mandatory rule is audited and rolled out, and how a periodic review anchors on
> a commit. Read it when you add a rule every skill must follow, or when you open a library-wide
> review.

## 1. A mandatory rule needs an audit and a rollout

A rule you add to this guide binds only the skill you were editing unless the same change says **how
conformance is detected** and **who gets swept**.

- **A requirement that IS a string** (a block, a heading, a named section) gets a **fixed marker**,
  chosen when you write the rule: at most two forms, taken from what conforming skills already say.
  Pair it with the **inventory of skills the rule applies to**: the grep is a shortlist, the
  inventory is the verdict. The check ignores a marker inside code, or a skill that only quotes it
  passes (`scripts/audit-markers.ts` does this for this guide's markers). Repair later drift in the
  skills, never by widening the pattern. Why each of these, and the traps of a hand-run `grep -L`:
  `precedents.md` §9.
- **A requirement that is a PROPERTY** no string can express ("each item covers one
  independently-skippable thing", "the branch condition is in the body") has no marker, so say so and
  name the check that enforces it instead: a line in SKILL.md's pre-ship checklist, and a named check
  in whatever review the library runs. Inventing a marker for a property is worse than none: the
  grep passes while the property is absent.
- **Rollout is the second half, and the one that silently doesn't happen.** Enumerate every plugin,
  not the ones you happened to be editing; or, if that is a job of its own, file it as its own work
  item in the same change.

## 2. A periodic re-review anchors on a commit

Skills drift out of conformance as this guide changes (the Claude 5 reversals in SKILL.md §3
invalidated advice that was correct when written). So:

1. Run `scripts/audit-frontmatter.ts` and `scripts/audit-markers.ts` over the marketplace. No host
   command rightsizes prose for you (`precedents.md` §12); the rest is by hand.
2. **Record the commit this guide was at when each review ran**, and open the next review by diffing
   the endpoints: `git diff <sha>..HEAD -- <path/to/this/skill>`. Without it a reviewer applies the
   rules it already knew, and a skill written before a rule conforms to nothing — a skipped check no
   report can show.
3. Anchor on a SHA. Not `git log -p`, which replays rules later withdrawn; not a package version,
   which is not a revision (`--since=<version>` is silently read as a calendar date).
4. Then look for what no diff shows: a missing `Do not use for…` (SKILL.md §1), a ruling stranded in
   a reference (§2), rules contradicting a neighbouring skill or `CLAUDE.md` (§3).

**Auditing boundaries.** An over-cap description can fail loudly (Codex's validator rejects it); a
missing boundary fails silently, as a near-miss skill quietly winning the trigger. Count boundaries off the **parsed
description** (`scripts/audit-frontmatter.ts`), never a file grep: a `Do not use for…` in the BODY
reads as a boundary that isn't there, and real boundaries phrase themselves freely ("Do NOT use it
to…", "— that's `<sibling>`"), so any pattern is a shortlist and reading is the verdict (`precedents.md` §2).
