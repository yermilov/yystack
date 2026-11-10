---
name: check-network
description: >-
  Diagnose home-network speed and DNS failures end-to-end and apply or recommend the
  highest-leverage fix. Use when Wi-Fi is slow, latency spikes, a domain returns NXDOMAIN only at
  home, public DNS works while the router fails, or the user asks about an extender / router / mesh
  — “speeds are below my plan”, “DNS is broken”, “site works on mobile data”, “bufferbloat”,
  «інтернет повільний», «роутер не резолвить домен», «помилка DNS». Measures the failing path,
  distinguishes router/cache/upstream/client causes, inspects the router UI, and verifies one change
  at a time. Not for public/office networks you don't administer or server-side app latency.
---

# check-network — diagnose and fix a home network

A home-network failure is almost never one thing. First classify it as **performance** or
**name-resolution/reachability**. For performance, work the four layers below and measure before
recommending — the fix that feels obvious (buy an extender) is usually the *worst* option. For an
exact host that fails only at home, take the DNS fast path before running irrelevant speed tests.
The goal is a verified repair or a ranked recommendation backed by measurements, not a shopping
spree.

The four layers, outermost to innermost:

1. **ISP plan** — what you pay for (e.g. 1 Gbit). Rarely the bottleneck; check it, don't assume it.
2. **Router** — model, Wi-Fi generation, and config (QoS, band steering, channel, mesh).
3. **Wi-Fi path** — distance, walls, interference, and any **wirelessly-backhauled** extender.
4. **Client** — the device's Wi-Fi radio, negotiated rate, drivers, adapter.

## Step 0 — register the run

**Create these TODO items before the first measurement, and while work remains keep exactly one in
progress.** Diagnosis skipped is diagnosis invented: a run that guessed at step 4 without step 2's
numbers reports the same shape as one that measured.

If a list is already in progress — this skill invoked from a larger workflow — add these items without
dropping the caller's, return the item that called you to pending until your last one is done, and where
the tool has dependency links mark it **blocked by** these and the caller's remaining items
**blocked by** it — an item-oriented tool appends at the tail, and position won't hold the order.

**Register them in this session's own todo/plan tool — if you don't see one, SEARCH for it before
concluding there is none**: on hosts with deferred tools it exists under a name you weren't looking
for, and anything that creates items and marks them in progress and completed IS it — an empty result
for one remembered name is evidence about the name, not about the host. Never an external tracker;
your run bookkeeping is not someone's backlog. If there genuinely is none, keep the list in your
replies and account for every item at the end — "I'll track it inline" with no stated list is
precisely the failure this block exists to prevent.

1. Classify the symptom as performance or DNS/reachability
2. Run the DNS fast path when a host fails to resolve (§ DNS-specific fast path)
3. Measure where the problem is — Wi-Fi, at the affected spot (§1)
4. Measure next to the router — Wi-Fi (§1)
5. Measure wired into the router over Ethernet (§1) — **its own item because it is the control, and
   the control is what gets skipped**; one "measure the baseline" item would hide that
6. Localize the bottleneck to a layer (§2)
7. Inspect the router admin UI (§3)
8. Diagnose, repair or recommend, then verify (§4)

Items 3–5 are one item per **position**, not per metric — but each closes naming the four
measurements §1 asks for at that spot (throughput+bufferbloat · loss+latency · link quality/rate ·
client sanity), or which one you skipped and why. "Measured the desk" without that list is a row of
the table you cannot fill. On the DNS branch, close item 2 naming system/router/public answers, the
negative TTL, configured upstream/filter findings **with the pass count of each probe series**, and
the end-to-end control on the affected device — or which remained unreadable. Close item 6 naming
which layer each gap pointed at, and item 7 naming the router settings you actually read; an
unenumerated "looked at the router" hides the one setting that was the answer.

A step a branch makes moot — no admin access to the router, say — is completed with that reason, not
left open.

## DNS-specific fast path

Use this branch when one hostname returns `NXDOMAIN`, `SERVFAIL`, or times out at home while other
sites work. Do not infer “the router blocks the domain” from one cached answer:

