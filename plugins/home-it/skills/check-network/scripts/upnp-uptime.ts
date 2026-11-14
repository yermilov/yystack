#!/usr/bin/env bun
// upnp-uptime.ts — read a home router's uptime and WAN counters over UPnP, without the admin password.
//
// Read-only: SSDP discovery plus the GET-style SOAP actions GetStatusInfo, GetTotalBytesReceived and
// GetTotalBytesSent. It never calls an action that changes state (no port mappings, no
// ForceTermination, no RequestConnection).
//
//   bun run upnp-uptime.ts [--timeout 3000] [--json]
//
// Exit codes: 0 an uptime was read · 1 no UPnP gateway answered, or it answered without an uptime
// (UPnP off, a non-miniupnpd stack, or a firewall on this host) · 2 usage error.

import dgram from "node:dgram";

const USAGE = `usage: bun run upnp-uptime.ts [--timeout MS] [--json]

Discovers the LAN's UPnP Internet Gateway Device and prints, in one shot:
  uptime (NewUptime) and the boot time it implies, connection status and WAN type
  (IP = IPoE/DHCP/static, PPP = PPPoE), total WAN bytes received/sent, model name/number.

Read-only: it sends only discovery and Get* queries. Run it every ~20 s from a loop or scheduler
on a host that stays awake to build a boot log.

NewUptime is the UPnP DAEMON's uptime, which on some firmware resets on a WAN reconnect without a
reboot — confirm each "reboot" from the client side (a gap in a gateway ping) before calling it one.

  --timeout MS   how long to wait for SSDP answers (default 3000)
  --json         machine-readable output

Exit: 0 uptime read · 1 no gateway / no uptime · 2 usage error.`;

const SERVICES = [
  "urn:schemas-upnp-org:service:WANIPConnection:1",
  "urn:schemas-upnp-org:service:WANIPConnection:2",
  "urn:schemas-upnp-org:service:WANPPPConnection:1",
];
const COMMON = "urn:schemas-upnp-org:service:WANCommonInterfaceConfig:1";

function parseArgs(argv: string[]) {
  const o = { timeout: 3000, json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-h" || a === "--help") { console.log(USAGE); process.exit(0); }
    else if (a === "--json") o.json = true;
    else if (a === "--timeout") {
      const n = Number(argv[++i]);
      if (!Number.isInteger(n) || n <= 0) throw new Error("--timeout needs a positive integer");
      o.timeout = n;
    } else throw new Error(`unknown argument ${a}`);
  }
  return o;
}

// SSDP M-SEARCH for each WAN connection service type; collect the LOCATION headers that answer.
function discover(timeout: number): Promise<string[]> {
  return new Promise((resolve) => {
    const sock = dgram.createSocket("udp4");
    const locations = new Set<string>();
    sock.on("message", (msg) => {
      const m = /^location:\s*(\S+)/im.exec(msg.toString());
      if (m) locations.add(m[1]);
    });
    sock.on("error", () => { try { sock.close(); } catch {} resolve([...locations]); });
    sock.bind(() => {
      for (const st of SERVICES) {
        const req = [
          "M-SEARCH * HTTP/1.1", "HOST: 239.255.255.250:1900", 'MAN: "ssdp:discover"', "MX: 2", `ST: ${st}`, "", "",
        ].join("\r\n");
        sock.send(req, 1900, "239.255.255.250");
      }
    });
    setTimeout(() => { try { sock.close(); } catch {} resolve([...locations]); }, timeout);
  });
}

const tag = (xml: string, name: string) => new RegExp(`<(?:\\w+:)?${name}>([^<]*)</(?:\\w+:)?${name}>`, "i").exec(xml)?.[1]?.trim();

// Every <service> block in the device description, with its type and absolute control URL.
function services(xml: string, base: string) {
  const out: { type: string; control: string }[] = [];
  for (const m of xml.matchAll(/<service>([\s\S]*?)<\/service>/gi)) {
    const type = tag(m[1], "serviceType");
    const ctl = tag(m[1], "controlURL");
    if (!type || !ctl) continue;
    // A malformed controlURL or URLBase skips this service; the next one, or responder, may still answer.
    try { out.push({ type, control: new URL(ctl, base).toString() }); } catch {}
  }
  return out;
}

async function soap(control: string, type: string, action: string, timeout: number) {
  const body = `<?xml version="1.0"?><s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/"><s:Body><u:${action} xmlns:u="${type}"/></s:Body></s:Envelope>`;
  const res = await fetch(control, {
    method: "POST",
    headers: { "content-type": 'text/xml; charset="utf-8"', SOAPAction: `"${type}#${action}"` },
    body,
    signal: AbortSignal.timeout(timeout),
  });
  if (!res.ok) throw new Error(`${action}: HTTP ${res.status}`);
  return res.text();
}

