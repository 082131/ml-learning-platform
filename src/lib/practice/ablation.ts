import type { ExperimentDef, ReadoutItem } from '../types';
import { LCG } from './lcg';
import { mean, stdev } from './stats';

/**
 * The ablation lesson's model: delivery minutes from several feature groups, fitted by least squares
 * (normal equations solved by Gaussian elimination). The data is synthetic with a known rule, so the
 * ablation can be checked against the truth. Mirrors the lesson's Python operation for operation.
 */
export const REGIONS = ['city', 'suburb', 'rural'] as const;
export type Region = (typeof REGIONS)[number];
const REGION_EFFECT: Record<Region, number> = { city: 0, suburb: 2, rural: 8 };

export interface DeliveryRow {
  orderId: number;
  km: number;
  stops: number;
  rain: number;
  region: Region;
  minutes: number;
}

export const ABLATION_DATA_SEED = 7;
export const ABLATION_ROWS = 200;
const RAIN_SHARE = 0.3;

export function makeRichDeliveries(n = ABLATION_ROWS, seed = ABLATION_DATA_SEED): DeliveryRow[] {
  const rng = new LCG(seed);
  const rows: DeliveryRow[] = [];
  for (let orderId = 0; orderId < n; orderId++) {
    const km = 0.5 + 14.5 * rng.random();
    const stops = Math.floor(rng.random() * 4);
    const rain = rng.random() < RAIN_SHARE ? 1 : 0;
    const region = REGIONS[Math.floor(rng.random() * 3)]!;
    const noise = 8 * rng.random() - 4;
    const minutes = 6 + 2.5 * km + 3 * stops + 7 * rain + REGION_EFFECT[region] + noise;
    rows.push({ orderId, km, stops, rain, region, minutes });
  }
  return rows;
}

export const COMPONENTS = ['distance', 'stops', 'rain', 'region', 'order_id'] as const;
export type Component = (typeof COMPONENTS)[number];

const COLUMNS: Record<Component, (r: DeliveryRow) => number[]> = {
  distance: (r) => [r.km],
  stops: (r) => [r.stops],
  rain: (r) => [r.rain],
  region: (r) => [r.region === 'suburb' ? 1 : 0, r.region === 'rural' ? 1 : 0],
  order_id: (r) => [r.orderId / 100],
};

export function features(r: DeliveryRow, used: Component[]): number[] {
  const x = [1];
  for (const name of used) x.push(...COLUMNS[name](r));
  return x;
}

/** Solves a·w = b by Gaussian elimination with partial pivoting (first maximum wins, as Python's max). */
export function solve(a: number[][], b: number[]): number[] {
  const n = b.length;
  const m = a.map((row, i) => [...row, b[i]!]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(m[r]![col]!) > Math.abs(m[pivot]![col]!)) pivot = r;
    [m[col], m[pivot]] = [m[pivot]!, m[col]!];
    for (let r = col + 1; r < n; r++) {
      const f = m[r]![col]! / m[col]![col]!;
      for (let c = col; c <= n; c++) m[r]![c]! -= f * m[col]![c]!;
    }
  }
  const w = new Array<number>(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = m[r]![n]!;
    for (let c = r + 1; c < n; c++) s -= m[r]![c]! * w[c]!;
    w[r] = s / m[r]![r]!;
  }
  return w;
}

export function fit(rows: DeliveryRow[], used: Component[]): number[] {
  const xs = rows.map((r) => features(r, used));
  const k = xs[0]!.length;
  const xtx = Array.from({ length: k }, () => new Array<number>(k).fill(0));
  const xty = new Array<number>(k).fill(0);
  xs.forEach((x, n) => {
    for (let i = 0; i < k; i++) {
      xty[i]! += x[i]! * rows[n]!.minutes;
      for (let j = 0; j < k; j++) xtx[i]![j]! += x[i]! * x[j]!;
    }
  });
  return solve(xtx, xty);
}

export function predict(w: number[], r: DeliveryRow, used: Component[]): number {
  let total = 0;
  features(r, used).forEach((x, i) => (total += w[i]! * x));
  return total;
}

export interface ValError {
  row: DeliveryRow;
  error: number;
}

/** Absolute validation errors for one seeded 75/25 split. */
export function valErrors(rows: DeliveryRow[], used: Component[], seed: number): ValError[] {
  const rng = new LCG(seed);
  const order = rng.shuffle(rows.map((_, i) => i));
  const nVal = Math.floor(rows.length / 4);
  const val = order.slice(0, nVal).map((i) => rows[i]!);
  const w = fit(
    order.slice(nVal).map((i) => rows[i]!),
    used,
  );
  return val.map((row) => ({ row, error: Math.abs(predict(w, row, used) - row.minutes) }));
}

