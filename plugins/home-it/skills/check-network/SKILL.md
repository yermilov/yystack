---
name: check-network
description: >-
  Diagnose home-network speed, DNS and drop-out failures and apply or recommend the
  highest-leverage fix. Use when Wi-Fi is slow, latency spikes or pings lose packets, the connection
  keeps dropping, the router seems to reboot itself, a 4G/LTE modem keeps disconnecting or only
  recovers after a power-cycle, a domain returns NXDOMAIN only at home, and BEFORE advising on buying
  an extender, mesh or new router or on whether the router is the bottleneck (measure first: the
  usual answer is a cable) — “speeds are below my plan”, “DNS is broken”, “site works on
  mobile data”, “Wi-Fi drops every few hours”, “bufferbloat”, «інтернет повільний», «вай-фай
  відвалюється», «роутер не резолвить домен». Not for public or office networks you don't
  administer (a slow work VPN included) — that's their admin's job — nor for server-side app latency.
---

# check-network — diagnose and fix a home network

A home-network failure is almost never one thing. First classify it: **performance** (slow, laggy),
**name resolution / reachability** (one host fails only at home), or **intermittent drop-outs**. For
an exact host that fails only at home, take the DNS fast path before running irrelevant speed tests.
For performance, work the four layers below and measure before recommending: the fix that feels
obvious (buy an extender) is usually the *worst* option. For drop-outs, prove or rule out router
reboots (§2a) before blaming the ISP. The goal is a verified repair, or a ranked recommendation
backed by measurements, not a shopping spree.

The four layers, outermost to innermost:

1. **ISP plan**: what you pay for (e.g. 1 Gbit). Rarely the bottleneck; check it, don't assume it.
2. **Router**: model, Wi-Fi generation, wired ports, and config (QoS, band steering, channel, mesh).
3. **Wi-Fi path**: distance, walls, interference, and any **wirelessly-backhauled** extender.
4. **Client**: the device's Wi-Fi radio, negotiated rate, drivers, adapter.

**Router changes are the owner's.** Reading is free; every write (DNS servers, QoS, a recovery probe,
any toggle) needs the owner's OK and goes in one at a time, re-measured before the next. This holds at
every step below that changes something, and those steps repeat it.

## Step 0 — register the run

**Create these TODO items before the first measurement, and while work remains keep exactly one in
progress.** Diagnosis skipped is diagnosis invented: a run that guessed at a fix without the
measurements reports the same shape as one that measured.

If a list is already in progress — this skill invoked from a larger workflow — add these items without
dropping the caller's, return the item that called you to pending until your last one is done, and where
the tool has dependency links mark it **blocked by** these and the caller's remaining items
**blocked by** it — an item-oriented tool appends at the tail, and position won't hold the order.

**Register them in this session's own todo/plan tool — if you don't see one, SEARCH for it before
concluding there is none**: on hosts with deferred tools it exists under a name you weren't looking
for, and anything that creates items and marks them in progress and completed IS it — an empty result
for one remembered name is evidence about the name, not about the host. Search by that capability,
then by any name you remember: two empty results are a real absence on this host — say so plainly, it
is not your mistake. It must be the SESSION's own planner, never an external tracker; your run
bookkeeping is not someone's backlog. If there genuinely is none, keep the list in your replies and
account for every item at the end — "I'll track it inline" with no stated list is precisely the
failure this block exists to prevent.

1. Classify the symptom as performance, DNS/reachability, or intermittent drop-outs
2. Ask the owner for an authenticated router session now, or record why no step will need the admin UI
3. Run the DNS fast path when a host fails to resolve (§ DNS fast path)
4. Measure where the problem is: Wi-Fi, at the affected spot (§1)
5. Measure next to the router: Wi-Fi (§1)
6. Measure wired into the router over Ethernet (§1). **It is its own item because it is the control,
   and the control is what gets skipped**; one "measure the baseline" item would hide that