1. Query the exact hostname through the operating system's normal resolver, the LAN gateway
   explicitly, and two public recursive resolvers. Record status, answer chain, TTL and timestamp.
   The comparison separates client state from the router/upstream path.
2. Query the affected zone's SOA and read the negative-cache TTL from the authority response. If the
   router/public disagreement disappears within that window, report a stale negative answer as an
   **inference**, not a proven filter. Re-test the exact gateway path several times; a recovered cache
   is not evidence that a configuration write occurred.
3. If the gateway still fails while both public controls work, inspect the router UI for its WAN DNS
   servers, DNS proxy/cache, parental controls, security filtering and custom blocklists. Query each
   configured upstream directly when possible: failing there localizes the defect upstream; passing
   there localizes it to the router/filter/cache.

   ⚠️ **Probe each upstream as a SERIES, never once — an intermittent upstream is precisely what
   produces a fault nobody can reproduce.** Measured 2026-09-09: the first direct UDP query to the
   ISP's primary resolver timed out while its secondary and both public controls answered instantly;
   every later probe to that same primary succeeded. A single probe would have called that upstream
   dead, and a single probe a minute later would have called it healthy. Run ~20 queries per
   configured upstream and report the **pass count** (`19/20`) rather than a verdict. Note also what
   the WAN mode tells you: on a **Static IP** WAN the DNS servers are values somebody typed, not a
   DHCP lease — so they persist across reboots and are yours to read back after any change.
4. Change one thing only. Prefer clearing the bad cache first. If the configured upstream is the
   defect, set a known public resolver pair supported by the owner; do not rewrite DNS blindly after
   a transient answer has already recovered. Re-test before making a second change.

   ⚠️ **A failure in the first seconds after applying a router change is not the change failing.**
   Measured 2026-09-09: immediately after new WAN DNS servers were written, the router timed out once
   while it re-established its upstreams, then answered 20/20. Let the router settle, then re-test as
   a series — and if the very first probe fails, probe again before reverting. Reverting on that one
   answer is how a correct fix gets undone and the original fault gets re-reported as unsolvable.
5. Verify both DNS and the real service from the affected client (for example, an HTTPS request to
   the hostname). Only then remove temporary per-device DNS overrides and repeat the same controls on
   that device. A laptop passing does not prove a phone's override was actually removed.

   **Record an override's original value at the moment you set it, and read the restore back.**
   "Automatic" is a *mode*, not a blank, so restoring the wrong one leaves the workaround silently in
   place. On Android, Private DNS is two settings keys reachable over ADB — `private_dns_mode`
   (`off` / `opportunistic`, which is what the UI calls Automatic / `hostname`) and
   `private_dns_specifier` (the host, e.g. `dns.google`) — and restoring Automatic means
   `opportunistic` **with the specifier cleared**, confirmed by reading both keys afterwards rather
   than by trusting the write.

   ⚠️ **Then prove the device is testing the path you actually fixed.** A phone that resolved the
   hostname over **mobile data**, or through a resolver it still has pinned, passes this step while
   proving nothing about the router. Before believing the result, confirm the device holds a LAN
   address and that the resolver it is using is the gateway. Measured 2026-09-09, the two facts that
   made the check mean something: Wi-Fi address `192.168.0.104`, DNS server `192.168.0.1` — without
   them the `HTTP 200` that followed would have been an answer about somebody else's network.

Router credentials remain owner-controlled: use an already-authenticated session, or have the owner
sign in and hand it back. Never extract or type their router password yourself.

⚠️ **So ask for that session in the FIRST minutes of the run, not the last.** Read-only diagnosis and
the login request are independent, so send the request early and keep measuring while it is answered.
Measured 2026-09-09: a run worked the whole comparison above, reached step 3, found the admin page
asking for the router's local password — and ended there. The task sat `blocked` for **three hours**
waiting for a login that could have been requested at minute one, and the next run had to re-establish
the state the first had already measured.

## 1. Measure the baseline (from the affected device)

