#!/usr/bin/env bun
// dns-probe.ts — query one hostname through several resolvers as a SERIES and report pass counts.
//
// Read-only: it only sends DNS queries. It never changes any resolver, router or device setting.
//
//   bun run dns-probe.ts <hostname> --server <ip> [--server <ip> ...] [--system]
//                        [--count 20] [--interval 500] [--timeout 2000] [--type A|AAAA] [--soa] [--json]
//
// Exit codes: 0 every probe of every resolver answered NOERROR · 1 at least one probe failed
// (NXDOMAIN, SERVFAIL, timeout, …) — the output says which resolver and how often · 2 usage error.

import { Resolver, lookup } from "node:dns/promises";
import { isIP } from "node:net";

const USAGE = `usage: bun run dns-probe.ts <hostname> --server <ip> [--server <ip> ...] [--system]
                          [--count N] [--interval MS] [--timeout MS] [--type A|AAAA] [--soa] [--json]

Sends N queries for <hostname> to each resolver and prints a pass count per resolver (e.g. 19/20),
the failure codes seen, each answer address with its TTL range and how many rounds returned it, and
the median latency. An address in a private, loopback, link-local or unspecified range is marked
"(non-public)": for a public name that is the sinkhole / block-page / wrong-path signal. Addresses that
rotate from round to round on every resolver are ordinary round-robin, not a fault.

  --server IP     a resolver to query directly (repeat it: the gateway, each configured upstream,
                  two public resolvers). At least one --server or --system is required.
  --system        also query through the operating system's normal resolver (getaddrinfo). That path
                  may answer from the OS cache and reports no TTL.
  --count N       queries per resolver (default 20). One query is not a verdict.
  --interval MS   pause between rounds (default 500).
  --timeout MS    per-query timeout (default 2000), one try, no retry.
  --type A|AAAA   record type (default A).
  --soa           also print the zone's SOA (found by walking up the labels, through each --server
                  in turn) and the upper bound of its negative-cache TTL (the SOA minimum field).
  --json          machine-readable output.

Exit: 0 every probe answered · 1 at least one probe failed · 2 usage error. Exit 0 can still carry a
(non-public) answer — read the rows, not only the code.`;

// A public name answered with one of these is a sinkhole, a block page or a resolver on the wrong path.
function nonPublic(ip: string): boolean {
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(ip)
  if (mapped) return nonPublic(mapped[1])
  if (ip.includes(":")) return /^(::1?$|fe[89ab]|f[cd]|ff)/i.test(ip)
  const [a, b] = ip.split(".").map(Number)
  return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) ||
    (a === 198 && (b === 18 || b === 19))
}

type Outcome = { ok: boolean; code: string; ms: number; answers: string[] };

function parseArgs(argv: string[]) {
  const o = { host: "", servers: [] as string[], system: false, count: 20, interval: 500, timeout: 2000, type: "A", soa: false, json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const val = () => {
      const v = argv[++i];
      if (v === undefined || v.startsWith("--")) throw new Error(`${a} needs a value`);
      return v;
    };
    const num = () => {
      const n = Number(val());
      if (!Number.isInteger(n) || n < 0) throw new Error(`${a} needs a non-negative integer`);
      return n;
    };
    if (a === "-h" || a === "--help") { console.log(USAGE); process.exit(0); }
    else if (a === "--server") {
      const v = val();
      if (!isIP(v)) throw new Error(`--server needs an IP address, got ${v}`);
      // A repeated address (an upstream that is also a public control) is probed once, not twice.
      if (!o.servers.includes(v)) o.servers.push(v);
    }
    else if (a === "--system") o.system = true;
    else if (a === "--count") o.count = num();
    else if (a === "--interval") o.interval = num();
    else if (a === "--timeout") o.timeout = num();
    else if (a === "--type") { o.type = val().toUpperCase(); if (o.type !== "A" && o.type !== "AAAA") throw new Error("--type must be A or AAAA"); }
    else if (a === "--soa") o.soa = true;
    else if (a === "--json") o.json = true;
    else if (a.startsWith("--")) throw new Error(`unknown flag ${a}`);
    else if (!o.host) o.host = a;
    else throw new Error(`unexpected argument ${a}`);
  }
  if (!o.host) throw new Error("hostname is required");
  if (!o.servers.length && !o.system) throw new Error("give at least one --server or --system");
  if (o.count < 1) throw new Error("--count must be at least 1");
  return o;
}