7. Localize the bottleneck to a layer (§2)
8. On drop-outs: prove or rule out router reboots (§2a)
9. Inspect the router admin UI (§3)
10. On a cellular WAN: grade the radio signal and the reconnect rate (§3a)
11. Repair or recommend (§4)
12. Verify: re-measure at the affected spot and report before/after (§4)

Items 4–6 are one item per **position**, not per metric. Each closes naming the four measurements §1
asks for at that spot (throughput+bufferbloat · loss+latency · link quality/rate · client sanity), or
which one you skipped and why; "measured the desk" without that list is a row of the table you cannot
fill. On the DNS branch, close item 3 naming the system/router/public answers, the negative TTL, the
configured upstream/filter findings **with the pass count of each probe series**, the end-to-end
control on the affected device, and each per-device override restored and read back (or none set),
or which of those remained unreadable. Close item 7 naming which
layer each gap pointed at, and item 9 naming the router settings you actually read: an unenumerated
"looked at the router" hides the one setting that was the answer. Close item 8 naming the logging
span and host, the boots seen, which were confirmed from the client side, which were discarded as
handling, the load comparison, and whether the power test was proposed; a logger still running at the
end of the session closes as "logging since <time> on <host>, verdict pending". Close item 10 naming
the RSRP / RSRQ / SINR grade and the reconnects per hour.

**No access to the network at all** (a chat-only question such as "should I buy a mesh?", or you are
on another machine): the answer is the measurement plan (§1's three positions and what each outcome
means) plus the §4 ladder, and items 2–12 close with that reason.

A step a branch makes moot (no admin access to the router, no drop-outs reported, a wired WAN rather
than a cellular one, a DNS-only fault with no speed complaint) is completed with that reason, not
left open.

**Why ask for the router session at item 2:** read-only diagnosis and the login request are
independent, so the request goes out early and you keep measuring while it is answered. A run that
discovers the admin login only at §3 stops there and waits for an answer it could have had at the
start. The owner signs in; you never type, extract or store their router password.

## DNS fast path

Use this branch when one hostname returns `NXDOMAIN`, `SERVFAIL`, or times out at home while other
sites work. Do not infer "the router blocks the domain" from one cached answer.

`scripts/dns-probe.ts` runs the series below on any OS with Bun (`bun run "<skill dir>/scripts/dns-probe.ts"
<host> --server <gateway> --server 1.1.1.1 --server 8.8.8.8 --system --soa`). It prints a pass count,
the failure codes and their order, the answers with TTLs, and the negative-cache TTL bound; exit 1
means some probe failed. Without Bun, the OS tools are in `references/measurement-commands.md` § DNS
queries.

1. **Compare paths.** Query the exact hostname through the operating system's normal resolver, the
   LAN gateway explicitly, and two public recursive resolvers. Record status, answer, TTL and
   timestamp. The comparison separates client state from the router/upstream path.
2. **Read the negative-cache TTL.** Query the zone's SOA: the negative TTL is at most its minimum
   field, and exactly the SOA TTL in the authority section of an NXDOMAIN answer. If the
   router/public disagreement disappears within that window, report a stale negative answer as an
   **inference**, not a proven filter. A recovered cache is not evidence that a configuration write
   occurred.
3. **Localize.** If the gateway still fails while both public controls work, read the router UI for
   its WAN DNS servers, DNS proxy/cache, parental controls, security filtering and custom blocklists.
   Query each configured upstream directly: failing there localizes the defect upstream; passing there
   localizes it to the router/filter/cache. **Probe each upstream as a series of ~20 and report the
   pass count (`19/20`), never a single-probe verdict**: an intermittent upstream is exactly the fault
   one probe cannot see, in either direction (📖 `references/precedents.md`).
4. **Repair, one change.** Clear the client's cache first (the commands are in
   `references/measurement-commands.md`; some need the owner's admin rights). Clearing the
   **router's** cache often means a reboot that cuts every device. If the configured upstream is the
   defect, set a public resolver pair the owner agrees to. **Every router change here is a router
   write: owner's OK, one change, re-test before a second.** Let the router settle after the write, then re-test as a
   series. A failure in the first seconds is the router re-establishing its upstreams, not the change
   failing, so probe again before reverting.

   **If the fault has already stopped reproducing,** do not rewrite DNS blindly. The job changes from
   repair to **capturing the configuration** (WAN DNS servers, the WAN mode, filters, cache settings):
   that record is what makes the next occurrence diagnosable. On a static-IP WAN the DNS servers are
   typed values that persist across reboots; on DHCP they come with the lease and can change.
