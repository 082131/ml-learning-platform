import { seededRandom } from '../classical/random';
import { pyFixed } from './format';

/**
 * A discrete-event simulation of one model replica behind a dynamic batcher. Requests arrive as a
 * Poisson process (exponential gaps, seeded). The batcher sends a batch when it holds max_batch
 * requests or the oldest has waited max_wait ms, and only when the replica is free. Service time is
 * a stated model, not a measurement: t0 + per_item · batch ms.
 */
export interface BatchingConfig {
  /** Mean arrival rate, requests per second. */
  rate: number;
  n: number;
  seed: number;
  maxBatch: number;
  /** Milliseconds the oldest request may wait for others before its batch is sent. */
  maxWait: number;
  /** Fixed cost of running one batch, ms. */
  t0: number;
  /** Extra cost per request in the batch, ms. */
  perItem: number;
}

export interface Batch {
  start: number;
  finish: number;
  /** Indices of the first and one-past-last request in the batch. */
  from: number;
  to: number;
}

export interface BatchingRun {
  arrivals: number[];
  batches: Batch[];
  /** finish − arrival for each request, in arrival order. */
  latencies: number[];
  busy: number;
  span: number;
  throughput: number;
  meanBatch: number;
  p50: number;
  p95: number;
  p99: number;
  /** Fraction of the span the replica was running a batch. */
  utilization: number;
}

/** Poisson arrivals in ms: gaps of −ln(1 − u) / rate seconds. */
export function arrivalTimes(rate: number, n: number, seed: number): number[] {
  const rand = seededRandom(seed);
  const out: number[] = [];
  let t = 0;
  for (let k = 0; k < n; k++) {
    t += (-Math.log(1 - rand()) / rate) * 1000;
    out.push(t);
  }
  return out;
}

/** Nearest-rank percentile: the value at position ceil(p · n / 100) in sorted order. */
export function percentile(sorted: readonly number[], p: number): number {
  return sorted[Math.max(1, Math.ceil((p * sorted.length) / 100)) - 1]!;
}

/** Runs the batcher over `arrivals` (ms). Same algorithm, line for line, as BATCHING_SOURCE. */
export function simulate(c: BatchingConfig, arrivals = arrivalTimes(c.rate, c.n, c.seed)): BatchingRun {
  const n = arrivals.length;
  const batches: Batch[] = [];
  const latencies: number[] = [];
  let busy = 0;
  let freeAt = 0;
  let i = 0;
  while (i < n) {
    const fullAt = i + c.maxBatch <= n ? arrivals[i + c.maxBatch - 1]! : Infinity;
    const start = Math.max(freeAt, Math.min(fullAt, arrivals[i]! + c.maxWait));
    let j = i;
    while (j < n && j - i < c.maxBatch && arrivals[j]! <= start) j++;
    const service = c.t0 + c.perItem * (j - i);
    freeAt = start + service;
    busy += service;
    batches.push({ start, finish: freeAt, from: i, to: j });
    for (let k = i; k < j; k++) latencies.push(freeAt - arrivals[k]!);
    i = j;
  }
  const span = freeAt - arrivals[0]!;
  const sorted = [...latencies].sort((a, b) => a - b);
  return {
    arrivals,
    batches,
    latencies,
    busy,
    span,
    throughput: (n / span) * 1000,
    meanBatch: n / batches.length,
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
    utilization: busy / span,
  };
}

/** Requests per second the replica can finish when every batch is full: B / (t0 + per_item · B). */
export const capacity = (c: BatchingConfig, batch = c.maxBatch) =>
  (1000 * batch) / (c.t0 + c.perItem * batch);

export const BATCHING_SOURCE = `import math

def mulberry32(seed):                    # a small seeded random number generator
    a = seed & 0xFFFFFFFF
    def rand():
        nonlocal a
        a = (a + 0x6D2B79F5) & 0xFFFFFFFF
        t = ((a ^ (a >> 15)) * (a | 1)) & 0xFFFFFFFF
        t ^= (t + (((t ^ (t >> 7)) * (t | 61)) & 0xFFFFFFFF)) & 0xFFFFFFFF
        return (t ^ (t >> 14)) / 2**32
    return rand

rate, n, seed = {{rate}}, {{n}}, {{seed}}         # requests per second, how many, seed
max_batch, max_wait = {{max_batch}}, {{max_wait}}         # batcher settings (wait in ms)
t0, per_item = {{t0}}, {{per_item}}                # service-time model (ms): t0 + per_item * batch

rand = mulberry32(seed)
arrivals, t = [], 0.0
for _ in range(n):
    t += -math.log(1 - rand()) / rate * 1000    # exponential gaps: a Poisson process
    arrivals.append(t)

latencies, batches, busy, free_at, i = [], [], 0.0, 0.0, 0
while i < n:
    full_at = arrivals[i + max_batch - 1] if i + max_batch <= n else math.inf
    start = max(free_at, min(full_at, arrivals[i] + max_wait))
    j = i
    while j < n and j - i < max_batch and arrivals[j] <= start:
        j += 1
    service = t0 + per_item * (j - i)
    free_at = start + service
    busy += service
    batches.append(j - i)
    latencies += [free_at - a for a in arrivals[i:j]]
    i = j

def pct(p):
    s = sorted(latencies)
    return s[math.ceil(p * len(s) / 100) - 1]

span = free_at - arrivals[0]
print(f"throughput  {n / span * 1000:7.1f} req/s")
print(f"mean batch  {sum(batches) / len(batches):7.2f}")
print(f"p50 latency {pct(50):7.1f} ms")
print(f"p95 latency {pct(95):7.1f} ms")
print(f"p99 latency {pct(99):7.1f} ms")
print(f"GPU busy    {busy / span:7.1%}")`;

export const batchingSlots = (c: BatchingConfig): Record<string, string> => ({
  rate: String(c.rate),
  n: String(c.n),
  seed: String(c.seed),
  max_batch: String(c.maxBatch),
  max_wait: String(c.maxWait),
  t0: String(c.t0),
  per_item: String(c.perItem),
});

const col = (x: number, d: number) => pyFixed(x, d).padStart(7);

/** Exactly what BATCHING_SOURCE prints (checked against CPython in batching.test.ts). */
export const batchingPrintout = (r: BatchingRun) => [
  `throughput  ${col(r.throughput, 1)} req/s`,
  `mean batch  ${col(r.meanBatch, 2)}`,
  `p50 latency ${col(r.p50, 1)} ms`,
  `p95 latency ${col(r.p95, 1)} ms`,
  `p99 latency ${col(r.p99, 1)} ms`,
  `GPU busy    ${(pyFixed(r.utilization * 100, 1) + '%').padStart(7)}`,
];