export const mae = (errors: number[]) => {
  let total = 0;
  for (const e of errors) total += e;
  return total / errors.length;
};

export interface AblationState {
  /** Components in the baseline model. */
  used: Record<Component, boolean>;
  seeds: number;
}

export interface AblationRow {
  name: string;
  removed?: Component;
  scores: number[];
  mean: number;
  spread: number;
}

export interface SliceRow {
  region: Region;
  mae: number;
  count: number;
}

export interface AblationResult {
  rows: AblationRow[];
  slices: SliceRow[];
}

export const usedList = (s: AblationState) => COMPONENTS.filter((c) => s.used[c]);

export function computeAblation(s: AblationState, data: DeliveryRow[]): AblationResult {
  const baseline = usedList(s);
  const row = (removed?: Component): AblationRow => {
    const used = baseline.filter((c) => c !== removed);
    const scores = Array.from({ length: s.seeds }, (_, seed) =>
      mae(valErrors(data, used, seed).map((e) => e.error)),
    );
    return {
      name: removed ? `- ${removed}` : 'baseline',
      removed,
      scores,
      mean: mean(scores),
      spread: stdev(scores),
    };
  };
  const errors = valErrors(data, baseline, 0);
  const slices = REGIONS.map((region) => {
    const part = errors.filter((e) => e.row.region === region).map((e) => e.error);
    return { region, mae: mae(part), count: part.length };
  });
  return { rows: [row(), ...baseline.map((c) => row(c))], slices };
}

/** The lines the lesson's Python prints. */
export function printedLines(s: AblationState, r: AblationResult): string[] {
  return [
    `${'model'.padEnd(14)} val MAE over ${s.seeds} seeds`,
    ...r.rows.map((x) => `${x.name.padEnd(14)} ${x.mean.toFixed(3)} ± ${x.spread.toFixed(3)}`),
    ...r.slices.map((x) => `${x.region.padEnd(6)} MAE ${x.mae.toFixed(3)} on ${x.count} deliveries (seed 0)`),
  ];
}

/** Is a removal's effect larger than the seed-to-seed noise? Compares the change with both spreads. */
export function verdict(base: AblationRow, x: AblationRow): 'helps' | 'hurts' | 'within noise' {
  const delta = x.mean - base.mean;
  const noise = Math.max(base.spread, x.spread);
  if (Math.abs(delta) <= noise) return 'within noise';
  return delta > 0 ? 'helps' : 'hurts';
}

function readout(_s: AblationState, r: AblationResult): ReadoutItem[] {
  const base = r.rows[0]!;
  const ranked = r.rows.slice(1).sort((a, b) => b.mean - a.mean);
  const worst = [...r.slices].sort((a, b) => b.mae - a.mae)[0]!;
  return [
    { label: 'Baseline val MAE (minutes)', value: `${base.mean.toFixed(3)} ± ${base.spread.toFixed(3)}` },
    {
      label: 'Most important component',
      value: ranked[0]
        ? `${ranked[0].removed}: removing it adds ${(ranked[0].mean - base.mean).toFixed(3)} min`
        : 'no components in the baseline',
    },
    {
      label: 'Within seed noise',
      value:
        ranked
          .filter((x) => verdict(base, x) === 'within noise')
          .map((x) => x.removed)
          .join(', ') || 'none',
    },
    {
      label: 'Worst region (seed 0)',
      value: `${worst.region}: MAE ${worst.mae.toFixed(3)} on ${worst.count}`,
    },
  ];
}

export function ablationExperiment(
  id: string,
  initial: AblationState,
): ExperimentDef<AblationState, AblationResult> {
  const data = makeRichDeliveries();
  return {
    id,
    initial,
    controls: [
      ...COMPONENTS.map((c) => ({
        kind: 'select' as const,
        id: c,
        label: `Baseline: ${c}`,
        options: [
          { value: 'on', label: 'included' },
          { value: 'off', label: 'left out' },
        ],
        get: (s: AblationState) => (s.used[c] ? 'on' : 'off'),
        set: (s: AblationState, v: string) => ({ ...s, used: { ...s.used, [c]: v === 'on' } }),
      })),
      {
        kind: 'slider',
        id: 'seeds',
        label: 'Seeds (splits) per model',
        min: 1,
        max: 10,
        get: (s) => s.seeds,
        set: (s, seeds) => ({ ...s, seeds }),
      },
    ],
    compute: (s) => computeAblation(s, data),
    readout,
  };
}