Run these in **three positions**, in this order: **where the problem is** (e.g. at the desk), then
**next to the router**, then — the control almost everyone skips — **wired into the router over
Ethernet**.

The wired run is not optional. Standing next to the router is *still Wi-Fi*, so those two positions
can only tell you how much distance costs you; neither can separate "the router or the line is slow"
from "Wi-Fi is slow". Only the cable can. **If wired is at/near plan speed, every remaining fix lives
inside the Wi-Fi path** — no plan upgrade and no new modem will move it. **If wired is also slow,
stop diagnosing Wi-Fi entirely**: it is the router, the WAN link, or the ISP, and steps 3–4 below are
the wrong ladder to climb.

⚠️ **Check the adapter before trusting a slow wired result.** Laptops without a built-in port need a
USB-C/Thunderbolt Ethernet adapter, and a **USB 2.0** one tops out around 300 Mbps — on a gigabit plan
that alone produces a "wired is also slow" reading and sends you chasing the ISP. Confirm the adapter
and the port both negotiate 1 Gbps before believing the third row of the table below.

The tools differ per OS but the four measurements are the same everywhere (macOS / Windows / Linux).
On the **wired** run, skip the *Wi-Fi* bullet — but do not skip the link rate: **read the Ethernet
negotiated speed.** *macOS:* `ifconfig <iface> | grep media` — the speed appears **in parentheses
only while a link is actually up** (`media: autoselect (1000baseT <full-duplex>)`); a bare
`media: autoselect` means nothing is plugged in, not that the command failed. *Windows:* the adapter
Status dialog → Speed, or `Get-NetAdapter | Format-Table Name,LinkSpeed`. *Linux:* `ethtool <iface>`
→ `Speed:`. A link that came up at 100 Mbps instead of 1000 explains the entire result and is the
first thing to rule out:

- **Throughput + bufferbloat.** What matters is whether latency **spikes under load** (bufferbloat),
  not just raw Mbps — a big idle-vs-loaded latency jump wrecks calls and browsing even when Mbps looks
  fine. *macOS:* `networkQuality -v` (reports Mbps + a "Responsiveness" score). *Windows / Linux* (no
  built-in equivalent): a browser test that reports **loaded** latency — `speed.cloudflare.com` or
  `waveform.com/bufferbloat` — or the cross-platform Ookla `speedtest` CLI for throughput.
- **Packet loss & latency.** *macOS / Linux:* `ping -c 100 <gateway>` and `ping -c 100 1.1.1.1`.
  *Windows:* `ping -n 100 <gateway>` and `ping -n 100 1.1.1.1`. (Gateway is usually
  `192.168.0.1`/`192.168.1.1` — find it with `ipconfig` on Windows, `ip route` / `netstat -nr`
  elsewhere.) **Any loss to your own gateway = a Wi-Fi/local problem**, not the ISP.
