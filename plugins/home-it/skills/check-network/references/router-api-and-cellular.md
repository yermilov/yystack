# Router JSON APIs and cellular (4G/LTE) WANs — the depth behind §3 and §3a

Read § Reading the router's own API when the router UI draws its pages from a JSON API you could
query instead; read § Cellular WAN when the WAN is a cellular modem.

## Reading the router's own API

Many routers expose the data their UI draws as JSON, and a log you can grep beats any screenshot.
The UI already calls those endpoints, and the browser's network panel shows which ones, with their
request bodies. Replay the read requests the owner's own signed-in session already makes (the system
log, interface status, traffic history) with that session's cookie or token.

**Credentials stay the owner's.** Use this only with a session or token the owner provides, or have
them run the login step themselves. Never type, derive or store their admin password. Whatever login
handshake the UI performs is how *their* client authenticates, not a licence for yours.

Two things to watch: a log's first lines can carry a pre-NTP date, and a log only goes back to the last
reboot.

## Cellular WAN

**Grade the radio** from the modem's interface status:

| metric | good | marginal | bad |
|---|---|---|---|
| RSRP | > −90 dBm | −90…−105 | < −105 |
| RSRQ | > −10 dB | −10…−15 | < −15 |
| SINR/CINR | > 10 dB | 0…10 | < 0 (noise louder than signal) |

Then count the lines your firmware writes when the WAN goes down and comes back (find their wording
from one known drop first). Several reconnects an hour on bad SINR means the radio link itself is the
cause.

**Reading the log:**

- Find the mobile interface by its type, not by a guessed name.
- A down→up pair while the modem device stays attached is a reconnect. The modem itself detaching and
  re-attaching is a restart — or a crash, a power dip or a loose connection.
- Read the recovery probe's state (vendors call it a ping-check, connection monitor or WAN
  watchdog) from the router itself rather than inferring it. A
  detach that lines up with the probe's fail counter reaching its limit is probably the probe acting;
  one with no such change is not.

**Fixes, in order:**

1. **Placement** — higher up, at a window facing the tower, away from heaters (check the modem's
   temperature too).
2. **An automatic recovery probe** — a ping-check on the mobile interface that restarts the modem after
   N failed probes. Without one the router can sit "connected" with no traffic until a human
   power-cycles it.

**Configuring the probe is a router write:** get the owner's OK first, change only the probe, and
re-measure (§3's one-change rule). Then:

- Read the config back. Firmware differs on whether setting a probe host adds to the existing list or
  replaces it, so check yours rather than assuming.
- Watch the next few minutes of log and probe state: a modem restart right after the probe is enabled
  can be the probe settling rather than a fault. Call that a one-off only after the probe reports success and the connection holds.

**Privacy:** the modem's status payload usually carries the SIM's IMSI/ICCID, the IMEI and the
subscriber number. Copy only the signal fields you need; never forward or log the whole object.
