# Measurement commands per OS — the depth behind §1 and the DNS fast path

Read this when you run a measurement and need the exact command for this OS. The SKILL.md body says
WHAT to measure and how to read it; this file says how to get the number on macOS, Windows and
Linux. Checked on macOS 15 (2026-11-14); the Windows and Linux lines are the stock tools' documented
forms. Re-check a line before you rely on its output shape.

## Finding the gateway

*macOS:* `route -n get default` → `gateway:`, or `netstat -nr`. *Windows:* `ipconfig` → Default
Gateway. *Linux:* `ip route` → `default via`. It is usually `192.168.0.1` or `192.168.1.1`, but read
it rather than assume it.

## Path MTU (don't-fragment ping)

A 1472-byte payload plus 28 bytes of headers is a full 1500-byte packet; 1464 fits a 1492 PPPoE link.
Test at the size the WAN should carry: 1472 on Ethernet/IPoE, 1464 on PPPoE, and on cellular or a
tunnel the MTU the router's WAN page reports, minus 28. A reply means that
size gets through. An explicit "frag needed" / "message too long" answer is a normal, signalled
limit — the path is smaller than you assumed, and TCP can adapt. Only a **silent timeout at the
expected size while smaller pings answer** is the black hole that stalls HTTPS while pings pass.

- macOS: `ping -D -s 1472 -c 3 1.1.1.1`, then `-s 1464` (run 2026-11-16 on macOS 15: 1472 passed,
  1600 failed, as expected)
- Linux: `ping -M do -s 1472 -c 3 1.1.1.1`, then `-s 1464` (from the man page, not yet run here)
- Windows: `ping -f -l 1472 -n 3 1.1.1.1`, then `-l 1464` (from the docs, not yet run here)

## Ethernet negotiated speed (the wired run)

- *macOS:* `ifconfig <iface>`. Read **two** lines. `status: active` means a link is up; `status:
  inactive` means nothing is connected. The speed is the part in parentheses on the `media:` line,
  e.g. `media: autoselect (1000baseT <full-duplex>)`. With no parenthesised speed there is no link to
  read. Don't judge by `media: autoselect` alone: an active Wi-Fi interface prints exactly that too.
  Find the adapter's interface name with `networksetup -listallhardwareports`.
- *Windows:* the adapter Status dialog → Speed, or `Get-NetAdapter | Format-Table Name,LinkSpeed`.
- *Linux:* `ethtool <iface>` → `Speed:` (install `ethtool` if absent).

## Throughput + bufferbloat

- *macOS:* `networkQuality -v` → uplink/downlink capacity, idle latency and **Responsiveness** (RPM;
  low RPM is bufferbloat). Run it alone, with no ping series in flight, so idle latency stays clean.
  `networkQuality -h` lists `-f L4S` / `-f noL4S` to force or disable L4S; whether `-v` prints an
  ECN/L4S status line was not verified, so read the output rather than assume it. It takes ~20 s and saturates the link while it runs, so tell the owner
before running it (a video call in the house will stutter); the same goes for any speed test.
- *Windows / Linux:* no built-in equivalent. Use a browser test that reports **loaded** latency
  (`speed.cloudflare.com`, `waveform.com/bufferbloat`), or the Ookla `speedtest` CLI for throughput
  alone.

## Packet loss & latency

Run the two series at the same time, so a gap in one can be matched against the other:
*macOS / Linux:* `ping -c 100 <gateway> > gw.txt & ping -c 100 1.1.1.1 > pub.txt; wait`. Both send
one probe a second from the same start, so equal `icmp_seq` numbers are the same second. A lost probe
looks different per OS: macOS prints `Request timeout for icmp_seq N` (measured), Linux iputils prints
nothing for it (add `-O` to get a "no answer yet" line). So a sequence number that timed out (macOS)
or is missing (Linux) in both files is shared loss. *Windows* prints no sequence number, so stamp each
line with the time and match failures (`Request timed out.`) by second; in two PowerShell windows
started together (written from the documented cmdlets, not yet run on Windows):
`ping -n 100 <gateway> | ForEach-Object { "$(Get-Date -Format o) $_" } > gw.txt` and the same with
`1.1.1.1 … > pub.txt`.

## Wi-Fi link quality (signal + negotiated rate)

- *macOS:* `system_profiler SPAirPortDataType` → the "Current Network Information" block: PHY Mode,
  Channel, **Signal / Noise** (dBm), **Transmit Rate**. It needs no sudo. The block lists other
  networks after it, so read the first entry for the link; the later `Other Local Wi-Fi Networks`
  entries each carry a `Channel: N (band, width)` line, so counting entries per channel is the
  neighbour scan, and the current network's own `Channel:` line also gives the width. `wdutil info` reports the same, but only under
  `sudo`; run bare it prints just a usage message, which looks like a broken tool.
