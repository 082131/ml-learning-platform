import type { ExperimentDef, ReadoutItem } from '../types';
import type { FlowEdge, FlowNode, NodeStatus } from '../viz/flow';
import { makeRichDeliveries, REGIONS, solve, type Region } from './ablation';
import { LCG } from './lcg';
import { pyFixed, pyFloat } from './pyFormat';

/**
 * The model-testing lesson's evaluation pipeline: data checks gate training, then behavior tests,
 * a metric gate with a bootstrap interval and per-region slice gates decide the release. Faults can
 * be injected into the data or the serving code. Mirrors the lesson's Python operation for operation,
 * so every detail string is what that program prints.
 */
export const DATA_FAULTS = ['none', 'missing_km', 'km_in_meters', 'leaked_label', 'train_on_all'] as const;
export type DataFault = (typeof DATA_FAULTS)[number];
export const SERVING_FAULTS = ['none', 'stops_dropped', 'region_ignored'] as const;
export type ServingFault = (typeof SERVING_FAULTS)[number];

export interface TestingState {
  dataFault: DataFault;
  servingFault: ServingFault;
  maxMae: number;
  maxSliceMae: number;
}

interface Row {
  order_id: number;
  km: number | null;
  stops: number;
  rain: number;
  region: Region;
  minutes: number;
  logged_minutes?: number;
}
type Column = 'km' | 'stops' | 'rain' | 'logged_minutes';
type Request = Omit<Row, 'order_id' | 'minutes'>;

export const VAL_ROWS = 50;
export const BOOTSTRAP_RESAMPLES = 1000;
export const LEAK_LIMIT = 0.95;
const BOOTSTRAP_SEED = 1;
const SPLIT_SEED = 0;

function makeRows(fault: DataFault): Row[] {
  const rows: Row[] = makeRichDeliveries().map((r) => ({
    order_id: r.orderId,
    km: r.km,
    stops: r.stops,
    rain: r.rain,
    region: r.region,
    minutes: r.minutes,
  }));
  if (fault === 'missing_km') for (let i = 10; i < 60; i += 10) rows[i]!.km = null;
  if (fault === 'km_in_meters') for (const r of rows.slice(150)) r.km = r.km! * 1000;
  if (fault === 'leaked_label') for (const r of rows) r.logged_minutes = Math.trunc(r.minutes);
  return rows;
}

const numericColumns = (rows: Row[]): Column[] =>
  rows[0]!.logged_minutes === undefined ? ['km', 'stops', 'rain'] : ['km', 'stops', 'rain', 'logged_minutes'];

function features(r: Request, columns: Column[]): number[] {
  return [1, ...columns.map((c) => r[c]!), r.region === 'suburb' ? 1 : 0, r.region === 'rural' ? 1 : 0];
}

