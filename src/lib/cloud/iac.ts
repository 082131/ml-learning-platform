// What `terraform plan` decides, in miniature. Terraform compares three things: the configuration (what you want),
// the state file (what it created last time) and the real resources (refreshed from the cloud API). Changed
// arguments update a resource in place, unless the provider marks the argument as forcing a new resource, in which
// case Terraform destroys it and creates a replacement. Symbols and the summary line follow Terraform's own output.

export type Attrs = Record<string, string>;

export interface Resource {
  address: string;
  type: string;
  attrs: Attrs;
}

export type Action = 'create' | 'update' | 'replace' | 'delete' | 'no-op';

export interface PlannedChange {
  address: string;
  action: Action;
  /** Changed arguments: [name, before, after, forcesReplacement]. */
  diffs: [string, string, string, boolean][];
}

export interface Drift {
  address: string;
  attr: string;
  inState: string;
  inCloud: string;
}

export interface PlanResult {
  changes: PlannedChange[];
  drift: Drift[];
  add: number;
  change: number;
  destroy: number;
  /** "Plan: 1 to add, 0 to change, 1 to destroy." or the prevent_destroy error. */
  summary: string;
  error: string | null;
}

/** Arguments that cannot be changed in place for these resource types (from the AWS provider docs). */
export const FORCES_NEW: Record<string, string[]> = {
  aws_s3_bucket: ['bucket'],
  aws_s3_bucket_versioning: ['bucket'],
  aws_instance: ['ami'],
};

/** Shown for an argument that refers to a resource being replaced: its new value exists only after apply. */
export const KNOWN_AFTER_APPLY = '(known after apply)';

export const SYMBOL: Record<Action, string> = { create: '+', update: '~', replace: '-/+', delete: '-', 'no-op': ' ' };

const byAddress = (rs: Resource[]) => new Map(rs.map((r) => [r.address, r]));

/** A reference to another resource's attribute, written without quotes in HCL (aws_s3_bucket.data.id). */
const isRef = (v: string) => /^aws_\w+\.\w+\.\w+$/.test(v);

/** The current value behind a reference such as aws_s3_bucket.data.id (a bucket's id is its name). */
function resolve(ref: string, known: Map<string, Resource>): string {
  const m = /^(\w+\.\w+)\.id$/.exec(ref);
  const r = m ? known.get(m[1]!) : undefined;
  return r?.attrs.bucket ?? ref;
}

export function plan(config: Resource[], state: Resource[], cloud: Resource[], preventDestroy: string[] = []): PlanResult {
  const st = byAddress(state);
  const real = byAddress(cloud);
  const drift: Drift[] = [];
  for (const [addr, s] of st) {
    const r = real.get(addr);
    if (!r) continue;
    for (const [k, v] of Object.entries(s.attrs)) if (r.attrs[k] !== v) drift.push({ address: addr, attr: k, inState: v, inCloud: r.attrs[k] ?? '(unset)' });
  }
  // Refresh: what Terraform believes after reading the cloud. Resources deleted outside Terraform drop out of state.
  const refreshed = new Map([...st].filter(([a]) => real.has(a)).map(([a]) => [a, real.get(a)!]));
  const want = byAddress(config);
  const changes: PlannedChange[] = [];
  for (const c of config) {
    const have = refreshed.get(c.address);
    if (!have) {
      changes.push({ address: c.address, action: 'create', diffs: Object.entries(c.attrs).map(([k, v]) => [k, '(none)', isRef(v) ? KNOWN_AFTER_APPLY : v, false]) });
      continue;
    }
    const diffs: PlannedChange['diffs'] = [];
    for (const [k, v] of Object.entries(c.attrs))
      if (have.attrs[k] !== v) diffs.push([k, have.attrs[k] ?? '(unset)', v, (FORCES_NEW[c.type] ?? []).includes(k)]);
    const action: Action = diffs.length === 0 ? 'no-op' : diffs.some((d) => d[3]) ? 'replace' : 'update';
    changes.push({ address: c.address, action, diffs });
  }
  // A reference such as aws_s3_bucket.data.id changes when that resource is replaced, so the referring resource is
  // updated too, or replaced if the argument forces a new resource. Repeat until nothing new is replaced.
  for (let changed = true; changed; ) {
    changed = false;
    const replaced = changes.filter((c) => c.action === 'replace').map((c) => c.address);
    for (const c of changes) {
      if (c.action === 'create' || c.action === 'replace') continue;
      const res = want.get(c.address)!;
      for (const [k, v] of Object.entries(res.attrs)) {
        if (!replaced.some((a) => v.startsWith(`${a}.`)) || c.diffs.some((d) => d[0] === k)) continue;
        const forces = (FORCES_NEW[res.type] ?? []).includes(k);
        c.diffs.push([k, resolve(v, refreshed), KNOWN_AFTER_APPLY, forces]);
        const next: Action = forces ? 'replace' : 'update';
        if (next !== c.action) {
          c.action = next;
          changed = changed || next === 'replace';
        }
      }
    }
  }
  for (const [addr, r] of refreshed)
    if (!want.has(addr)) changes.push({ address: addr, action: 'delete', diffs: Object.entries(r.attrs).map(([k, v]) => [k, v, '(none)', false]) });
  const count = (...as: Action[]) => changes.filter((c) => as.includes(c.action)).length;
  const add = count('create', 'replace');
  const change = count('update');
  const destroy = count('delete', 'replace');
  const blocked = changes.find((c) => (c.action === 'delete' || c.action === 'replace') && preventDestroy.includes(c.address));
  const error = blocked
    ? `Error: Instance cannot be destroyed. Resource ${blocked.address} has lifecycle.prevent_destroy set, but the plan calls for this resource to be destroyed.`
    : null;
  const summary = error ?? (add + change + destroy === 0 ? 'No changes. Your infrastructure matches the configuration.' : `Plan: ${add} to add, ${change} to change, ${destroy} to destroy.`);
  return { changes, drift, add, change, destroy, summary, error };
}

/** The configuration as HCL, for the code view. A dotted key (versioning_configuration.status) is a nested block. */
export function toHcl(config: Resource[], preventDestroy: string[] = []): string {
  const value = (v: string) => (isRef(v) ? v : `"${v}"`);
  return config
    .map((r) => {
      const [type, name] = r.address.split('.');
      const flat = Object.entries(r.attrs).filter(([k]) => !k.includes('.'));
      const width = Math.max(0, ...flat.map(([k]) => k.length));
      const body = flat.map(([k, v]) => `  ${k.padEnd(width)} = ${value(v)}`);
      const blocks = new Map<string, [string, string][]>();
      for (const [k, v] of Object.entries(r.attrs)) {
        if (!k.includes('.')) continue;
        const [block, key] = k.split('.') as [string, string];
        blocks.set(block, [...(blocks.get(block) ?? []), [key, v]]);
      }
      for (const [block, kvs] of blocks) body.push(`  ${block} {`, ...kvs.map(([k, v]) => `    ${k} = ${value(v)}`), '  }');
      if (preventDestroy.includes(r.address)) body.push('', '  lifecycle {', '    prevent_destroy = true', '  }');
      return `resource "${type}" "${name}" {\n${body.join('\n')}\n}`;
    })
    .join('\n\n');
}
