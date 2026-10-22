import type { ExperimentDef, ReadoutItem, Trace, TraceStep } from '../types';
import { scalar, text } from '../trace/values';
import {
  batchingPrintout,
  capacity,
  simulate,
  type BatchingConfig,
  type BatchingRun,
} from './batching';
import { pyFixed } from './format';

export const MAX_BATCH_LIMIT = 32;
/** Batches the step-through walks one by one before it jumps to the results. */
export const BATCHES_TRACED = 4;

export interface SweepPoint {
  maxBatch: number;
  p50: number;
  p95: number;
  throughput: number;
}

export interface BatchingResult {
  run: BatchingRun;
  /** The same traffic and settings for every max_batch from 1 to MAX_BATCH_LIMIT. */
  sweep: SweepPoint[];
  capacity: number;
}

export function computeBatching(c: BatchingConfig): BatchingResult {
  const run = simulate(c);
  const sweep = Array.from({ length: MAX_BATCH_LIMIT }, (_, k) => {
    const r = k + 1 === c.maxBatch ? run : simulate({ ...c, maxBatch: k + 1 }, run.arrivals);
    return { maxBatch: k + 1, p50: r.p50, p95: r.p95, throughput: r.throughput };
  });
  return { run, sweep, capacity: capacity(c) };
}

const ms = (x: number) => pyFixed(x, 2);

/** A computed trace: the settings, the arrivals, the first few batches step by step, then the results. */
export function buildBatchingTrace(c: BatchingConfig): Trace {
  const r = simulate(c);
  const steps: TraceStep[] = [];
  const vars: TraceStep['vars'] = {};
  const step = (line: number, note: string, set: TraceStep['vars'] = {}) => {
    Object.assign(vars, set);
    steps.push({ range: { line }, vars: { ...vars }, note });
  };
  step(13, `${c.n} requests arriving at ${c.rate} per second on average, random stream number ${c.seed}.`, {
    rate: scalar(c.rate),
    n: scalar(c.n),
  });
  step(14, `Send a batch at ${c.maxBatch} requests, or when the oldest has waited ${c.maxWait} ms.`, {
    max_batch: scalar(c.maxBatch),
    max_wait: scalar(c.maxWait),
  });
  step(15, `Assumed service time: ${c.t0} + ${c.perItem} · batch ms. A batch of ${c.maxBatch} takes ${c.t0 + c.perItem * c.maxBatch} ms.`, {
    t0: scalar(c.t0),
    per_item: scalar(c.perItem),
  });
  const first = r.arrivals.slice(0, 6).map(ms).join(', ');
  step(20, `Each gap is −ln(1 − u) / ${c.rate} s for a random u: on average ${pyFixed(1000 / c.rate, 1)} ms, but often much shorter or longer. The first arrivals (ms): ${first}, …`, {
    arrivals: text(`[${first}, …] (${c.n} values)`),
  });
  let freeAt = 0;
  for (const [b, batch] of r.batches.slice(0, BATCHES_TRACED).entries()) {
    const i = batch.from;
    const fullIdx = i + c.maxBatch - 1;
    const fullAt = fullIdx < c.n ? r.arrivals[fullIdx]! : Infinity;
    const deadline = r.arrivals[i]! + c.maxWait;
    step(25, `Batch ${b + 1}: the oldest waiting request is number ${i}. The batch would be full when request ${fullIdx} arrives, at ${ms(fullAt)} ms.`, {
      i: scalar(i),
      full_at: scalar(Number(ms(fullAt))),
    });
    const why =
      batch.start === freeAt && freeAt > Math.min(fullAt, deadline)
        ? 'the replica is still busy, so it starts when the replica is free'
        : fullAt <= deadline
          ? 'the batch fills before the wait runs out'
          : `request ${i} has waited ${c.maxWait} ms`;
    step(26, `start = max(${ms(freeAt)}, min(${ms(fullAt)}, ${ms(r.arrivals[i]!)} + ${c.maxWait})) = ${ms(batch.start)} ms: ${why}.`, {
      start: scalar(Number(ms(batch.start))),
    });
    const size = batch.to - batch.from;
    step(28, `Requests ${i} to ${batch.to - 1} have arrived by ${ms(batch.start)} ms: a batch of ${size}.`, { j: scalar(batch.to) });
    const service = c.t0 + c.perItem * size;
    step(30, `service = ${c.t0} + ${c.perItem} · ${size} = ${service} ms.`, { service: scalar(service) });
    freeAt = batch.finish;
    step(31, `The batch finishes at ${ms(batch.start)} + ${service} = ${ms(freeAt)} ms. Request ${i} waited ${ms(freeAt - r.arrivals[i]!)} ms in total.`, {
      free_at: scalar(Number(ms(freeAt))),
    });
  }
  step(24, `The loop runs the same way for the other ${r.batches.length - BATCHES_TRACED} batches (not stepped here).`, {
    i: scalar(c.n),
    batches: text(`${r.batches.length} batches`),
  });
  step(41, `The run lasts ${ms(r.span)} ms from the first arrival to the last finish.`, { span: scalar(Number(ms(r.span))) });
  const out = batchingPrintout(r);
  out.forEach((line, k) => step(42 + k, `Prints "${line.replace(/\s+/g, ' ')}".`, { output: text(out.slice(0, k + 1).join('\n')) }));
  return { source: 'computed', steps };
}

export function batchingReadout(c: BatchingConfig, r: BatchingResult): ReadoutItem[] {
  const overloaded = c.rate > r.capacity;
  return [
    { label: 'Python: what the code prints', value: batchingPrintout(r.run).join('\n') },
    {
      label: `Capacity at max_batch ${c.maxBatch} (service-time model)`,
      value: `${pyFixed(r.capacity, 1)} req/s = 1000 · ${c.maxBatch} / (${c.t0} + ${c.perItem} · ${c.maxBatch})`,
    },
    {
      label: 'Load',
      value: overloaded
        ? `Overloaded: ${c.rate} req/s arrive, at most ${pyFixed(r.capacity, 1)} can be served.\nThe queue grows for as long as the run lasts.`
        : `${pyFixed((100 * c.rate) / r.capacity, 0)}% of capacity`,
    },
  ];
}

export function batchingExperiment(
  id: string,
  initial: BatchingConfig,
  traceExample?: string,
): ExperimentDef<BatchingConfig, BatchingResult> {
  const slider = (
    key: 'rate' | 'maxBatch' | 'maxWait' | 't0' | 'perItem' | 'seed',
    label: string,
    min: number,
    max: number,
    step = 1,
  ) =>
    ({
      kind: 'slider',
      id: key,
      label,
      min,
      max,
      step,
      get: (s: BatchingConfig) => s[key],
      set: (s: BatchingConfig, v: number) => ({ ...s, [key]: v }),
    }) as const;
  return {
    id,
    initial,
    controls: [
      slider('rate', 'Arrival rate (requests/s)', 5, 250, 5),
      slider('maxBatch', 'Max batch size', 1, MAX_BATCH_LIMIT),
      slider('maxWait', 'Max wait (ms)', 0, 100),
      slider('t0', 'Service time per batch, t0 (ms)', 1, 50),
      slider('perItem', 'Service time per request (ms)', 0.5, 10, 0.5),
      slider('seed', 'Random seed', 1, 20),
    ],
    compute: computeBatching,
    trace: buildBatchingTrace,
    traceExample,
    readout: batchingReadout,
  };
}