async function main() {
  let o;
  try { o = parseArgs(process.argv.slice(2)); }
  catch (e: any) { console.error(`upnp-uptime: ${e.message}\n\n${USAGE}`); process.exit(2); }

  const locations = await discover(o.timeout);
  const result: Record<string, unknown> = { locations };
  if (!locations.length) {
    const msg = "no UPnP gateway answered SSDP — UPnP may be off on the router, or a firewall on this host drops multicast replies";
    if (o.json) console.log(JSON.stringify({ ...result, readAt: new Date().toISOString(), error: msg }, null, 2)); else console.log(msg);
    process.exit(1);
  }

  // Try every responder until one yields an uptime: a LAN can hold several UPnP devices, and the
  // first one that advertises a WAN service is not always the gateway that answers.
  for (const loc of locations) {
    let xml: string;
    try { xml = await (await fetch(loc, { signal: AbortSignal.timeout(o.timeout) })).text(); }
    catch { continue; }
    // A relative controlURL resolves against <URLBase> when the description carries one (UPnP 1.0).
    const svcs = services(xml, tag(xml, "URLBase") || loc);
    // A description can advertise several WAN connection services (IP v1 and v2, PPP); try each.
    const wans = svcs.filter((s) => SERVICES.includes(s.type));
    if (!wans.length) continue;
    const attempt: Record<string, unknown> = {
      description: loc,
      modelName: tag(xml, "modelName"),
      modelNumber: tag(xml, "modelNumber"),
    };
    for (const wan of wans) {
      attempt.wanType = wan.type.includes("PPP") ? "PPP (PPPoE)" : "IP (IPoE / DHCP / static)";
      try {
        const st = await soap(wan.control, wan.type, "GetStatusInfo", o.timeout);
        // Timestamp the reading itself, not discovery: bootedAt must line up with a 1 Hz ping log.
        const readAt = new Date();
        const raw = tag(st, "NewUptime") ?? "";
        attempt.readAt = readAt.toISOString();
        attempt.connectionStatus = tag(st, "NewConnectionStatus");
        // An empty or non-numeric element is a missing uptime, not zero (Number("") is 0).
        if (/^\d+$/.test(raw)) {
          const up = Number(raw);
          attempt.uptimeSeconds = up;
          attempt.bootedAt = new Date(readAt.getTime() - up * 1000).toISOString();
          delete attempt.statusError;
          break;
        }
        attempt.statusError = "GetStatusInfo carried no NewUptime";
      } catch (e: any) { attempt.statusError = e.message; }
    }
    const common = svcs.find((s) => s.type === COMMON);
    if (common) {
      for (const [action, key] of [["GetTotalBytesReceived", "NewTotalBytesReceived"], ["GetTotalBytesSent", "NewTotalBytesSent"]] as const) {
        try { attempt[key] = Number(tag(await soap(common.control, common.type, action, o.timeout), key)); } catch {}
      }
    }
    Object.assign(result, attempt);
    if (typeof attempt.uptimeSeconds === "number") break;
  }
  result.readAt ??= new Date().toISOString();

  const ok = typeof result.uptimeSeconds === "number";
  if (o.json) console.log(JSON.stringify(result, null, 2));
  else if (!result.description) console.log(`gateway answered SSDP (${locations.join(", ")}) but no description carried a WAN connection service`);
  else {
    console.log(`read at        ${result.readAt}`);
    console.log(`model          ${result.modelName ?? "?"} ${result.modelNumber ?? ""}`.trimEnd());
    console.log(`WAN type       ${result.wanType}`);
    console.log(`connection     ${result.connectionStatus ?? "?"}`);
    if (ok) {
      const s = result.uptimeSeconds as number;
      console.log(`uptime         ${s} s (${Math.floor(s / 86400)}d ${Math.floor((s % 86400) / 3600)}h ${Math.floor((s % 3600) / 60)}m)`);
      console.log(`booted at      ${result.bootedAt}  (UPnP daemon start — confirm a reboot from the client side)`);
    } else console.log(`uptime         not reported${result.statusError ? ` (${result.statusError})` : ""}`);
    if (result.NewTotalBytesReceived !== undefined) console.log(`WAN bytes rx   ${result.NewTotalBytesReceived}`);
    if (result.NewTotalBytesSent !== undefined) console.log(`WAN bytes tx   ${result.NewTotalBytesSent}`);
  }
  process.exit(ok ? 0 : 1);
}

main();
