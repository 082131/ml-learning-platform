// Networking basics for ML workloads: CIDR arithmetic, and whether traffic can flow along a path in a small VPC
// (subnet routes, an internet gateway, a NAT gateway, an S3 gateway endpoint and a security group). The rules follow
// the Amazon VPC User Guide; Google Cloud has the same pieces under other names (see the lesson's table).

export interface Cidr {
  base: number;
  prefix: number;
}

export function ipToInt(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p) || Number(p) > 255) return null;
    n = n * 256 + Number(p);
  }
  return n;
}

export function intToIp(n: number): string {
  return [24, 16, 8, 0].map((s) => Math.floor(n / 2 ** s) % 256).join('.');
}

/** Parses "10.0.0.0/16". Returns null for malformed input or host bits set below the prefix. */
export function parseCidr(text: string): Cidr | null {
  const [ip, pre] = text.trim().split('/');
  if (ip === undefined || pre === undefined || !/^\d{1,2}$/.test(pre)) return null;
  const base = ipToInt(ip);
  const prefix = Number(pre);
  if (base === null || prefix > 32) return null;
  if (base % 2 ** (32 - prefix) !== 0) return null;
  return { base, prefix };
}

/** Addresses in the block: 2^(32 − prefix). */
export const blockSize = (c: Cidr) => 2 ** (32 - c.prefix);

/** AWS reserves 5 addresses per subnet (network, router, DNS, future use, broadcast); Google Cloud reserves 4. */
export const RESERVED = { aws: 5, gcp: 4 } as const;

export interface SubnetPlan {
  size: number;
  usableAws: number;
  count: number;
  first: string[];
  last: string;
}

/** Splits a VPC block into equal subnets with the new prefix. Null when the prefix is not longer than the block's. */
export function splitCidr(c: Cidr, newPrefix: number, show = 4): SubnetPlan | null {
  if (newPrefix < c.prefix || newPrefix > 28) return null;
  const size = 2 ** (32 - newPrefix);
  const count = 2 ** (newPrefix - c.prefix);
  const first = Array.from({ length: Math.min(show, count) }, (_, k) => `${intToIp(c.base + k * size)}/${newPrefix}`);
  return { size, usableAws: size - RESERVED.aws, count, first, last: `${intToIp(c.base + (count - 1) * size)}/${newPrefix}` };
}

export function contains(c: Cidr, ip: string): boolean {
  const n = ipToInt(ip);
  return n !== null && n >= c.base && n < c.base + blockSize(c);
}

// ---------- reachability ----------

export type InboundSource = 'none' | 'office' | 'anywhere';

export interface NetSetup {
  subnet: 'public' | 'private';
  publicIp: boolean;
  natGateway: boolean;
  s3Endpoint: boolean;
  /** Security group inbound rule for TCP 8888 (Jupyter). */
  inbound8888: InboundSource;
}

export interface Hop {
  label: string;
  ok: boolean;
  note: string;
}

export interface PathResult {
  id: 'pip' | 's3' | 'office' | 'stranger';
  title: string;
  reachable: boolean;
  /** For the stranger path, reachable is bad. */
  wanted: boolean;
  hops: Hop[];
  via?: string;
}

export interface NetResult {
  paths: PathResult[];
  /** Paths whose outcome is the opposite of what you want. */
  problems: number;
}

function internetOut(n: NetSetup): Hop[] {
  if (n.subnet === 'public')
    return [
      { label: 'Route 0.0.0.0/0', ok: true, note: 'public subnet: to the internet gateway' },
      { label: 'Public IP', ok: n.publicIp, note: n.publicIp ? 'the gateway translates it' : 'no public IP, so the internet gateway cannot carry its traffic' },
    ];
  return [{ label: 'Route 0.0.0.0/0', ok: n.natGateway, note: n.natGateway ? 'private subnet: to the NAT gateway, which uses its own public IP' : 'private subnet with no NAT gateway: no route out' }];
}

function inbound(n: NetSetup, from: 'office' | 'anywhere'): Hop[] {
  const sgOk = n.inbound8888 === 'anywhere' || (from === 'office' && n.inbound8888 === 'office');
  return [
    { label: 'Internet gateway in', ok: n.subnet === 'public', note: n.subnet === 'public' ? 'public subnet' : 'private subnet: nothing routes in from the internet (a NAT only allows replies to outbound traffic)' },
    { label: 'Public IP', ok: n.publicIp, note: n.publicIp ? 'addressable from the internet' : 'no public IP to connect to' },
    { label: 'Security group, TCP 8888', ok: sgOk, note: n.inbound8888 === 'none' ? 'no inbound rule: denied by default' : n.inbound8888 === 'office' ? `allows 203.0.113.0/24 only${from === 'office' ? '' : ', not this source'}` : 'allows 0.0.0.0/0: anyone' },
  ];
}

const allOk = (hops: Hop[]) => hops.every((h) => h.ok);

export function reachability(n: NetSetup): NetResult {
  const pipHops = [{ label: 'Security group out', ok: true, note: 'all outbound allowed (the default)' }, ...internetOut(n)];
  const s3Hops: Hop[] = n.s3Endpoint
    ? [
        { label: 'Security group out', ok: true, note: 'all outbound allowed (the default)' },
        { label: 'Route to S3 prefix list', ok: true, note: 'gateway endpoint: stays on the AWS network, no NAT charge' },
      ]
    : pipHops;
  const paths: PathResult[] = [
    { id: 'pip', title: 'The instance installs packages from the internet', reachable: allOk(pipHops), wanted: true, hops: pipHops },
    { id: 's3', title: 'The instance reads training data from S3', reachable: allOk(s3Hops), wanted: true, hops: s3Hops, via: n.s3Endpoint ? 'endpoint' : n.subnet === 'private' ? 'NAT gateway' : 'internet gateway' },
    { id: 'office', title: 'You open Jupyter from the office', reachable: allOk(inbound(n, 'office')), wanted: true, hops: inbound(n, 'office') },
    { id: 'stranger', title: 'A stranger on the internet opens Jupyter', reachable: allOk(inbound(n, 'anywhere')), wanted: false, hops: inbound(n, 'anywhere') },
  ];
  // Direct access from the office is a convenience, not a requirement (a VPN or port forwarding also works), so it
  // never counts as a problem.
  return { paths, problems: paths.filter((p) => p.id !== 'office' && p.reachable !== p.wanted).length };
}
