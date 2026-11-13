# Proving (or ruling out) router reboots — the depth behind §2a

Read this when the owner reports drop-outs and you are about to log the router's uptime.

## Uptime without the admin password (UPnP)

Most consumer routers run miniupnpd, and UPnP answers an unauthenticated query from the LAN:

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
- The WAN type is in the description: `WANIPConnection` means IPoE/DHCP, `WANPPPConnection` means
  PPPoE. A factory reset of an IPoE router with a default SSID costs only the Wi-Fi name and password —
  find that out before ruling a reset out.

## The logger

- Log uptime every ~20 s plus a 1 Hz ping of the gateway and of a public IP, to a **local file** — an
  outage cannot stop a local log.
- Keep the logging host awake and on power. A sleeping laptop is a blind spot, never a quiet period:
  cross-check its sleep/wake log before reading any gap.
- Run it across the time of day the owner reports the drops; a clean night proves nothing about the
  evening.

## Reading the boot list

1. **Drop the boots someone's hands caused.** Match each boot against when the owner touched the kit.
   Phone photos of the cabling are a good clock: many camera apps put the capture time in the file
   name — check whether it is local time or UTC before comparing. A boot within minutes of such a photo
   is not evidence of a fault, though it does point at a loose power plug.
2. **Rule out load:** compare WAN Mbit/s in the 5 min before each boot with the busiest windows that had
   no boot.
3. **The power test the owner can run without a password:** put the router (and the ONT, if any) on a
   UPS or power station and change nothing else. Boots stop → mains or the socket. Boots continue → the
   router's own adapter, or the router.
