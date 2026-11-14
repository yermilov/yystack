# Scripts inside skills — the depth behind §5's bullet

> Reference for the `skill-authoring` skill. The **rulings** are inline in `SKILL.md` §5 — the
> language order, the line a script may not cross, and the rule that a documented command must reach
> a runnable form from what the agent already has. This file holds why each exists, what each cost
> when it was missing, and the recipes you copy. Read it before you add a `scripts/` file, or when
> one you own has started to grow.

## 1. Language: TypeScript + bun first, Python if you must, anything else exceptionally

**Write skill scripts in TypeScript and run them with bun.** Second choice is Python. Everything
else — bash included — is for exceptional cases you can name in a comment at the top of the file.

That order is not taste. It follows from what a skill script actually is: a file nobody imports,
that runs unattended, whose failures are read by a model rather than a human.

- **TypeScript + bun** — bun runs a `.ts` file directly, so there is no build step to go stale and
  no `node_modules` to ship inside a plugin. You get types (the errors a skill script actually hits
  — a field that is sometimes `null`, an upstream shape that changed — are exactly the ones a type
  catches), `tsc --noEmit` as a cheap gate, and a real test runner if the thing ever earns tests.
- **Python** — when the work needs a library that only exists there: image and PDF manipulation,
  scientific or numeric code, an SDK with no JS equivalent. A long Python script is not a smell if
  that is why it is Python.
- **Anything else** — say why, in the file. "It was quick to write" is not a reason.

### Why bash in particular keeps costing us

Bash is the tempting default for anything that shells out, and it is the worst of the three for a
file that reports to a model, because **its characteristic failures are silent successes** — the
script reports done, and the wrong answer travels. Each of these has been paid for at least once:

- **`set -e` plus a counting pipeline kills the script with no diagnostic.** `n=$(… | grep -c …)`
  exits the whole script when the count is zero, because `grep` returns 1 on no matches — and zero
  is the normal state early on. The symptom is the script vanishing with an empty log. The same trap
  applies to an unmatched glob or `ls` inside a command substitution.
- **A pipeline's exit status is its LAST command's.** `thing | tail -120` reports success over a
  `thing` that never ran. This one was learned **twice, independently, in two languages**, by two
  files that did not know about each other — the second time months after the first. That is the tax
  on a second implementation of the same integration, and it is the best argument in this file for
  §2 below.
- **An empty variable turns a filter into a shredder.** `grep -vF "$X"` with `X` unset matches every
  line, so `-v` discards all of them and the count comes back **zero** — indistinguishable from a
  clean run.
- **No types, no typecheck, no test runner.** Nothing tells you the shape you parsed is not the
  shape that arrived.

If bash is genuinely the right call: quote every expansion, guard every glob, count with `awk` or
`jq` rather than `grep -c`, never pipe a command whose exit status you care about, and make every
exit path — success, failure, `set -e` abort, INT/TERM — print exactly one terminal sentinel line
that a caller can poll for. A caller waiting only for a success marker waits forever on failure.

## 2. The line a script may not cross

§5 says `scripts/` is for "deterministic work where exactness matters". The failure mode is that
this reads as a description of *content*, when the thing that matters is *shape*.

**A skill script may be a pure transformation: inputs in, outputs out, finished when it returns.**
It may not own any of these three:

1. **A long-lived foreign process** it has to supervise.
2. **State that outlives one invocation** — a file it writes in order to read back on the next call.
3. **A retry loop** around something that fails intermittently.

Any one of the three means it is a program, and a program belongs in a real codebase, where it can
have types, tests and a review history.

**The line is not size, and getting that wrong is the common mistake.** Measured across one
marketplace (2026-08; a snapshot of that library, not a size limit): the largest script in it, at 865 lines, is in exactly the right place — a deterministic
converter, no state, nothing supervised. The one that had to be removed was **shorter**, at 473
lines, and it was the only script in the collection that supervised another process, kept state
between invocations *and* retried. All three at once.

So when deciding, do not ask how long the file is. Ask whether it **supervises, remembers, or
retries**. If your honest answer to any of those is yes, the file is in the wrong place, and every
month you leave it there it accretes another workaround that a type would have caught.

## 3. A documented command must reach a runnable form from what the agent already has

This is the rule whose absence is most expensive, and it is invisible while you write the skill,
because you test from the one directory where your command happens to work.

**Whatever the skill prints, an agent will run it in a shell whose working directory you do not
control** — pasting it unchanged if it looks complete. So the printed form must get to something
executable using only values the agent is holding. It may never depend on state that is simply not
there: a path relative to a repo root the agent is not standing in, or a variable nobody set. Those
two are the whole of the prohibition, and both failures below are instances of it.