5. **Verify end to end.** Check both DNS and the real service from the affected client (for example,
   an HTTPS request to the hostname). Then prove the device is testing the path you fixed: its Wi-Fi
   address is in the router's LAN subnet, and its DNS server IS the gateway. A phone resolving over
   mobile data, or through a resolver it still has pinned, passes while proving nothing about the
   router. Only then remove temporary per-device DNS overrides and repeat the same controls on each
   device; a laptop passing does not prove a phone's override is gone.

   **Record an override's original mode when you set it, and read the restore back.** "Automatic" is
   a mode, not a blank, so restoring the wrong one leaves the workaround in place. The per-platform
   keys (Android Private DNS over ADB, iOS profiles, desktop adapters) are in
   `references/measurement-commands.md` § Reading back a per-device DNS override.

## 1. Measure the baseline

Run the four measurements in **three positions**, in this order: **where the problem is** (e.g. at the
desk), then **next to the router**, then, the control almost everyone skips, **wired into the router
over Ethernet**.

The wired run is not optional. Standing next to the router is *still Wi-Fi*, so those two positions
only tell you how much distance costs; neither can separate "the router or the line is slow" from
"Wi-Fi is slow". Only the cable can. **If wired is at or near plan speed, every remaining fix lives in
the Wi-Fi path**: no plan upgrade and no new modem will move it. **If wired is also slow, stop
diagnosing Wi-Fi**: go to §2's router bullet (the WAN/LAN port's negotiated speed and the cable) and
§3, because it is the router, the WAN link or the ISP, once the table's third row has ruled out
the test path.

The commands differ per OS (macOS / Windows / Linux), and each is in
`references/measurement-commands.md`. The four measurements are the same everywhere:

- **Throughput + bufferbloat.** What matters is whether latency **spikes under load**, not raw Mbps:
  a big idle-vs-loaded latency jump wrecks calls and browsing even when Mbps looks fine.
- **Packet loss & latency**, 100 pings each to the gateway and to a public IP. **Any loss to your own
  gateway is a Wi-Fi/local problem**, not the ISP.
- **Link quality.** On Wi-Fi: signal (RSSI better than −60 dBm is good, worse than −67 weak; on
  Windows's % scale >70% is good) and whether the negotiated rate sits far below the AP's max. A Wi-Fi
  6 client stuck at a low rate means distance or interference, not a dead plan. On the wired run:
  the Ethernet negotiated speed (read the link state first; the reference says how per OS). A link at
  100 Mbps instead of 1000 explains the whole result.
- **Client sanity.** Interface error counters, and no per-device throttle in the router app. Rule the
  device out before blaming it.

Record numbers for each spot. **The gaps between the three positions are the diagnosis**:

| Desk | Beside router | Wired | Bottleneck |
| --- | --- | --- | --- |
| slow | fast | fast | the **Wi-Fi path**: distance, walls, or a wireless-backhauled extender |
| slow | slow | fast | the **wireless segment**, but not yet *which end*: the AP (generation, channel, width, band steering) **or** the client's radio/driver/band choice. Compare the link quality and negotiated rate against another device on the same AP |
| slow | slow | slow | **not the Wi-Fi**, but confirm the test path before escalating (below) |

⚠️ **The third row is the one that misleads.** Before blaming the router, WAN link or ISP, rule out
the wired test path itself: the USB adapter or dock, the client's Ethernet port, and the patch cable.
A **USB 2.0** Ethernet adapter tops out around 300 Mbps, which on a gigabit plan alone reads as "wired
is also slow", so confirm the adapter and the port both negotiated 1 Gbps. Re-run from a **different machine with known-good wired hardware**, or into a different router port
with a different cable. Only a slow result that survives that is genuinely upstream.

## 2. Localize the bottleneck

- **ISP plan**: look up the subscribed tier in the provider's account portal; the owner signs in to
  it, as with the router. If already on the top residential tier, a plan upgrade won't help: say so
  and move inward. Don't recommend paying more before the internal path is fixed.
- **Router**: identify the model and its **Wi-Fi generation / max PHY rate**. A Wi-Fi 5 (AC1200,
  ~867 Mbps 5 GHz) router caps you well below a gigabit plan even in ideal conditions. Then check the
  **wired side**, which the Wi-Fi story hides: the **WAN/LAN port's negotiated speed** (the router's
  status page states it) and the **cable** on that run. **~94 Mbps of usable throughput is the
  signature of a link that negotiated 100BASE-TX instead of gigabit**: a Fast-Ethernet port, or a
  cable delivering only two usable pairs (damaged, miswired, or terminated for 100M). Cat5 itself is
  not automatically the culprit, since it carries 1000BASE-T when all four pairs are intact, so read
  the negotiated speed rather than inferring it from the printed category. From the client this
  looks exactly like a slow ISP, which is how people buy a faster plan that changes nothing.
