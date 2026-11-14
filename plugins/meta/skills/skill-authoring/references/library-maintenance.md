# Library maintenance — the depth behind SKILL.md §8

> Reference for the `skill-authoring` skill. The rulings an author needs while writing one skill
> are inline in SKILL.md; this file holds the library-wide ones and their mechanics: how a
> mandatory rule is audited and rolled out, how a periodic review anchors on a commit, and which
> skill to fix first. Read it when you add a rule every skill must follow, or when you open a
> library-wide review.

## 1. A mandatory rule needs an audit and a rollout

A rule you add to this guide binds only the skill you were editing unless the same change says **how
conformance is detected** and **who gets swept**.

- **A requirement that IS a string** (a block, a heading, a named section) gets a **fixed marker**,
  chosen when you write the rule: at most two forms, taken from what conforming skills already say.
  Pair it with the **inventory of skills the rule applies to**, covering every skill rather than
  the scan's output: the grep is a shortlist, the inventory is the verdict.
  The check ignores a marker inside code, or a skill that only quotes it passes
  (`scripts/audit-markers.ts` does this for this guide's markers).
  Repair later drift in the skills, never by widening the pattern.
  Hand-running `grep -L`? Read the file list it prints, never its exit status, which differs between
  grep implementations. Why each of these: `precedents.md` §9.
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

1. Run `scripts/audit-frontmatter.ts` and `scripts/audit-markers.ts` over the marketplace; the rest
   is by hand (step 4).
2. **Record the commit this guide was at when each review ran**, and open the next review by diffing
   the endpoints: `git diff <sha>..HEAD -- <path/to/this/skill>`. Without it a reviewer applies the
   rules it already knew, and a skill written before a rule conforms to nothing — a skipped check no
   report can show.
3. Anchor on a SHA. Not `git log -p`, which replays rules later withdrawn; not a package version,
   which is not a revision (`--since=<version>` is silently read as a calendar date).
4. Then look for what no diff shows: a missing `Do not use for…` (SKILL.md §1), a ruling stranded in
   a reference (§2), rules contradicting a neighbouring skill or `CLAUDE.md` (§3).
5. **Fix the boundary-less in order of cross-reference DIRECTION — the hub first.** The skill every
   sibling points *at* while pointing at nobody is both the likeliest gap (a hub reads as "obviously
   the main one") and the worst one (the classifier already defaults to it, and the hub is typically
   the skill that CHANGES STATE while its siblings only read). Worked case: `precedents.md` §1. No
   script ranks this yet; read which descriptions name which.

**Auditing boundaries** off the parsed description is SKILL.md §1's rule; the mechanics: a
`Do not use for…` in the BODY reads as a boundary that isn't there, and real boundaries phrase
themselves freely ("Do NOT use it to…", "— that's `<sibling>`"), so `audit-frontmatter.ts`'s pattern is
a shortlist and reading is the verdict (`precedents.md` §2).
