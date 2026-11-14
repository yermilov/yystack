# Precedents — the measured cases behind check-network's rulings

Read this when a ruling in SKILL.md looks too strict and you want to know what it guards against. You
never need it to know what to do. Each entry is the generic shape of a real case, with the
identifying details removed.

## An intermittent upstream resolver (DNS fast path, step 3)

The first direct UDP query to an ISP's primary resolver timed out. Its secondary and both public
controls answered at once, and every later probe to the same primary succeeded. A single probe would
have called that upstream dead; a single probe a minute later would have called it healthy. Only a
series with a pass count (`19/20`) describes it truthfully. That is why the step asks for ~20 probes
per upstream and a count instead of a verdict.

## The first probe after a router write (DNS fast path, step 4)

Right after new WAN DNS servers were written, the router timed out once while it re-established its
upstreams, and then answered 20/20. Reverting on that first answer would have undone a correct fix
and re-reported the original fault as unsolvable. That is why the step says to let the router
settle and re-test as a series before reverting.

## A pass over the wrong path (DNS fast path, step 5)

A phone "verified" a DNS repair while it was resolving over mobile data, through a resolver it still
had pinned. The `HTTP 200` was real and said nothing about the router. That is why the step demands
the device's LAN address and its resolver before the result counts.

## A boot that someone's hands caused (router-reboots.md)

A boot list showed a reboot a few minutes after the owner photographed the router's cabling. The
photo's timestamp was the clock that explained it: the plug had been touched. That is why the boot
list is read only after discarding boots that line up with physical handling, and why such a boot
still points at a loose power plug.

## A worked shape (generic, SKILL.md §4)

A gigabit plan, a Wi-Fi 5 (AC1200) main router, and a **wirelessly-backhauled** Wi-Fi 6 extender near
the desk. Measurement shows low throughput, weak signal and packet loss at the desk but near-plan
speed beside the router and on the cable, so the extender's wireless hop is halving bandwidth. The
first fix is to **wire the extender's backhaul** (Access Point mode on an Ethernet run) or wire the
client, not to add a second wireless extender. Many extenders already have a gigabit port and AP
mode, so the fix often costs only a cable.