// The resolver library rounds short timeouts up (about 1 s was measured for --timeout 300), so the
// per-query timeout is enforced here as well; a query that loses the race is cancelled.
async function viaServer(server: string, host: string, type: string, timeout: number): Promise<Outcome> {
  const r = new Resolver({ timeout, tries: 1 });
  r.setServers([server]);
  const t = performance.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const query = type === "AAAA" ? r.resolve6(host, { ttl: true }) : r.resolve4(host, { ttl: true });
    const recs = await Promise.race([
      query,
      new Promise<never>((_, reject) => { timer = setTimeout(() => { reject(Object.assign(new Error("timeout"), { code: "ETIMEOUT" })); r.cancel(); }, timeout); }),
    ]);
    return { ok: true, code: "NOERROR", ms: performance.now() - t, answers: recs.map((x) => `${x.address} ttl=${x.ttl}`) };
  } catch (e: any) {
    return { ok: false, code: codeName(e?.code), ms: performance.now() - t, answers: [] };
  } finally {
    clearTimeout(timer);
  }
}

// getaddrinfo has no timeout of its own, and a stalled OS resolver is one of the faults this probe
// exists to catch, so race it against the same per-query timeout.
async function viaSystem(host: string, type: string, timeout: number): Promise<Outcome> {
  const t = performance.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const recs = await Promise.race([
      lookup(host, { all: true, family: type === "AAAA" ? 6 : 4 }),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(Object.assign(new Error("timeout"), { code: "ETIMEOUT" })), timeout); }),
    ]);
    return { ok: true, code: "NOERROR", ms: performance.now() - t, answers: recs.map((x) => x.address) };
  } catch (e: any) {
    return { ok: false, code: codeName(e?.code), ms: performance.now() - t, answers: [] };
  } finally {
    clearTimeout(timer);
  }
}

// c-ares error codes → the DNS vocabulary the skill uses.
function codeName(code: string | undefined): string {
  switch (code) {
    case "ENOTFOUND": return "NXDOMAIN";
    case "ENODATA": return "NODATA";
    case "ESERVFAIL": return "SERVFAIL";
    case "EREFUSED": return "REFUSED";
    case "ETIMEOUT": return "TIMEOUT";
    case "ECONNREFUSED": return "CONNREFUSED";
    default: return code ?? "ERROR";
  }
}

// The negative-cache TTL is min(SOA record TTL, SOA minimum field) (RFC 2308). This API exposes the
// minimum field but not the record's own TTL, so the value printed is an UPPER BOUND; the exact one
// is the SOA TTL in the authority section of an NXDOMAIN answer (dig / Resolve-DnsName show it).
async function findSoa(host: string, servers: string[], timeout: number) {
  const labels = host.replace(/\.$/, "").split(".");
  for (const server of servers.length ? servers : [undefined]) {
    const r = new Resolver({ timeout, tries: 2 });
    if (server) r.setServers([server]);
    for (let i = 0; i < labels.length - 1; i++) {
      const zone = labels.slice(i).join(".");
      try {
        const soa = await r.resolveSoa(zone);
        return { zone, via: server ?? "system", minimum: soa.minttl, nsname: soa.nsname, serial: soa.serial };
      } catch {
        // not a zone apex, or this resolver failed — walk up one label
      }
    }
  }
  return null;
}

const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