- *Windows:* `netsh wlan show interfaces` → Signal (%), Receive/Transmit rate, Radio type, Channel. `netsh wlan show networks mode=bssid` lists neighbours with channel. Neither shows the channel width; read it from the router's wireless page (§3) and say width stayed unmeasured from the client.
- *Linux:* `iw dev <iface> link` or `nmcli dev wifi` → signal (dBm) + bitrate. `nmcli dev wifi list` (or `iw dev <iface> scan`) lists neighbours with channel (the width is not in `nmcli`; `iw dev <iface> link` shows the current width, e.g. `80.00 MHz`, and a neighbour's width stays unmeasured unless the scan prints it).

## Route and IPv6 (separating Wi-Fi/LAN jitter from the ISP)

`traceroute -m 5 1.1.1.1` (macOS/Linux; Windows `tracert -h 5 1.1.1.1`) and, only when the interface has
a global IPv6 address, `ping6 -c 30 2606:4700:4700::1111` (Linux `ping -6 -c 30 2606:4700:4700::1111`; Windows `ping -6 -n 30 2606:4700:4700::1111`). Run
these before the throughput test. Not yet run on every OS here; read the output shape first.

## Client sanity

Interface error counters: *macOS / Linux:* `netstat -i` (`Ierrs`/`Oerrs`) or `ip -s link`.
*Windows:* `netstat -e` or `Get-NetAdapterStatistics`.

## DNS queries

`bun run "<skill dir>/scripts/dns-probe.ts"` runs the series on any OS, with pass counts per resolver. Use the OS
tools below when you need the raw response, in particular the authority section of an NXDOMAIN, whose
SOA TTL is the exact negative-cache TTL.

- *Which resolvers the client uses* (DNS fast path, step 1), IPv6 included: `scutil --dns` on macOS
  (the `nameserver[n]` lines of the first resolver, plus any resolver whose `domain` line covers
  the failing hostname, since that one answers for it; a VPN or profile often adds such entries);
  `resolvectl status` on Linux with
  systemd-resolved, else `/etc/resolv.conf`; `Get-DnsClientServerAddress` or `ipconfig /all` on
  Windows. Pass each address to `dns-probe.ts` as a `--server`.

- *macOS / Linux:* `dig <host> @<resolver>` (status, answer, TTL); `dig <host> @<resolver> +norecurse`
  to see whether a cache already holds it; `dig SOA <zone> @<resolver>`. The system path:
  `dscacheutil -q host -a name <host>` on macOS, `getent hosts <host>` on Linux.
- *The authoritative answer* (DNS fast path, step 1, when the public resolvers fail too): `dig
  +trace <host> @1.1.1.1` walks from the root through a public resolver (a home gateway can refuse
  the root query); on Windows, `Resolve-DnsName <zone> -Type NS`, then `Resolve-DnsName <host>
  -Server <one of those NS>`. `+trace` prints no `status:` line, and a negative answer shows only as
  SOA/NSEC records, so finish with `dig <host> @<the last server the trace names>` and read its
  `status:`: `NXDOMAIN` from the zone's own server is the definitive negative.
- *Windows:* `Resolve-DnsName <host> -Server <resolver> -DnsOnly`; `Resolve-DnsName <zone> -Type SOA`.
  The system path is `Resolve-DnsName <host>` without `-Server`. Clear the client cache with
  `Clear-DnsClientCache`; on macOS use `sudo dscacheutil -flushcache; sudo killall -HUP
  mDNSResponder` (needs the owner's sudo); on Linux with systemd-resolved, `resolvectl
  flush-caches` (`resolvectl status` shows whether it is in use; without it and without a local
  cache such as `nscd` or `dnsmasq`, the client keeps no DNS cache to clear).

## Reading back a per-device DNS override

The rule (record the original mode, read the restore back) is in SKILL.md's DNS fast path, step 5.
These are the keys per platform.

- *Android* (Private DNS, over ADB): `adb shell settings get global private_dns_mode` (`off`,
  `opportunistic`, which the UI calls Automatic, or `hostname`) and `adb shell settings get global
  private_dns_specifier` (the host, when the mode is `hostname`). Restoring Automatic means
  `opportunistic` **with the specifier cleared**. Confirm both keys afterwards.
- *iOS / iPadOS:* a configuration profile or an app installs the override. Check Settings → General →
  VPN & Device Management, and the Wi-Fi network's Configure DNS.
- *Desktop:* the adapter's DNS servers (`networksetup -getdnsservers <service>` on macOS,
  `Get-DnsClientServerAddress` on Windows, `resolvectl status` on Linux).
