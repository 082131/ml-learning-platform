/**
 * GitHub Actions matrix expansion, as documented in "Running variations of jobs in a workflow":
 * 1. the cross product of the variables, the first variable varying slowest;
 * 2. exclude removes every combination that matches all key/value pairs of an exclude entry;
 * 3. each include entry is merged into every original combination it does not contradict (its pairs for
 *    original variables must match; added keys can be overwritten by later entries); if it fits none, it
 *    becomes a new combination.
 */
export type Combo = Record<string, string>;

export interface MatrixSpec {
  vars: Record<string, string[]>;
  exclude?: Combo[];
  include?: Combo[];
}

export function expandMatrix(spec: MatrixSpec): Combo[] {
  const keys = Object.keys(spec.vars);
  let combos: Combo[] = keys.length ? [{}] : [];
  for (const k of keys) combos = combos.flatMap((c) => spec.vars[k]!.map((v) => ({ ...c, [k]: v })));
  const matches = (c: Combo, e: Combo) => Object.entries(e).every(([k, v]) => c[k] === v);
  combos = combos.filter((c) => !(spec.exclude ?? []).some((e) => matches(c, e)));
  const original = combos.map((c) => ({ ...c }));
  const out = combos.map((c) => ({ ...c }));
  const extra: Combo[] = [];
  for (const inc of spec.include ?? []) {
    let applied = false;
    original.forEach((orig, i) => {
      const fits = Object.entries(inc).every(([k, v]) => !(k in orig) || orig[k] === v);
      if (fits) {
        Object.assign(out[i]!, inc);
        applied = true;
      }
    });
    if (!applied) extra.push({ ...inc });
  }
  return [...out, ...extra];
}

/** Wall-clock minutes when at most `parallel` jobs run at once, filling free slots in matrix order. */
export function wallClock(durations: number[], parallel: number): number {
  const slots = new Array<number>(Math.max(1, Math.min(parallel, durations.length || 1))).fill(0);
  for (const d of durations) {
    let i = 0;
    for (let j = 1; j < slots.length; j++) if (slots[j]! < slots[i]!) i = j;
    slots[i]! += d;
  }
  return Math.max(0, ...slots);
}
