# home-it

**Home IT** skills for the `yystack` marketplace — practical playbooks for the tech in your
home.

## Skills

- **check-network** — diagnose home-network speed and DNS failures end-to-end. It has a DNS fast path
  for a hostname that fails only behind the router (system/router/public controls, negative-cache
  TTL, upstream/filter inspection and end-to-end verification), a performance path
  across ISP → router → Wi-Fi → client, a drop-out branch that proves or rules out router reboots, and
  a cellular (4G/LTE) WAN branch that grades the radio and the reconnect rate. Trigger on "DNS is broken", "site works on mobile data",
  "router returns NXDOMAIN", "make my Wi-Fi faster", "bufferbloat", «роутер не резолвить домен» or
  «інтернет повільний». Not for networks you don't administer or server-side app latency.
