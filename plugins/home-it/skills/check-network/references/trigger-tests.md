# Trigger tests for `check-network`

> Reference for the `check-network` skill. Read it when you change this skill's `description`, and
> re-run the prompts below against the new text. The near-misses aim at what shares its words: office
> and VPN networks, server/app latency, general shopping questions and non-network "slow" complaints.

Run each prompt in a fresh session with the marketplace installed, and record whether this skill
loads. A prompt passes when the result matches the column it is in. Record each run below.

**Runs** (each prompt in a fresh `claude -p` with `--plugin-dir` on the working tree, shell and web
tools disallowed; "fired" = a Skill call naming exactly this skill. The first two rows used
`--max-turns 1`; the last used `--max-turns 2` with MCP servers cut off):

| Date | Host · model | Fired | Silent | Note |
| --- | --- | --- | --- | --- |
| 2026-11-14 | Claude Code · claude-fable-5-2 | 10/12 | 10/10 | the two purchase questions (mesh/extender, "is my router the bottleneck") were answered from general knowledge; the description then gained "BEFORE advising on buying…" |
| 2026-11-14 | Claude Code · claude-fable-5-2 | 12/12 | 10/10 | the description as shipped in 623f9e8 |
| 2026-11-14 | Claude Code · claude-fable-5-2 | 12/12 | 10/10 | opening trimmed to "…failures and fix them"; `--max-turns 2`, MCP cut off |
| 2026-11-14 | Claude Code · claude-fable-5-2 | 12/12 | 10/10 | "…fix them (with the owner's OK) or recommend the fix"; server-side latency → "the service's own monitoring" |

What these runs do not establish: Codex routing (not run), other models, or stability across
repeated runs of one prompt (each ran once).

## With-skill vs baseline (2026-11-14, Claude Code)

Two advice prompts, answered with no shell, once with the skill available and once with the Skill
tool disallowed:

- **"Should I buy a second Wi-Fi extender?"** Both said no. Baseline offered a mesh system as the
  second option; with the skill the answer led with the three-position measurement (desk / beside the
  router / wired) and mapped each outcome to a fix, wired backhaul first.
- **"NXDOMAIN at home only; I'll set the router's DNS to 8.8.8.8 now — good idea?"** Baseline said
  yes. With the skill: "not yet": compare system / router / public resolvers first, read a recovered
  answer as a stale negative cache, then if changing, record the old settings, one change, let the
  router settle, re-test as a series from a device really on the Wi-Fi.

Not established: full measurement runs (no commands were allowed), or any outcome on a real fault.

## Should fire

| Prompt | What it exercises |
| --- | --- |
| "my home Wi-Fi is way slower than the 500 Mbit plan I pay for" | below-plan speed |
| "video calls lag whenever someone is downloading at home" | bufferbloat without the word |
| "ping to my router loses 5% of packets" | packet loss |
| "the internet at home drops every few hours for a minute" | drop-outs |
| "I think my router reboots itself at night" | reboot suspicion |
| "my 4G router only works again after I unplug it" | cellular WAN |
| "github.com gives NXDOMAIN at home but works on mobile data" | the DNS fast path |
| "should I buy a mesh system or another extender?" | the purchase question |
| "is my Wi-Fi 5 router the bottleneck on a gigabit plan?" | router generation |
| «інтернет вдома повільний, що перевірити?» | a native-language phrasing |
| «вай-фай постійно відвалюється» | native-language drop-outs |
| "check my home network" | the bare ask |

## Should NOT fire

| Prompt | Why not — and what should fire instead |
| --- | --- |
| "the office VPN is slow today" | a network the user does not administer |
| "our API's p99 latency went up after the deploy" | server-side app latency |
| "Wi-Fi at the airport keeps asking me to log in" | a public network |
| "my laptop is slow when I open Chrome" | local performance, not the network |
| "set up a Kubernetes ingress with TLS" | infrastructure, not a home network |
| "what's the best laptop to buy under $1000?" | shopping, not networking |
| "configure DNS records for my domain at the registrar" | authoritative DNS hosting, not resolution at home |
| "write a script that pings a list of servers" | a coding task |
| "why is my phone's battery draining fast?" | a device question |
| "translate «роутер» into English" | the word only |

## What a failure means

- A should-fire prompt that does not fire: the user's words for that symptom are missing from the
  description. Add them as they were said, not as a synonym you prefer.
- A should-not prompt that fires: the boundary is missing or too narrow. Add the case to the
  description's `Not for…` clause.
