import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { validateExperiment } from '../experiment';
import { benchExperiment, omissionExperiment, percentile, runBench, runClient } from './profiling';
import { hasPython } from './testPython';

describe('percentile', () => {
  it('interpolates like NumPy’s default', () => {
    expect(percentile([1, 2, 3, 4], 50)).toBe(2.5);
    expect(percentile([10, 20, 30, 40, 50], 95)).toBeCloseTo(48, 12); // pos 3.8 → 40 + 0.8 · 10
    expect(percentile([7], 99)).toBe(7);
  });
});

describe('runBench', () => {
  it('includes the cold start without warm-up and excludes it with three warm-up calls', () => {
    expect(runBench({ samples: 100, warmup: 0, sync: 'yes', seed: 1 }).max).toBeGreaterThan(900);
    expect(runBench({ samples: 100, warmup: 3, sync: 'yes', seed: 1 }).max).toBeLessThan(100);
  });
  it('measures only launch time without synchronization', () => {
    const r = runBench({ samples: 200, warmup: 10, sync: 'no', seed: 1 });
    expect(r.p50).toBeLessThan(1);
    expect(r.trueMean).toBeGreaterThan(10);
  });
});

describe('coordinated omission', () => {
  it('a closed-loop client records one slow request; an open-loop one records all the queued ones', () => {
    const closed = runClient('closed', 1000);
    const open = runClient('open', 1000);
    expect(closed.reqs.filter((r) => r.latency > 100)).toHaveLength(1);
    expect(closed.max).toBe(1010);
    expect(open.reqs.filter((r) => r.latency > 100).length).toBeGreaterThan(50);
    expect(open.p99).toBeGreaterThan(500);
    expect(closed.p99).toBe(10);
  });
  it('without a freeze both clients see 10 ms', () => {
    expect(runClient('open', 0).max).toBe(10);
    expect(runClient('closed', 0).reqs).toHaveLength(500);
  });
  it('both are valid experiments', () => {
    expect(
      validateExperiment(benchExperiment('b', { samples: 100, warmup: 5, sync: 'yes', seed: 1 })),
    ).toEqual([]);
    expect(validateExperiment(omissionExperiment('o', { client: 'closed', stall: 1000 }))).toEqual([]);
  });
});

describe.skipIf(!hasPython())('percentile equals numpy.percentile', () => {
  it('on simulated latencies', () => {
    const t = runBench({ samples: 237, warmup: 0, sync: 'yes', seed: 3 }).times;
    const code = `import numpy as np\nprint(" ".join(repr(float(v)) for v in np.percentile(${JSON.stringify(t)}, [50, 95, 99, 12.5])))`;
    const out = execFileSync('python3', ['-c', code], { encoding: 'utf8' }).trim().split(' ').map(Number);
    [50, 95, 99, 12.5].forEach((p, i) => expect(percentile(t, p)).toBeCloseTo(out[i]!, 9));
  });
});