- **Wi-Fi link quality (signal + negotiated rate).** *Windows:* `netsh wlan show interfaces` → Signal
  (%), Receive/Transmit rate, Radio type, Channel. *macOS:* `system_profiler SPAirPortDataType` — its
  "Current Network Information" block gives PHY Mode, Channel, **Signal / Noise** in dBm and
  **Transmit Rate**, and needs **no sudo**, so prefer it. `wdutil info` reports the same but
  **requires `sudo`**: run bare it prints only a usage message, which reads like the tool is broken
  or missing. (Menu-bar gestures for this have changed across macOS releases; the commands haven't.)
  *Linux:* `iw dev <iface> link` or `nmcli dev wifi` → signal (dBm) + bitrate.
  Read the **signal** (RSSI better than −60 dBm good, worse than −67 weak; on Windows's % scale, >70%
  is good) and whether the **negotiated rate** sits far below the AP's max — a Wi-Fi 6 client stuck at
  an 802.11ac / low rate means distance or interference, not a dead plan.
- **Client sanity.** Interface error counters — *macOS / Linux:* `netstat -i` or `ip -s link`;
  *Windows:* `netstat -e` or PowerShell `Get-NetAdapterStatistics`. Confirm no per-device throttle in
  the router app. Rule the device out before blaming it.

Record numbers for each spot. **The gaps between the three positions are the diagnosis**, and each
gap points at a different layer:

| Desk | Beside router | Wired | Bottleneck |
| --- | --- | --- | --- |
| slow | fast | fast | the **Wi-Fi path** — distance, walls, or a wireless-backhauled extender |
| slow | slow | fast | the **wireless segment** — but not yet *which end*: could be the AP (generation, channel, width, band steering) **or** the client's own radio/driver/band choice. Step 1's signal + negotiated rate, compared against another device on the same AP, tells you which |
| slow | slow | slow | **not the Wi-Fi** — but confirm the test path before escalating (see below) |

The first row is the common one: low throughput with weak signal and some packet loss at the desk,
near-plan speed with strong signal and 0% loss beside the router.

⚠️ **The third row is the one that misleads.** Before blaming the router, WAN link or ISP, rule out
the wired test path itself — the USB adapter or dock, the client's Ethernet port, and the patch
cable are all in it. Re-run from a **different machine with known-good wired hardware**, or into a
different router port with a different cable. Only when the slow result survives that is it genuinely
upstream. Escalating to the ISP on an untested adapter is the expensive version of this mistake.

## 2. Localize the bottleneck

- **ISP plan** — look up the actual subscribed tier (the provider's account portal). If already on the
  top residential tier, a plan upgrade won't help; say so and move inward. Don't recommend paying more
  before the internal path is fixed.
- **Router** — identify the model and its **Wi-Fi generation / max PHY rate**. A Wi-Fi 5 (AC1200,
  ~867 Mbps 5 GHz) router caps you well below a gigabit plan even in ideal conditions. Then check the
  **wired side**, which the Wi-Fi story hides: the **WAN/LAN port's negotiated speed** (the router's
  status page states it) and the **cable** on that run. **~94 Mbps of usable throughput is the
  signature of a link that negotiated 100BASE-TX instead of gigabit** — caused by a Fast-Ethernet
  port, or by a cable delivering only two usable pairs (damaged, miswired, or terminated for 100M).
  Note that Cat5 itself is *not* automatically the culprit: it carries 1000BASE-T fine when all four
  pairs are intact — so read the **negotiated speed**, don't infer it from the cable's printed
  category. From the client this looks exactly like a slow ISP, which is how people end up buying a
  faster plan that changes nothing.
- **Wi-Fi path** — the killer is a **wirelessly-backhauled extender/mesh node**: a dual-band extender
  serving the router on one link and the client on the other **roughly halves** throughput and adds
  latency. Find out if one is in the path (router/mesh UI shows satellite nodes and their clients).
- **Client** — negotiated rate and signal from step 1 tell you if the device is the limit.

**"The Wi-Fi drops every so often" — prove whether the ROUTER reboots before theorising.** A drop of
~60–90 s that every client sees at once is the signature of a router reboot, not of the ISP. You can
prove it **without the admin password**: most consumer routers run miniupnpd, and UPnP answers an
unauthenticated LAN query. SSDP-discover `urn:schemas-upnp-org:service:WANIPConnection:1`, then
SOAP `GetStatusInfo` on its control URL → `NewUptime` (`now − uptime` dates the start). ⚠️ That is
the UPnP daemon's uptime, or the system's when miniupnpd runs with `system_uptime=yes` — a daemon
restart (some firmware restarts it on a WAN reconnect) resets it WITHOUT a reboot, so confirm each
drop with the clients losing the gateway around that instant (Wi-Fi link down, ping gap) before you
call it a reboot. Do not use the description's `UDN` as the router's identity either: an Archer AX23
v2 regenerated it on every boot (two boots on 04.10.2026, two different `uuid:`s), and its control
path is randomised per boot too — rediscover after any SOAP failure. `WANCommonInterfaceConfig` → `GetTotalBytesReceived`/`Sent` gives WAN
traffic, so you can see whether reboots follow load. The device description's `modelNumber` often
carries the firmware build. Log uptime every ~20 s plus a 1 Hz ping of the gateway and of a public IP
to a **local file** (an outage cannot stop a local log), and keep the logging host awake on power: a
sleeping laptop is a blind spot, never a quiet period — cross-check its sleep/wake log before reading
any gap. Run it across the time of day the owner reports the drops; a clean night proves nothing
about the evening.

Before you read the boot list, **drop the boots that someone's hands caused**: match each boot against
when the owner touched the kit, and use photo filenames for that (Pixel's `PXL_YYYYMMDD_HHMMSS` is UTC).
When the owner photographs the cabling, a boot can follow within minutes. Such a boot is **not**
evidence of a fault, but it does point at a loose power plug. Rule out
**load** by comparing WAN Mbit/s in the 5 min before each boot with the busiest windows that had no
boot. Then use the power test the owner can run without a password. Put the router (and the ONT,
if there is one) on a UPS or power station, and keep everything else unchanged. If the boots stop,
the cause is mains or the socket. If they continue, the router's own adapter or the router is at
fault. **The WAN type is in the UPnP description:** `WANIPConnection` means IPoE/DHCP and
`WANPPPConnection` means PPPoE. A factory reset of an IPoE router with a default SSID costs only the
Wi-Fi name and password. Find that out before you rule a reset out.

## 3. Inspect the router admin UI

Log into the router (browser, default `http://192.168.0.1` / `http://192.168.1.1`, or the vendor host
printed on the router's label). **Read-only first**; only change settings with the owner's OK, one at
a time, re-measuring after each.

**Do not type the owner's admin password yourself** — have them sign in and hand over the session, or
read the settings back to you. The same holds for the ISP account portal in step 2. Router admin
access can re-route or capture every device in the house, so it is theirs to grant, not yours to
take; an agent that stops here loses nothing, because everything below is read-only anyway. Check:

- **QoS / bandwidth control** — off, or not throttling the device? (A stray cap here explains a lot.)
- **Band steering / Smart Connect** — on by default; toggling rarely helps much, but worth an A/B.
- **Channel & width** — Auto is usually fine; a fixed clear channel occasionally helps in RF-dense
  areas, but test it — often it makes no measurable difference, so don't assume.
- **Mesh / EasyMesh** — note every satellite node, its IP, and how many clients hang off it, and
  **whether its backhaul is wireless or wired**. Wireless backhaul is the top suspect.
- **MTU / NAT boost / hardware accel** — confirm MTU 1500 (unless PPPoE) and HW acceleration on.

**Prefer the router's own API over clicking through the UI.** Many routers expose the
data the UI draws as JSON. One example is Keenetic's RCI. Its `/auth` answers 401 with a realm and a
challenge. The client logs in with `sha256(challenge + md5("login:realm:password"))` and keeps the
cookie. After that, `POST /rci/` takes `[{"show":{"log":{"max-lines":3000}}}]`, and
`show interface rrd` returns traffic history at several resolutions. A log you can grep beats any
screenshot. Two things to watch: the log's first lines can carry a pre-NTP date, and a log only goes
back to the last reboot.

**A cellular (4G/LTE) WAN — the symptom "only a reboot helps" is usually radio, not the router.**
Read the modem's signal fields from the interface status and grade them:

| metric | good | marginal | bad |
|---|---|---|---|
| RSRP | > −90 dBm | −90…−105 | < −105 |
| RSRQ | > −10 dB | −10…−15 | < −15 |
| SINR/CINR | > 10 dB | 0…10 | < 0 (noise louder than signal) |

Then count `connection lost` / `Internet access lost` lines in the log. Several reconnects an hour
on bad SINR means the radio link itself is the cause. Two fixes apply, in this order. First,
placement: higher up, at a window facing the tower, away from heaters (also check the modem
temperature). Second, an **automatic recovery probe**: a ping-check on the mobile interface that
restarts the modem after N failed probes. Without one, the router can sit "connected" with no
traffic until a human power-cycles it.

Reading such a router's API, a few things hold across models. Find the mobile interface by its
type, not by a guessed name, and read the ping-check (or "connection monitor") state from the
router itself rather than inferring it. In the log, look for the mobile interface's connection-state
transitions. A down→up pair while the modem device stays attached points to a reconnect. The
modem's own device detaching and re-attaching points to a restart, or to a crash, a power dip or a
loose connection. Treat each as a clue and correlate it: a detach that lines up with the probe's
fail counter reaching its limit is probably the probe acting; one with no such change is not. When you configure the probe, read the config back: on some firmware, setting a probe
host REPLACES the existing list rather than adding to it. After enabling a probe, watch the next few
minutes of the log and the probe state: some firmware restarts the modem once before the probe
settles. Call that a one-off only after the probe reports success and the connection holds. Finally, the modem's status payload usually
carries the SIM's IMSI/ICCID, the IMEI and the subscriber number. Copy only the signal fields you
need, and never forward or log the whole object.

## 4. Diagnose and recommend — the fix ladder

Rank fixes by leverage, not by novelty:

1. **Wired backhaul (almost always #1).** Run an Ethernet cable (Cat5e/Cat6) from the router to the
   room, and put the extender in **Access Point mode** on that cable — or wire the client directly.
   This removes the halving wireless hop for the price of a cable, usually with hardware already owned.
   Expected: near line-rate, single-digit-ms latency, 0% loss.
2. **Relocate / reposition.** Move the AP or the client to cut distance/walls; raise/reorient the AP.
   Free, and step 1's measurements already told you how much it's worth.
3. **Band / channel tuning.** Prefer 5 GHz near the AP; try a clear channel in dense RF. Small wins.
4. **Newer single router** (Wi-Fi 6/6E). A real but bounded upgrade (~+200–350 Mbps) — worth it only
   if wired backhaul isn't possible.
5. **Second *wireless* extender — the last resort, usually a mistake.** It adds another halving hop and
   more latency. When a user asks "should I add another extender?", steer them to wired backhaul first;
   only a **wired** or tri-band-dedicated-backhaul node is worth adding.

Then: name the specific cable/adapter/switch if hardware is needed (with a couple of price points),
give expected before/after numbers, and confirm the person's appetite — many will happily stop at
"good enough" rather than chase the theoretical maximum, and that's a valid place to stop.

## A worked shape (generic)

A common real-world case: a gigabit plan, a Wi-Fi 5 (AC1200) main router, and a **wirelessly-
backhauled** Wi-Fi 6 extender near the desk. Measurement shows low throughput + weak signal + packet
loss at the desk but near-plan speed beside the router → the extender's wireless hop is halving
bandwidth. The #1 fix is almost always to **wire the extender's backhaul** (put it in Access Point
mode on an Ethernet run) or wire the client directly — not to add a second wireless extender, which
ranks last. Many extenders already have a gigabit port + AP mode, so the fix often costs only a cable.

## Anti-patterns

- Recommending a plan upgrade or a new router **before** measuring the internal path.
- Blaming the ISP without ever running the **wired** test — two Wi-Fi measurements, however careful,
  cannot tell a slow line from a slow radio.
- Trusting a single speed-test number — always compare **idle vs loaded** latency and **desk vs
  router** location, and check **packet loss to the gateway**.
- Adding a **wireless** extender/mesh node to "extend range" — it usually makes throughput worse.
- Changing several router settings at once — change one, re-measure, keep or revert.
- Declaring an intermittent DNS fault repaired — or a configured upstream healthy — on a **single**
  passing query. Intermittency is the one failure mode a lone probe cannot see, in either direction.
- Removing a per-device DNS override without first confirming the device is on the home network and
  using the gateway as its resolver. A pass over mobile data is not a pass.
- Treating "the symptom stopped reproducing" as "the symptom is fixed". A recovered answer means the
  run's job has changed from repair to **capturing the configuration** — upstreams, filters, WAN mode
  — because that record is what makes the next occurrence diagnosable instead of a fresh mystery.