function fit(rows: Row[], columns: Column[]): number[] {
  const xs = rows.map((r) => features(r, columns));
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

function serve(w: number[], request: Request, columns: Column[], fault: ServingFault): number {
  const r = { ...request };
  if (fault === 'stops_dropped') r.stops = 0;
  if (fault === 'region_ignored') r.region = 'city';
  let total = 0;
  features(r, columns).forEach((x, i) => (total += w[i]! * x));
  return total;
}

function mean(values: number[]): number {
  let total = 0;
  for (const v of values) total += v;
  return total / values.length;
}

function corr(xs: number[], ys: number[]): number {
  const mx = mean(xs);
  const my = mean(ys);
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  xs.forEach((x, i) => {
    const y = ys[i]!;
    sxy += (x - mx) * (y - my);
    sxx += (x - mx) * (x - mx);
    syy += (y - my) * (y - my);
  });
  return sxy / Math.sqrt(sxx * syy);
}

function schemaErrors(rows: Row[]): string[] {
  const bad: string[] = [];
  for (const r of rows) {
    if (r.km === null || !(r.km > 0 && r.km <= 50))
      bad.push(`order ${r.order_id}: km=${r.km === null ? 'None' : pyFloat(r.km)}`);
    else if (!(Number.isInteger(r.stops) && r.stops >= 0 && r.stops <= 10) || (r.rain !== 0 && r.rain !== 1))
      bad.push(`order ${r.order_id}: bad category`);
  }
  return bad;
}

export function bootstrapMae(errors: number[], resamples: number, seed: number): [number, number] {
  const rng = new LCG(seed);
  const means: number[] = [];
  for (let b = 0; b < resamples; b++) {
    const sample = errors.map(() => errors[Math.floor(rng.random() * errors.length)]!);
    means.push(mean(sample));
  }
  means.sort((a, b) => a - b);
  return [means[Math.floor(0.025 * resamples)]!, means[Math.floor(0.975 * resamples) - 1]!];
}

export type Stage = 'data' | 'train' | 'behav' | 'gate';
export interface Check {
  stage: Stage;
  name: string;
  passed: boolean;
  detail: string;
}

export interface TestingResult {
  checks: Check[];
  /** Checks that never ran because a data check failed first. */
  skipped: { stage: Stage; name: string }[];
  mae: number | null;
  interval: [number, number] | null;
  failed: string[];
}

const ALL_CHECKS: { stage: Stage; name: string }[] = [
  { stage: 'data', name: 'schema' },
  { stage: 'data', name: 'label leak' },
  { stage: 'data', name: 'split overlap' },
  { stage: 'train', name: 'smoke' },
  { stage: 'behav', name: '+1 km' },
  { stage: 'behav', name: '+1 stop' },
  { stage: 'behav', name: 'rain' },
  { stage: 'behav', name: 'rural vs city' },
  { stage: 'gate', name: 'val MAE' },
  ...REGIONS.map((r) => ({ stage: 'gate' as const, name: `slice ${r}` })),
];

export function runPipeline(s: TestingState): TestingResult {
  const rows = makeRows(s.dataFault);
  const order = rows.map((_, i) => i);
  new LCG(SPLIT_SEED).shuffle(order);
  const val = order.slice(0, VAL_ROWS).map((i) => rows[i]!);
  let train = order.slice(VAL_ROWS).map((i) => rows[i]!);
  if (s.dataFault === 'train_on_all') train = [...train, ...val];
  const columns = numericColumns(rows);
  const checks: Check[] = [];
  let mae: number | null = null;
  let interval: [number, number] | null = null;
  const check = (stage: Stage, name: string, passed: boolean, detail: string) => {
    checks.push({ stage, name, passed, detail });
    return passed;
  };

  const run = () => {
    const bad = schemaErrors(rows);
    if (
      !check(
        'data',
        'schema',
        bad.length === 0,
        `${bad.length} bad rows${bad.length ? `, first ${bad[0]}` : ''}`,
      )
    )
      return;
    const y = rows.map((r) => r.minutes);
    const strength = (c: Column) =>
      Math.abs(
        corr(
          rows.map((r) => r[c]!),
          y,
        ),
      );
    let top = columns[0]!;
    for (const c of columns) if (strength(c) > strength(top)) top = c;
    const topCorr = strength(top);
    if (!check('data', 'label leak', topCorr < LEAK_LIMIT, `max |corr| ${pyFixed(topCorr, 3)} (${top})`))
      return;
    const trainIds = new Set(train.map((r) => r.order_id));
    const shared = new Set(val.filter((r) => trainIds.has(r.order_id)).map((r) => r.order_id)).size;
    if (!check('data', 'split overlap', shared === 0, `${shared} orders in both train and val`)) return;

    const w = fit(train, columns);
    const preds = val.map((r) => serve(w, r, columns, s.servingFault));
    const finite = preds.filter((p) => Number.isFinite(p)).length;
    check('train', 'smoke', finite === val.length, `${finite}/${val.length} finite predictions`);

    const base: Request = { km: 5, stops: 1, rain: 0, region: 'city' };
    const p0 = serve(w, base, columns, s.servingFault);
    const effect = (change: Partial<Request>) =>
      serve(w, { ...base, ...change }, columns, s.servingFault) - p0;
    let d = effect({ km: 6 });
    check('behav', '+1 km', d >= 1 && d <= 5, `${pyFixed(d, 2, true)} min (expect 1 to 5)`);
    d = effect({ stops: 2 });
    check('behav', '+1 stop', d > 0, `${pyFixed(d, 2, true)} min (expect > 0)`);
    d = effect({ rain: 1 });
    check('behav', 'rain', d > 0, `${pyFixed(d, 2, true)} min (expect > 0)`);
    d = effect({ region: 'rural' });
    check('behav', 'rural vs city', d > 0, `${pyFixed(d, 2, true)} min (expect > 0)`);

    const errors = preds.map((p, i) => Math.abs(p - val[i]!.minutes));
    interval = bootstrapMae(errors, BOOTSTRAP_RESAMPLES, BOOTSTRAP_SEED);
    mae = mean(errors);
    check(
      'gate',
      'val MAE',
      mae <= s.maxMae,
      `${pyFixed(mae, 2)}, 95% CI ${pyFixed(interval[0], 2)} to ${pyFixed(interval[1], 2)} (max ${pyFloat(s.maxMae)})`,
    );
    for (const region of REGIONS) {
      const part = errors.filter((_, i) => val[i]!.region === region);
      const sm = mean(part);
      check(
        'gate',
        `slice ${region}`,
        sm <= s.maxSliceMae,
        `${pyFixed(sm, 2)} on ${part.length} (max ${pyFloat(s.maxSliceMae)})`,
      );
    }
  };
  run();
  const ran = new Set(checks.map((c) => `${c.stage} ${c.name}`));
  return {
    checks,
    skipped: ALL_CHECKS.filter((c) => !ran.has(`${c.stage} ${c.name}`)),
    mae,
    interval,
    failed: checks.filter((c) => !c.passed).map((c) => `${c.stage} ${c.name}`),
  };
}

/** One printed line per check, then the release decision, as the lesson's Python prints them. */
export const checkLine = (c: Check) =>
  `${c.stage.padEnd(6)} ${c.name.padEnd(14)} ${c.passed ? 'PASS' : 'FAIL'}  ${c.detail}`;
export const releaseLine = (r: TestingResult) =>
  r.failed.length === 0 ? 'RELEASE: ship' : `RELEASE: blocked by ${r.failed.join(', ')}`;
export const printedLines = (r: TestingResult) => [...r.checks.map(checkLine), releaseLine(r)];

const STAGE_NODES: { id: string; label: string; stages: Stage[]; names?: (n: string) => boolean }[] = [
  { id: 'data', label: 'data checks', stages: ['data'] },
  { id: 'train', label: 'train + smoke', stages: ['train'] },
  { id: 'behav', label: 'behavior tests', stages: ['behav'] },
  { id: 'metric', label: 'metric gate', stages: ['gate'], names: (n) => n === 'val MAE' },
  { id: 'slices', label: 'slice gates', stages: ['gate'], names: (n) => n.startsWith('slice') },
];

function stageSummary(r: TestingResult, node: (typeof STAGE_NODES)[number]) {
  const pick = (c: { stage: Stage; name: string }) =>
    node.stages.includes(c.stage) && (!node.names || node.names(c.name));
  const ran = r.checks.filter(pick);
  const total = ALL_CHECKS.filter(pick).length;
  if (ran.length === 0) return { status: 'idle' as NodeStatus, detail: 'not run' };
  const failed = ran.filter((c) => !c.passed).length;
  if (failed) return { status: 'error' as NodeStatus, detail: `${failed} of ${total} failed` };
  if (ran.length < total) return { status: 'error' as NodeStatus, detail: 'stopped' };
  return { status: 'ok' as NodeStatus, detail: `${total} passed` };
}

/** The pipeline as a FlowDiagram: a two-column snake (narrow enough for a phone) ending in the release decision. */
export function pipelineGraph(r: TestingResult): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const W = 140;
  const at: Record<string, [number, number]> = {
    data: [0, 0],
    train: [200, 0],
    behav: [200, 100],
    metric: [0, 100],
    slices: [0, 200],
  };
  const nodes: FlowNode[] = STAGE_NODES.map((n) => ({
    id: n.id,
    label: n.label,
    x: at[n.id]![0],
    y: at[n.id]![1],
    w: W,
    ...stageSummary(r, n),
  }));
  const ship = r.failed.length === 0;
  nodes.push({
    id: 'release',
    label: 'release',
    detail: ship ? 'ship' : 'blocked',
    x: 200,
    y: 200,
    w: W,
    status: ship ? 'ok' : 'error',
  });
  const edges: FlowEdge[] = [
    { from: 'data', to: 'train', fromSide: 'right', toSide: 'left' },
    { from: 'train', to: 'behav', fromSide: 'bottom', toSide: 'top' },
    { from: 'behav', to: 'metric', fromSide: 'left', toSide: 'right' },
    { from: 'metric', to: 'slices', fromSide: 'bottom', toSide: 'top' },
    { from: 'slices', to: 'release', fromSide: 'right', toSide: 'left' },
  ];
  return { nodes, edges };
}