- **Wi-Fi path**: the killer is a **wirelessly-backhauled extender/mesh node**. A dual-band extender
  serving the router on one link and the client on the other **roughly halves** throughput and adds
  latency. Find out if one is in the path (the router/mesh UI shows satellite nodes and their
  clients).
- **Client**: the negotiated rate and signal from §1 tell you whether the device is the limit.

## 2a. Drop-outs — prove whether the router reboots before theorising

A drop of ~60–90 s that every client sees at once is the signature of a router reboot, not of the
ISP. Prove it before blaming anyone. You can do it **without the admin password**, because most
consumer routers answer an unauthenticated UPnP query with their uptime:
`bun run "<skill dir>/scripts/upnp-uptime.ts"` prints the uptime, the boot time it implies, the WAN type
and the WAN byte counters (read-only; exit 1 means no gateway answered). Rulings:

- **Confirm each "reboot" from the client side** (Wi-Fi link down, a ping gap at that instant): the
  UPnP counter is the daemon's and can reset on a WAN reconnect without a reboot.
- **Log to a local file on a host that stays awake**, across the hours the owner reports drops; a
  sleeping laptop is a blind spot, not a quiet period.
- **Discard boots someone's hands caused** before reading the list, then rule out load, then propose
  the UPS power test, which the owner can run without any password.

Read `references/router-reboots.md` when you set up the logger or read its boot list. It has the
UPnP calls, their caveats, the logger, and the power test.

## 3. Inspect the router admin UI