What that cost, measured over eight days of session transcripts in one marketplace (to 2026-08-26,
one host; it counts sessions that hit the failure, not how often it happens elsewhere): **16 distinct
sessions** failed to find a script the skill documented as `scripts/<name>.sh`. That path reads as
repo-root-relative; the file actually lived several levels down, inside the skill. The agents ran it,
got `No such file or directory`, and silently fell back to a worse route — one of them ran a full
twelve-round loop on the fallback. The tool was installed and reachable the entire time. The door was
simply unlabelled.

**And the obvious fix is itself a trap.** A later edit replaced the bare path with
`"$SKILL_DIR/scripts/<name>.sh"`. **`SKILL_DIR` is not set in the agent's shell** — printing it
returns empty — so the documented command failed exactly as before, merely rooted at `/` instead of
at the repo. One wrong path had been swapped for another, and the swap looked like a fix.

In order of preference:

1. **Put the work behind a command that is already on `PATH`** — a subcommand of a CLI the user
   installs anyway. This makes the question disappear instead of answering it, and it is usually the
   same conclusion §2 pushes you to.
2. **Have the agent substitute the literal directory it loaded the skill from.** The agent knows
   that path — it just read the file. Write the placeholder explicitly, **label it as a placeholder**
   and say it must be replaced with the literal value, the way a one-shot output path is handled
   elsewhere. Quote it in the example, so a substituted path containing a space still runs. This
   works on every host — and note that it is not an exception to the rule above but the second half
   of it: what the rule forbids is depending on state that is not there, and a value the agent holds
   is not that.

⚠️ **Do not assume a plugin's `bin/` directory lands on `PATH`.** It is host-specific: one host adds
plugin `bin/` directories automatically, and another does not — measured 2026-08-26, where a Codex
session's `PATH` contained no plugin directories at all and a bundled plugin's own executable was
not resolvable by name. A launcher documented that way reproduces the exact "command not found" this
section exists to prevent, on half your hosts. If you use it, verify it **on each host** and
document the fallback.

Whichever you choose, **replace the old form — do not leave both.** A skill carrying two ways to
invoke the same thing forces the next agent to adjudicate, and the older, more-repeated form tends
to win.

## 4. Tests, and the honest reason they are rare here

§5 asks every non-trivial skill for "at least one validation mechanism". Read that precisely: it is
a check on the **skill's output**. It is not a test of the script.

A file under `skills/*/scripts/` usually has no test runner, no typecheck in CI, and no reviewer who
will notice it drifting. That is a real argument for keeping such scripts small and pure — and it is
§2 arriving from the other direction. When a script grows past what you would be comfortable
shipping untested, that is the signal to **move it**, not the signal to build a test harness beside
it.

⚠️ **If you do write tests, control the instrument before you trust it.** Scripts like these tend to
be checked by counting things — processes, matching files, lines of output — and counters fail in
the direction that reads as success:

- a `pgrep -f` pattern that also matches the test script running it, so the count is never zero;
- `ps -Ao comm=` truncating at 16 characters, so a long executable name never matches and every
  assertion passes against a constant zero;
- a sweep over local transcripts or logs that counts **the session running the sweep**, because its
  own output is being written into the thing it greps.

Before trusting any assertion built on a counter, prove the counter can move: create the thing and
assert it reads 1, remove it and assert it reads 0. An instrument that has not been shown to move is
not evidence, and a green suite built on one is not green.

Beware exact counts in prose, too. A hand-grep for `it(`/`test(` under a couple of directories
undercounted a real suite by a quarter, because it missed a directory and every parameterised case;
the number was wrong the day it was written. Quote a count only if you got it from the test runner,
and date it.

## 5. Errors are read by a model

§5's "verbose, LLM-readable errors" is the one part of the original bullet that needs no correction,
only emphasis. The reader of your failure message is an agent deciding what to do next, and it
cannot see your source.

- Say what was attempted, with the **resolved** values — not `failed to read config` but
  `failed to read config at /Users/…/x.json: ENOENT`.
- Say what would fix it when you know: name the command, the flag, the file.
- **Distinguish "this cannot work here" from "this did not work this time."** The first should stop
  the agent; the second should be retried. An agent that cannot tell them apart either gives up on a
  transient blip or loops forever on a permanent failure — and the second one is how a script with
  no terminal sentinel turns into a process that polls for hours after its work is over.
- Give the script `--help`, and keep it identical to what the skill documents.
- **Refuse arguments you did not parse.** Exit 2 with a one-line reason on an unknown flag, a flag
  missing its value, or the wrong number of positionals. A script that takes `argv[0]` as its input
  turns `--count 5 foo` into a search for `--count`, and the result looks like a real answer
  (measured 14.11.2026). Under `bun run`, a leading `--` right after the script name never reaches
  it, so do not offer `--` as the way to pass a value that starts with `--`: give that value a flag
  of its own.
