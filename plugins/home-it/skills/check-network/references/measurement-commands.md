# Measurement commands per OS — the depth behind §1 and the DNS fast path

Read this when you run a measurement and need the exact command for this OS. The SKILL.md body says
WHAT to measure and how to read it; this file says how to get the number on macOS, Windows and
Linux. Checked on macOS 15 (2026-11-14); the Windows and Linux lines are the stock tools' documented
forms. Re-check a line before you rely on its output shape.

## Finding the gateway

*macOS:* `route -n get default` → `gateway:`, or `netstat -nr`. *Windows:* `ipconfig` → Default
Gateway. *Linux:* `ip route` → `default via`. It is usually `192.168.0.1` or `192.168.1.1`, but read
it rather than assume it.

## Ethernet negotiated speed (the wired run)

- *macOS:* `ifconfig <iface>`. Read **two** lines. `status: active` means a link is up; `status:
  inactive` means nothing is connected. The speed is the part in parentheses on the `media:` line,
  e.g. `media: autoselect (1000baseT <full-duplex>)`. With no parenthesised speed there is no link to
  read. Don't judge by `media: autoselect` alone: an active Wi-Fi interface prints exactly that too.
  Find the adapter's interface name with `networksetup -listallhardwareports`.
- *Windows:* the adapter Status dialog → Speed, or `Get-NetAdapter | Format-Table Name,LinkSpeed`.
- *Linux:* `ethtool <iface>` → `Speed:` (install `ethtool` if absent).

A link at 100 Mbps instead of 1000 explains the whole result.

## Throughput + bufferbloat

- *macOS:* `networkQuality -v` → uplink/downlink capacity, idle latency and **Responsiveness** (RPM;
  low RPM is bufferbloat). It takes ~20 s and saturates the link while it runs.
- *Windows / Linux:* no built-in equivalent. Use a browser test that reports **loaded** latency
  (`speed.cloudflare.com`, `waveform.com/bufferbloat`), or the Ookla `speedtest` CLI for throughput
  alone.

## Packet loss & latency

*macOS / Linux:* `ping -c 100 <gateway>` and `ping -c 100 1.1.1.1`. *Windows:* `ping -n 100 …`.

## Wi-Fi link quality (signal + negotiated rate)

- *macOS:* `system_profiler SPAirPortDataType` → the "Current Network Information" block: PHY Mode,
  Channel, **Signal / Noise** (dBm), **Transmit Rate**. It needs no sudo. The block lists other
  networks after it, so read only the first entry. `wdutil info` reports the same, but only under
  `sudo`; run bare it prints just a usage message, which looks like a broken tool.
- *Windows:* `netsh wlan show interfaces` → Signal (%), Receive/Transmit rate, Radio type, Channel.
- *Linux:* `iw dev <iface> link` or `nmcli dev wifi` → signal (dBm) + bitrate.

## Client sanity

Interface error counters: *macOS / Linux:* `netstat -i` (`Ierrs`/`Oerrs`) or `ip -s link`.
*Windows:* `netstat -e` or `Get-NetAdapterStatistics`.

## DNS queries

`bun run "<skill dir>/scripts/dns-probe.ts"` runs the series on any OS, with pass counts per resolver. Use the OS
tools below when you need the raw response, in particular the authority section of an NXDOMAIN, whose
SOA TTL is the exact negative-cache TTL.

- *macOS / Linux:* `dig <host> @<resolver>` (status, answer, TTL); `dig <host> @<resolver> +norecurse`
  to see whether a cache already holds it; `dig SOA <zone> @<resolver>`. The system path:
  `dscacheutil -q host -a name <host>` on macOS, `getent hosts <host>` on Linux.
- *Windows:* `Resolve-DnsName <host> -Server <resolver> -DnsOnly`; `Resolve-DnsName <zone> -Type SOA`.
  The system path is `Resolve-DnsName <host>` without `-Server`. Clear the client cache with
  `Clear-DnsClientCache`; on macOS use `sudo dscacheutil -flushcache; sudo killall -HUP
  mDNSResponder` (needs the owner's sudo).

## Reading back a per-device DNS override

Record the original mode when you set an override, and read it back after the restore. "Automatic"
is a mode, not an empty value, so restoring the wrong one leaves the workaround in place.

- *Android* (Private DNS, over ADB): `adb shell settings get global private_dns_mode` (`off`,
  `opportunistic`, which the UI calls Automatic, or `hostname`) and `adb shell settings get global
  private_dns_specifier` (the host, when the mode is `hostname`). Restoring Automatic means
  `opportunistic` **with the specifier cleared**. Confirm both keys afterwards.
- *iOS / iPadOS:* a configuration profile or an app installs the override. Check Settings → General →
  VPN & Device Management, and the Wi-Fi network's Configure DNS.
- *Desktop:* the adapter's DNS servers (`networksetup -getdnsservers <service>` on macOS,
  `Get-DnsClientServerAddress` on Windows, `resolvectl status` on Linux).
