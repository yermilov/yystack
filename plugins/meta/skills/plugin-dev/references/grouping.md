# Where a skill belongs — the full reasoning behind plugin-dev §8

Read this when a placement decision is genuinely contested — two plausible plugins, a split or merge
you are about to propose, a dependency that might run the wrong way — or when you need to explain the
decision to someone. The rulings themselves are in plugin-dev §8; this file is their why.

plugin-dev §6 says *how* to add, split and move; this is *when*. The organising idea: **a
plugin is the unit of an install decision.** Skills live together when the same user on the same
host wants them together.

**Three kinds of plugin.** Name which kind a plugin is before deciding anything else:
- **Domain plugin** — grouped around a domain object the user cares about: money, home, health,
  a client's shop. Its skills are the *jobs* done on that object.
- **Tool plugin** — grouped around an instrument: a browser, a messenger, an image generator, a
  cloud provider. Its skills are *how to drive* that instrument, reusable by any domain.
- **Platform plugin** — the environment every skill runs inside: the task system the agents work
  from, the profile of facts about the user, the development process. It is neither a job nor an
  instrument, and *anything* may depend on it, tool plugins included ("report back through the
  task system", "read the user profile first"). Keep it small and stable in shape — every other
  plugin pays for its churn.

A plugin grouped by **how its skills are triggered** ("everything that runs on a schedule", "all
the recurring jobs") is none of the three; that is a sign to split it by domain (rule 3 below).

A skill that mixes both ("pay the bill through the bank's website") belongs to the **domain**; the
browser mechanics it needs belong in the tool plugin, referenced by name.

**Dependencies between plugins — allowed, in one direction.** To avoid repeating the same
instrument recipe in several domains, a domain plugin may **depend on** a tool plugin: its skill
names the tool skill (`use the <tool-plugin>:<skill> skill to sign in`) instead of copying the
steps. Rules:
- **Domain → tool, never tool → domain.** A tool plugin must not know which domains use it; if
  it starts naming them, the domain-specific part belongs back in the domain plugin. The same goes
  for a shared service skill inside a domain (a ledger, a policy): it does not keep a list of its
  consumers — each consumer names it.
- **Anyone → platform.** Domain and tool plugins alike may depend on a platform plugin; a
  platform plugin depends on nothing but other platform plugins.
- **A routing pointer is not a dependency.** "Not for X — that's `<other-plugin>:<skill>`" in a
  description or a *Do not use* line only sends the agent elsewhere; it is allowed in any
  direction. A dependency is a skill that *uses* another skill's method to do its job.
- **Tool → tool is fine; domain → domain is a smell.** Two domains that keep calling each other
  are either one domain (merge) or share an instrument that should be extracted into a tool plugin.
- **No cycles.**
- **Declare it.** Today a dependency is a by-name skill reference, not a manifest field the host
  enforces — so say it in the dependent plugin's README ("Requires: `<tool-plugin>`") and keep
  the depended-on plugin in the same marketplace.

**1. Which existing plugin does a new skill go into?** The one whose one-sentence job already
covers it *without widening that sentence*. Test: would everyone who installs that plugin want
this skill? With two candidates, the **domain** decides, not the instrument. Supporting signal:
the skill shares references, scripts, an MCP server or credentials with its would-be neighbours.

**2. When to create a new plugin.** The skill fits no plugin's job without blurring its
description ("…and also X"), **or** it has a different *install boundary*: a different audience
(a separate client), different privacy (public vs private), a single OS or host (a hook-only
plugin), or heavy dependencies. A one-skill plugin is justified only by such a boundary or by
being a tool plugin others depend on; otherwise wait for 2–3 skills of the new domain.

**3. When to split a plugin.** Its description no longer fits one sentence without "and… and…";
its skills fall into clusters that never reference each other; someone wants only part of it; or
a reusable instrument recipe has grown inside a domain plugin (extract it as a tool plugin and
depend on it). Size alone (more than ~12–15 skills) is a reason to *look* for clusters, not a
reason to split.

**4. When to move a skill.** Most of its cross-references and shared references point into
another plugin; its triggers compete with skills in another plugin; it is a tool recipe sitting
in a domain plugin (or the reverse); or it landed where it is only because there was no better
place at the time.

**5. When to merge two plugins.** They are always installed together, have the same audience,
one sentence describes both, and they reference each other — e.g. a single-channel plugin that
turned out to be one part of a broader personal-publishing domain.

**Privacy is a separate axis — where a plugin may live, not which plugin a skill joins.** In a
private marketplace almost every plugin carries some personal context (names, accounts,
addresses), so "this plugin holds the user's personal memory" does not single out a plugin type
and is not a reason to merge. Split the memory by scope instead: facts about the user that no one
domain owns live in **one platform plugin** (the user profile); facts of a domain live in that
**domain plugin, beside the method that uses them** — so when a domain is split out, its memory
moves with it. What privacy DOES decide is the install boundary of rule 2: a skill carrying
personal data never joins a public plugin or marketplace — strip it to the reusable pattern first,
or give it a private plugin of its own. Inside one private marketplace, where every plugin is
already private, privacy draws no further line.

**A private, single-user marketplace weakens the install-decision argument** — everything gets
installed, so "would everyone who installs it want this skill?" rarely says no. There, decide by
the other signals above: whether the plugin's description still fits one sentence, whether its
skills form clusters that reference each other, and which direction the dependencies run.

Whichever you do, the mechanics are plugin-dev §6, and its version and README rules (§4, §7)
apply to every plugin touched.