async function main() {
  let o;
  try { o = parseArgs(process.argv.slice(2)); }
  catch (e: any) { console.error(`dns-probe: ${e.message}\n\n${USAGE}`); process.exit(2); }

  const targets = [...o.servers.map((s) => ({ name: s, run: () => viaServer(s, o.host, o.type, o.timeout) }))];
  if (o.system) targets.push({ name: "system", run: () => viaSystem(o.host, o.type, o.timeout) });

  const results = new Map<string, Outcome[]>(targets.map((t) => [t.name, []]));
  const started = new Date().toISOString();
  for (let round = 0; round < o.count; round++) {
    // Same round hits every resolver at nearly the same moment, so their answers are comparable.
    const outs = await Promise.all(targets.map((t) => t.run()));
    targets.forEach((t, i) => results.get(t.name)!.push(outs[i]));
    if (round < o.count - 1 && o.interval) await Bun.sleep(o.interval);
  }

  const summary = targets.map(({ name }) => {
    const rs = results.get(name)!;
    const pass = rs.filter((r) => r.ok).length;
    const codes: Record<string, number> = {};
    for (const r of rs) codes[r.code] = (codes[r.code] ?? 0) + 1;
    // One row per ADDRESS, not per "<ip> ttl=<n>" string: the TTL counts down every round, so the raw
    // strings never repeat and a different address seen in a later round (a block page, an
    // intermittent wrong answer) used to fall past a 6-line cap. Count the rounds that returned each.
    const byAddr = new Map<string, { address: string; rounds: number; ttlMin?: number; ttlMax?: number }>();
    for (const r of rs) {
      for (const a of new Set(r.answers)) {
        const [address, ttlPart] = a.split(" ttl=");
        const e = byAddr.get(address) ?? { address, rounds: 0 };
        e.rounds++;
        if (ttlPart !== undefined) {
          const ttl = Number(ttlPart);
          e.ttlMin = e.ttlMin === undefined ? ttl : Math.min(e.ttlMin, ttl);
          e.ttlMax = e.ttlMax === undefined ? ttl : Math.max(e.ttlMax, ttl);
        }
        byAddr.set(address, e);
      }
    }
    const answers = [...byAddr.values()].map((a) => ({ ...a, nonPublic: nonPublic(a.address) }));
    // The order of failures matters: a lone first-probe failure reads differently from a scattered one.
    const sequence = rs.map((r) => (r.ok ? "." : "x")).join("");
    return { resolver: name, pass, total: rs.length, codes, sequence, medianMs: Math.round(median(rs.map((r) => r.ms))), answers };
  });

  const soa = o.soa ? await findSoa(o.host, o.servers, o.timeout) : undefined;
  const anyFail = summary.some((s) => s.pass < s.total);

  if (o.json) {
    console.log(JSON.stringify({ host: o.host, type: o.type, started, count: o.count, summary, soa }, null, 2));
  } else {
    console.log(`${o.host} ${o.type} · ${o.count} probes per resolver · started ${started}`);
    for (const s of summary) {
      const codes = Object.entries(s.codes).map(([k, v]) => `${k}×${v}`).join(" ");
      console.log(`\n${s.resolver}: ${s.pass}/${s.total} answered · ${codes} · median ${s.medianMs} ms`);
      console.log(`  sequence ${s.sequence}   (. answered, x failed)`);
      for (const a of s.answers) {
        const ttl = a.ttlMin === undefined ? "" : a.ttlMin === a.ttlMax ? ` ttl=${a.ttlMin}` : ` ttl=${a.ttlMin}–${a.ttlMax}`;
        console.log(`  ${a.address}${ttl} · in ${a.rounds}/${s.pass} answered rounds${a.nonPublic ? " (non-public)" : ""}`);
      }
    }
    if (o.soa) {
      if (soa) {
        console.log(`\nSOA zone ${soa.zone} via ${soa.via} (ns ${soa.nsname}, serial ${soa.serial})`);
        console.log(`  negative-cache TTL at most ${soa.minimum}s (the SOA minimum field; the exact value is the`);
        console.log(`  SOA TTL in the authority section of an NXDOMAIN answer — dig / Resolve-DnsName show it)`);
      } else console.log("\nSOA: no zone apex answered — read it with your OS's DNS tool instead");
    }
    if (o.system) console.log("\nnote: the system path can answer from the OS cache and carries no TTL.");
  }
  process.exit(anyFail ? 1 : 0);
}

main();
