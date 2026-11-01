import { normal, seededRandom } from '../classical/random';
import type { ExperimentDef, ReadoutItem } from '../types';
import { pyFixed } from './format';

/** NumPy's default percentile (method "linear"): interpolate between the two nearest ranks. */
export function percentile(values: readonly number[], p: number): number {
  const s = [...values].sort((a, b) => a - b);
  if (s.length === 0) return NaN;
  const pos = ((s.length - 1) * p) / 100;
  const lo = Math.floor(pos);
  const hi = Math.min(lo + 1, s.length - 1);
  return s[lo]! + (s[hi]! - s[lo]!) * (pos - lo);
}

// ---- A benchmark of a simulated GPU model call ----

/**
 * A stated latency model, not a measurement. Call k of a freshly loaded model takes
 * 12 · exp(0.15 · z) ms on the GPU (z standard normal), plus one-time costs on the first three calls
 * (900, 60 and 15 ms: CUDA context, kernel selection, allocator growth), plus a 40 ms stall on every
 * 100th call (for example a garbage-collection pause). Without synchronization the timer only sees the
 * CPU queueing the kernels: 0.25 · exp(0.1 · z) ms, plus the first call's 900 ms of setup.
 */
export const GPU_MEDIAN_MS = 12;
export const COLD_MS = [900, 60, 15];
export const STALL_EVERY = 100;
export const STALL_MS = 40;
export const LAUNCH_MS = 0.25;

export interface BenchState {
  samples: number;
  warmup: number;
  sync: 'yes' | 'no';
  seed: number;
}

export interface BenchResult {
  times: number[];
  mean: number;
  p50: number;
  p95: number;
  p99: number;
  max: number;
  /** True per-call GPU time of the measured calls, for comparison (known only in a simulation). */
  trueMean: number;
}

export function simulateCalls(n: number, seed: number) {
  const rand = seededRandom(seed);
  return Array.from({ length: n }, (_, k) => {
    const gpu =
      GPU_MEDIAN_MS * Math.exp(0.15 * normal(rand)) +
      (COLD_MS[k] ?? 0) +
      (k % STALL_EVERY === STALL_EVERY - 1 ? STALL_MS : 0);
    const launch = LAUNCH_MS * Math.exp(0.1 * normal(rand)) + (k === 0 ? COLD_MS[0]! : 0);
    return { gpu, launch };
  });
}

export function runBench(s: BenchState): BenchResult {
  const calls = simulateCalls(s.warmup + s.samples, s.seed).slice(s.warmup);
  const times = calls.map((c) => (s.sync === 'yes' ? c.gpu : c.launch));
  return {
    times,
    mean: times.reduce((a, b) => a + b, 0) / times.length,
    p50: percentile(times, 50),
    p95: percentile(times, 95),
    p99: percentile(times, 99),
    max: Math.max(...times),
    trueMean: calls.reduce((a, c) => a + c.gpu, 0) / calls.length,
  };
}

export const BENCH_SOURCE = `import time
import numpy as np
import torch

with torch.inference_mode():
    for _ in range({{warmup}}):                         # warm-up calls, not timed
        model(x)
    torch.cuda.synchronize()
    times = []
    for _ in range({{samples}}):
        t0 = time.perf_counter()
        model(x)
{{sync}}
        times.append((time.perf_counter() - t0) * 1e3)   # ms

print(f"mean {np.mean(times):.2f}  p50 {np.percentile(times, 50):.2f}  "
      f"p95 {np.percentile(times, 95):.2f}  p99 {np.percentile(times, 99):.2f}  max {max(times):.2f} ms")`;

export const benchSlots = (s: BenchState): Record<string, string> => ({
  warmup: String(s.warmup),
  samples: String(s.samples),
  sync:
    s.sync === 'yes'
      ? '        torch.cuda.synchronize()                    # wait for the GPU to finish'
      : '        # no synchronize: the GPU may still be working',
});

export const benchLine = (r: BenchResult) =>
  `mean ${pyFixed(r.mean, 2)}  p50 ${pyFixed(r.p50, 2)}  p95 ${pyFixed(r.p95, 2)}  p99 ${pyFixed(r.p99, 2)}  max ${pyFixed(r.max, 2)} ms`;

export function benchReadout(s: BenchState, r: BenchResult): ReadoutItem[] {
  const off = Math.abs(r.mean - r.trueMean) / r.trueMean;
  return [
    { label: 'What the benchmark would print (simulated calls)', value: benchLine(r) },
    {
      label: 'Against the true GPU time of the same calls',
      value:
        s.sync === 'no'
          ? `Measured mean ${pyFixed(r.mean, 2)} ms, true ${pyFixed(r.trueMean, 2)} ms: the timer stopped before the GPU finished.`
          : `Measured mean ${pyFixed(r.mean, 2)} ms, true ${pyFixed(r.trueMean, 2)} ms.`,
      status: off > 0.05 ? 'error' : 'ok',
    },
    {
      label: 'Warm-up',
      value:
        s.warmup >= COLD_MS.length
          ? `${s.warmup} calls skipped: the one-time costs are excluded.`
          : `Only ${s.warmup} warm-up call${s.warmup === 1 ? '' : 's'}: ${COLD_MS.length - s.warmup} one-time cost${COLD_MS.length - s.warmup === 1 ? ' is' : 's are'} in the sample.`,
      status: s.warmup >= COLD_MS.length ? 'ok' : 'error',
    },
  ];
}

