# home-it

**Home IT** skills for the `yystack` marketplace — practical playbooks for the tech in your
home.

## Skills

- **check-network** — diagnose home-network speed, DNS and drop-out failures end-to-end. It first classifies
  the symptom and picks a branch: when nothing loads, a down-right-now branch finds where the path
  stops (link, gateway, WAN, DNS, HTTPS); a DNS fast path
  for a hostname that fails only behind the router (system/router/public controls, negative-cache
  TTL, upstream/filter inspection and end-to-end verification), a performance path
  across ISP → router → Wi-Fi → client, or a drop-out branch that proves or rules out router reboots. On a
  cellular (4G/LTE) WAN, any of them adds a step that grades the radio and the reconnect rate. It ships two read-only
  Bun scripts: `dns-probe.ts` (a resolver series with pass counts) and `upnp-uptime.ts` (router uptime
  without the admin password). Trigger on "speeds are below my plan", "the internet is down",
  "DNS is broken", "site works on mobile data", "Wi-Fi drops every few hours", "bufferbloat",
  «інтернет повільний», «вай-фай відвалюється» or «інтернет не працює». Not for networks you don't administer or server-side app latency.