Use the session the owner signed in to (a browser on the gateway address you read in §1, or the
vendor host printed on the router's label). Router admin access can re-route or capture every
device in the house, so it is theirs to grant: have them sign in and hand over the session, or read
the settings back to you. Never type their admin password yourself; the same holds for the ISP
portal in §2. Without a session, everything in this list can still be read back to you by the owner.

Read these (reads only; any change is a router write: owner's OK, one at a time, re-measured):

- **QoS / bandwidth control**: off, or not throttling the device? A stray cap here explains a lot.
- **Band steering / Smart Connect**: on by default; toggling rarely helps much, but it is worth an
  A/B.
- **Channel & width**: Auto is usually fine; a fixed clear channel occasionally helps in RF-dense
  areas, but test it, since it often makes no measurable difference.
- **Mesh / EasyMesh**: note every satellite node, its IP, how many clients hang off it, and **whether
  its backhaul is wireless or wired**. Wireless backhaul is the top suspect.
- **MTU / NAT boost / hardware acceleration**: MTU should be 1500 (unless PPPoE) and hardware
  acceleration on.

**Prefer the router's own API over clicking through the UI**: a log you can grep beats a screenshot.
Only with a session or token the owner hands you. Read `references/router-api-and-cellular.md` § Reading
the router's own API when the UI is backed by a JSON API.

## 3a. Cellular (4G/LTE) WAN — "only a reboot helps" is usually radio, not the router

Grade RSRP / RSRQ / SINR from the modem's status, then count reconnects in the log; several an hour on
bad SINR means the radio link is the cause. Fix placement first, then add an automatic recovery probe
(a ping-check that restarts the modem). **Configuring that probe is a router write: owner's OK, one
change, re-measure.** Never copy the modem's whole status object, because it carries the SIM's
identifiers. Read `references/router-api-and-cellular.md` § Cellular WAN for the grading table, how to
read the log, and the probe's firmware quirks.

## 4. Repair or recommend — the fix ladder, then verify

Rank fixes by leverage, not by novelty:

1. **Wired backhaul (almost always first).** Run an Ethernet cable (Cat5e/Cat6) from the router to
   the room and put the extender in **Access Point mode** on that cable (reconfiguring it drops its
   clients: owner's OK, as for a router write), or wire the client directly.
   It removes the halving wireless hop for the price of a cable, often with hardware already owned.
   Expected: near line-rate, single-digit-ms latency, 0% loss.
2. **Relocate / reposition.** Move the AP or the client to cut distance and walls; raise or reorient
   the AP. Free, and §1's measurements already told you how much it is worth.
3. **Band / channel tuning.** Prefer 5 GHz near the AP; try a clear channel in dense RF. Small wins.
   A router setting, so the owner's OK and one change at a time.
4. **Newer single router** (Wi-Fi 6/6E). A real but bounded upgrade, worth it only if wired backhaul
   isn't possible. How much it adds depends on the client's radio and the distance, so estimate it
   from the §1 table rather than quoting a generic figure.
5. **Second *wireless* extender: the last resort, usually a mistake.** It adds another halving hop
   and more latency. When asked "should I add another extender?", steer to wired backhaul first; only
   a **wired** or tri-band-dedicated-backhaul node is worth adding.

When hardware is needed, name the specific kind of cable, adapter or switch, give its price as an
estimate (or check a current local price; prices vary by country and month), give the expected before/after numbers, and confirm the person's appetite: many are
happy to stop at "good enough", and that is a valid place to stop.

**Verify (item 12).** After any change, re-run §1 at the affected spot (and the DNS series, on the DNS
branch) and report before/after numbers side by side. A fix you did not re-measure is a guess.

## A worked shape (generic)

A gigabit plan, a Wi-Fi 5 (AC1200) main router, and a **wirelessly-backhauled** Wi-Fi 6 extender near
the desk. Measurement shows low throughput, weak signal and packet loss at the desk but near-plan
speed beside the router and on the cable, so the extender's wireless hop is halving bandwidth. The
first fix is to **wire the extender's backhaul** (Access Point mode on an Ethernet run) or wire the
client, not to add a second wireless extender. Many extenders already have a gigabit port and AP
mode, so the fix often costs only a cable.

## Anti-patterns

- Recommending a plan upgrade or a new router **before** measuring the internal path.
- Blaming the ISP without the **wired** test: two Wi-Fi measurements cannot tell a slow line from a
  slow radio.
- Trusting a single speed-test number instead of comparing **idle vs loaded** latency, **desk vs
  router** position, and **packet loss to the gateway**.
- Adding a **wireless** extender/mesh node to "extend range"; it usually makes throughput worse.
- Changing several router settings at once instead of one, re-measured, kept or reverted.
- Declaring an intermittent DNS fault repaired, or an upstream healthy, on a **single** passing query.
- Removing a per-device DNS override before confirming the device is on the home network and using
  the gateway as its resolver.
- Treating "the symptom stopped reproducing" as "the symptom is fixed".

## Validation

`references/trigger-tests.md` holds the prompts that should and should not load this skill, and its
run record. Re-run them after any change to the description. The scripts print `--help` and exit 2 on
a usage error; check a script change with a positive control (a real gateway or a resolving host)
and a negative one (a 1 ms SSDP timeout, a non-routable resolver such as `192.0.2.1`).