export function benchExperiment(id: string, initial: BenchState): ExperimentDef<BenchState, BenchResult> {
  return {
    id,
    initial,
    controls: [
      {
        kind: 'slider',
        id: 'samples',
        label: 'Timed calls',
        min: 20,
        max: 2000,
        step: 20,
        get: (s) => s.samples,
        set: (s, v) => ({ ...s, samples: v }),
      },
      {
        kind: 'slider',
        id: 'warmup',
        label: 'Warm-up calls',
        min: 0,
        max: 50,
        get: (s) => s.warmup,
        set: (s, v) => ({ ...s, warmup: v }),
      },
      {
        kind: 'select',
        id: 'sync',
        label: 'Synchronize before stopping the timer',
        options: [
          { value: 'yes', label: 'Yes: torch.cuda.synchronize()' },
          { value: 'no', label: 'No' },
        ],
        get: (s) => s.sync,
        set: (s, v) => ({ ...s, sync: v as 'yes' | 'no' }),
      },
      {
        kind: 'slider',
        id: 'seed',
        label: 'Random seed',
        min: 1,
        max: 20,
        get: (s) => s.seed,
        set: (s, v) => ({ ...s, seed: v }),
      },
    ],
    compute: runBench,
    readout: benchReadout,
  };
}

// ---- Closed-loop vs open-loop load: coordinated omission ----

/**
 * One server, one request at a time, 10 ms per request, for 5 seconds. At t = 2 s it freezes for `stall` ms.
 * A closed-loop client sends the next request only after the previous reply; an open-loop client sends one
 * every 20 ms whatever happens, and latency is measured from when each request was due.
 */
export const SERVICE_MS = 10;
export const RUN_MS = 5000;
export const STALL_AT = 2000;
export const OPEN_INTERVAL = 20;

export type Client = 'closed' | 'open';

export interface OmissionState {
  client: Client;
  stall: number;
}

export interface Req {
  sent: number;
  finish: number;
  latency: number;
}

export interface ClientRun {
  reqs: Req[];
  p50: number;
  p99: number;
  max: number;
  /** Share of requests slower than 100 ms. */
  slowShare: number;
}

/** When a request that starts service at `start` finishes, given the freeze [STALL_AT, STALL_AT + stall). */
function serve(start: number, stall: number): number {
  const end = STALL_AT + stall;
  if (stall > 0 && start >= STALL_AT && start < end) return end + SERVICE_MS;
  if (stall > 0 && start < STALL_AT && start + SERVICE_MS > STALL_AT) return start + SERVICE_MS + stall;
  return start + SERVICE_MS;
}

function summarize(reqs: Req[]): ClientRun {
  const lat = reqs.map((r) => r.latency);
  return {
    reqs,
    p50: percentile(lat, 50),
    p99: percentile(lat, 99),
    max: Math.max(...lat),
    slowShare: lat.filter((l) => l > 100).length / lat.length,
  };
}

export function runClient(client: Client, stall: number): ClientRun {
  const reqs: Req[] = [];
  if (client === 'closed') {
    let t = 0;
    while (t < RUN_MS) {
      const finish = serve(t, stall);
      reqs.push({ sent: t, finish, latency: finish - t });
      t = finish;
    }
  } else {
    let free = 0;
    for (let sent = 0; sent < RUN_MS; sent += OPEN_INTERVAL) {
      const finish = serve(Math.max(sent, free), stall);
      free = finish;
      reqs.push({ sent, finish, latency: finish - sent });
    }
  }
  return summarize(reqs);
}

export interface OmissionResult {
  closed: ClientRun;
  open: ClientRun;
}

export const runOmission = (s: OmissionState): OmissionResult => ({
  closed: runClient('closed', s.stall),
  open: runClient('open', s.stall),
});

const fmt = (r: ClientRun) =>
  `${r.reqs.length} requests, p50 ${pyFixed(r.p50, 1)} ms, p99 ${pyFixed(r.p99, 1)} ms, max ${pyFixed(r.max, 1)} ms, ${pyFixed(100 * r.slowShare, 1)}% over 100 ms`;

export function omissionReadout(s: OmissionState, r: OmissionResult): ReadoutItem[] {
  const sel = s.client === 'closed' ? r.closed : r.open;
  return [
    { label: `${s.client === 'closed' ? 'Closed-loop' : 'Open-loop'} client (selected)`, value: fmt(sel) },
    {
      label: s.client === 'closed' ? 'Open-loop client, same server' : 'Closed-loop client, same server',
      value: fmt(s.client === 'closed' ? r.open : r.closed),
    },
  ];
}

export function omissionExperiment(
  id: string,
  initial: OmissionState,
): ExperimentDef<OmissionState, OmissionResult> {
  return {
    id,
    initial,
    controls: [
      {
        kind: 'select',
        id: 'client',
        label: 'Load generator',
        options: [
          { value: 'closed', label: 'Closed loop: next request after the reply' },
          { value: 'open', label: 'Open loop: one request every 20 ms' },
        ],
        get: (s) => s.client,
        set: (s, v) => ({ ...s, client: v as Client }),
      },
      {
        kind: 'slider',
        id: 'stall',
        label: 'Server freeze at t = 2 s (ms)',
        min: 0,
        max: 2000,
        step: 100,
        get: (s) => s.stall,
        set: (s, v) => ({ ...s, stall: v }),
      },
    ],
    compute: runOmission,
    readout: omissionReadout,
  };
}
