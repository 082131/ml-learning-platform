import { describe, expect, it } from 'vitest';
import { seededRandom } from '../classical/random';
import { fillSlots } from '../code/slots';
import {
  arrivalTimes,
  BATCHING_SOURCE,
  batchingPrintout,
  batchingSlots,
  capacity,
  percentile,
  simulate,
  type BatchingConfig,
} from './batching';
import { hasPython, runPython } from './testPython';

const base: BatchingConfig = { rate: 100, n: 2000, seed: 7, maxBatch: 8, maxWait: 10, t0: 20, perItem: 3 };

describe('the batcher', () => {
  // Hand-worked: arrivals at 0, 1, 2, 30 ms; max_batch 2, max_wait 5; service 10 + 1·b ms.
  const c = { ...base, maxBatch: 2, maxWait: 5, t0: 10, perItem: 1 };
  const run = simulate(c, [0, 1, 2, 30]);

  it('sends a batch as soon as it is full', () => {
    // Requests 0 and 1: full at t = 1, done at 1 + 12 = 13.
    expect(run.batches[0]).toEqual({ start: 1, finish: 13, from: 0, to: 2 });
  });

  it('waits for a busy replica, then takes what is queued', () => {
    // Request 2 times out at 2 + 5 = 7 but the replica is busy until 13: runs alone, 13 → 24.
    expect(run.batches[1]).toEqual({ start: 13, finish: 24, from: 2, to: 3 });
  });

  it('sends a partial batch when the oldest request has waited max_wait', () => {
    // Request 3 arrives at 30, nobody joins, sent at 35, done at 46.
    expect(run.batches[2]).toEqual({ start: 35, finish: 46, from: 3, to: 4 });
    expect(run.latencies).toEqual([13, 12, 22, 16]);
    expect(run.busy).toBe(12 + 11 + 11);
    expect(run.span).toBe(46);
  });

  it('uses nearest-rank percentiles', () => {
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 50)).toBe(5);
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 95)).toBe(10);
  });

  it('draws arrivals from the seeded generator with mean gap 1000 / rate ms', () => {
    const first = (-Math.log(1 - seededRandom(7)()) / 100) * 1000;
    const a = arrivalTimes(100, 20000, 7);
    expect(a[0]).toBe(first);
    expect(a.at(-1)! / a.length).toBeCloseTo(10, 0);
  });

  it('cannot finish more than B / (t0 + per_item · B) requests per second', () => {
    expect(capacity(base)).toBeCloseTo(8000 / 44, 10);
    const overloaded = simulate({ ...base, maxBatch: 1 });
    expect(overloaded.throughput).toBeLessThanOrEqual(capacity({ ...base, maxBatch: 1 }) + 1e-9);
    expect(overloaded.utilization).toBeCloseTo(1, 3);
  });
});

describe.skipIf(!hasPython())('the printout equals what CPython prints', () => {
  const cases: BatchingConfig[] = [
    base,
    { ...base, maxBatch: 1 },
    { ...base, maxBatch: 32, maxWait: 50 },
    { ...base, maxWait: 0 },
    { ...base, rate: 20, seed: 3 },
    { ...base, rate: 170, n: 500, t0: 12.5, perItem: 1.5 },
  ];
  it.each(cases.map((c) => [JSON.stringify(c), c] as const))('%s', (_, c) => {
    const code = fillSlots(BATCHING_SOURCE, [], batchingSlots(c)).source;
    expect(runPython(code)).toBe(batchingPrintout(simulate(c)).join('\n'));
  });
});
