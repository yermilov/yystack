# Proving (or ruling out) router reboots — the depth behind §2a

Read this when the owner reports drop-outs and you are about to log the router's uptime.

## Uptime without the admin password (UPnP)

Most consumer routers run miniupnpd, and UPnP answers an unauthenticated query from the LAN.
`bun run "<skill dir>/scripts/upnp-uptime.ts" [--json]` does steps 1–4 in one read-only shot; the steps are here for a host without Bun or a router the script does not understand:

1. SSDP-discover `urn:schemas-upnp-org:service:WANIPConnection:1`.
2. SOAP `GetStatusInfo` on its control URL → `NewUptime`. `now − uptime` dates the start.
3. `WANCommonInterfaceConfig` → `GetTotalBytesReceived` / `GetTotalBytesSent` gives WAN traffic, so
   you can see whether boots follow load.
4. The device description's `modelNumber` often carries the firmware build.

Caveats, each of which has produced a wrong verdict:

- `NewUptime` is the UPnP **daemon's** uptime (the system's only when miniupnpd runs with
  `system_uptime=yes`). Some firmware restarts the daemon on a WAN reconnect, which resets the counter
  **without** a reboot. Confirm each "reboot" with the clients losing the gateway at that instant
  (Wi-Fi link down, a ping gap) before calling it one.
- Do not use the description's `UDN` as the router's identity: some routers regenerate it on every
  boot, and randomise the control path per boot too. Rediscover after any SOAP failure.
- The WAN type is in the description: `WANIPConnection` means IPoE (DHCP or static), `WANPPPConnection`
  means PPPoE. It matters if a factory reset comes up: a reset PPPoE router needs the ISP login typed
  back in, while an IPoE one usually comes back online by itself and loses only its own settings
  (Wi-Fi name, password, any custom DNS). Find out which before ruling a reset in or out.

## The logger

- Log uptime every ~20 s (`upnp-uptime.ts --json` from a loop or scheduler) plus a 1 Hz ping of the
  gateway and of a public IP, to a **local file**: an outage cannot stop a local log.
- Keep the logging host awake and on power. A sleeping laptop is a blind spot, never a quiet period:
  cross-check its sleep/wake log before reading any gap.
- Run it across the time of day the owner reports the drops; a clean night proves nothing about the
  evening.

## Reading the boot list

1. **Drop the boots someone's hands caused.** Match each boot against when anyone touched the kit
   (re-plugging, moving it, photographing the cabling: a photo's capture time is a usable clock, once
   you know whether it is local time or UTC). A boot within minutes of handling is not evidence of a
   fault, though it does point at a loose power plug (📖 `precedents.md`).
2. **Rule out load:** compare WAN Mbit/s in the 5 min before each boot with the busiest windows that had
   no boot.
3. **The power test the owner can run without a password:** put the router (and the ONT, if any) on a
   UPS or power station and change nothing else. Boots stop → mains or the socket. Boots continue → the
   router's own adapter, or the router.
