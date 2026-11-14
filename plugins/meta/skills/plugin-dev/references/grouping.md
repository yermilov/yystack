# Where a skill belongs — the reasoning behind plugin-dev §8

Read this when a placement decision is genuinely contested — two plausible plugins, a split or merge
you are about to propose, a dependency that might run the wrong way — or when you must explain the
decision to someone. **The rulings live in plugin-dev §8 and only there**; this file is their why
and their examples, so when the two seem to disagree, §8 wins and this file needs fixing.

## Why "a plugin is the unit of an install decision"

Installers pick plugins, not skills. So the only question that matters for grouping is whether the
same user on the same host wants these skills together. Everything else in §8 is a proxy for that
question, for the cases where it is hard to answer directly.

## The three kinds, with examples

- **Domain** — money, home, health, one client's shop. The skills are *jobs done on* the object:
  "reconcile the bank statement", "book the boiler service".
- **Tool** — a browser, a messenger, an image generator, a cloud provider. The skills are *how to
  drive* it, and any domain may reuse them.
- **Platform** — the task system agents work from, the profile of facts about the user, the
  development process. It is neither a job nor an instrument, which is why *anything* may depend on
  it, tool plugins included ("report back through the task system", "read the profile first"). Its
  churn is paid by every other plugin, hence "keep it small and stable".

**Grouping by trigger** ("everything on a schedule") fails because the schedule says nothing about
who wants the skills: a nightly backup and a nightly news digest share a cron line and no user.

**A mixed skill** ("pay the bill through the bank's website") goes to the domain because the
install decision is about the bill, not the browser; the browser recipe stays reusable in the tool
plugin and is named, not copied.

## Why dependencies run one way

The point of a dependency is to stop copying one instrument recipe into several domains — so the
domain names the tool skill (`use the <skill> skill to sign in`) instead of repeating its steps.

- **Never tool → domain**: a tool that names its consumers must change whenever a consumer is added,
  which is exactly the coupling extraction was meant to remove. The same reasoning covers a shared
  service skill inside a domain (a ledger, a policy): it does not list its consumers; each consumer
  names it.
- **Tool → tool is fine** because both sides are reusable instruments (a browser recipe using a
  password-manager recipe).
- **Domain → domain is a smell** because two domains that keep calling each other are usually one
  domain, or share an instrument that wants extracting.
- **A routing pointer is not a dependency**: "Not for X — that's `<skill>`" only sends the
  agent elsewhere; nothing breaks if the target is absent, so it may point anywhere.
- **Declare real dependencies in the README** because no host enforces them today: a by-name skill
  reference is the whole mechanism, so the human installing needs to be told.

## Examples for the five decisions

1. **New skill, two candidates** — a "renew the car insurance" skill could sit in a browser plugin
   (it fills a web form) or a car plugin; the domain decides, so it goes to the car plugin and names
   the browser skill. Supporting signal: it shares credentials and references with its car-plugin
   neighbours.
2. **New plugin** — a skill for one paying client goes into its own plugin even alone: different
   audience, different install boundary. A one-off helper with no such boundary waits until 2–3
   skills of its domain exist. A tool other plugins depend on may stand alone from day one.
3. **Split** — a "home" plugin whose description has grown to "utilities, and the garden, and the
   network" with three clusters that never reference each other. Size alone (~12–15 skills) is a
   reason to *look* for such clusters, not to split.
4. **Move** — a skill whose cross-references and shared references mostly point into another
   plugin, whose triggers compete with that plugin's skills, or that landed where it is only because
   no better plugin existed at the time.
5. **Merge** — a single-channel publishing plugin that turned out to be one part of a broader
   personal-publishing domain: always installed together, one audience, one sentence, and the two
   reference each other.

## Privacy, and why it is a separate axis

In a private marketplace almost every plugin carries some personal context, so "this plugin holds
personal memory" singles out nothing and is no reason to merge. Split memory by scope instead: facts
about the user that no one domain owns live in one platform plugin (the profile); facts of a domain
live in that domain plugin beside the method that uses them, so a split-out domain takes its memory
with it. Privacy decides only the install boundary — what may be published.

**Why a private, single-user marketplace weakens the install test**: everything gets installed, so
"would every installer want this?" rarely says no. The other signals — one-sentence description,
reference clusters, dependency direction — carry the decision there.

Whichever you do, the mechanics are plugin-dev §6, and its version and README rules (§4, §7) apply
to every plugin touched.