function readout(_s: TestingState, r: TestingResult): ReadoutItem[] {
  return [
    {
      label: 'Release decision',
      value: releaseLine(r),
      status: r.failed.length ? 'error' : 'ok',
    },
    {
      label: 'Validation MAE (minutes)',
      value:
        r.mae === null || r.interval === null
          ? 'not computed: the model was not trained'
          : `${pyFixed(r.mae, 2)}, 95% bootstrap interval ${pyFixed(r.interval[0], 2)} to ${pyFixed(r.interval[1], 2)}`,
    },
    {
      label: 'Checks',
      value: `${r.checks.filter((c) => c.passed).length} passed, ${r.failed.length} failed, ${r.skipped.length} not run`,
    },
  ];
}

const FAULT_LABELS: Record<DataFault | ServingFault, string> = {
  none: 'none',
  missing_km: 'missing distances',
  km_in_meters: 'a batch in meters',
  leaked_label: 'label leaked into a column',
  train_on_all: 'validation rows in training',
  stops_dropped: 'stops not sent (0)',
  region_ignored: 'region not sent (city)',
};

export function testingExperiment(
  id: string,
  initial: TestingState,
): ExperimentDef<TestingState, TestingResult> {
  return {
    id,
    initial,
    controls: [
      {
        kind: 'select',
        id: 'data-fault',
        label: 'Data fault',
        options: DATA_FAULTS.map((f) => ({ value: f, label: FAULT_LABELS[f] })),
        get: (s) => s.dataFault,
        set: (s, v) => ({ ...s, dataFault: v as DataFault }),
      },
      {
        kind: 'select',
        id: 'serving-fault',
        label: 'Serving fault',
        options: SERVING_FAULTS.map((f) => ({ value: f, label: FAULT_LABELS[f] })),
        get: (s) => s.servingFault,
        set: (s, v) => ({ ...s, servingFault: v as ServingFault }),
      },
      {
        kind: 'slider',
        id: 'max-mae',
        label: 'Gate: max val MAE',
        min: 1.5,
        max: 5,
        step: 0.1,
        get: (s) => s.maxMae,
        set: (s, v) => ({ ...s, maxMae: Math.round(v * 10) / 10 }),
        format: (v) => v.toFixed(1),
      },
      {
        kind: 'slider',
        id: 'max-slice-mae',
        label: 'Gate: max slice MAE',
        min: 1.5,
        max: 8,
        step: 0.5,
        get: (s) => s.maxSliceMae,
        set: (s, v) => ({ ...s, maxSliceMae: Math.round(v * 10) / 10 }),
        format: (v) => v.toFixed(1),
      },
    ],
    compute: runPipeline,
    readout,
  };
}
