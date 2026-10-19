import { describe, expect, it } from 'vitest';
import { makeDeliveries } from './deliveries';
import { LCG } from './lcg';
import { trainRun } from './sgdRun';

// Every expected value below was printed by the lesson's Python code (CPython 3.13). Matching them
// exactly is what lets a readout claim "this is what the code prints".
describe('LCG', () => {
  it('produces the same stream as the Python class', () => {
    const r = new LCG(42);
    expect([r.random(), r.random(), r.random()]).toEqual([
      0.2523451747838408, 0.08812504541128874, 0.5772811982315034,
    ]);
    expect(new LCG(7).shuffle([0, 1, 2, 3, 4, 5])).toEqual([5, 0, 3, 2, 4, 1]);
  });
});

describe('makeDeliveries', () => {
  it('matches make_deliveries(60, seed=2024)', () => {
    const rows = makeDeliveries();
    expect(rows).toHaveLength(60);
    expect(rows[0]).toEqual({ km: 0.7968742375960574, minutes: 14.746473899227567 });
    expect(rows[59]).toEqual({ km: 8.702240815502591, minutes: 28.782372149056755 });
  });
});

describe('trainRun', () => {
  const rows = makeDeliveries();
  it('reproduces the Python run records', () => {
    const vals = [31.1996, 20.2202, 18.435, 26.9867, 21.652, 24.3053, 29.9675, 26.3012, 21.145, 12.1353];
    for (let seed = 0; seed < vals.length; seed++)
      expect(trainRun({ lr: 0.005, epochs: 20, batchSize: 8 }, seed, rows).metrics).toMatchObject({
        status: 'ok',
        valMse: vals[seed],
      });
    expect(trainRun({ lr: 0.005, epochs: 20, batchSize: 8 }, 0, rows).metrics).toEqual({
      status: 'ok',
      w: 3.6607,
      b: 2.2882,
      valMse: 31.1996,
    });
    expect(trainRun({ lr: 0.005, epochs: 20, batchSize: 1 }, 3, rows).metrics).toEqual({
      status: 'ok',
      w: 3.2955,
      b: 7.1801,
      valMse: 13.2305,
    });
  });

  it('stops and records divergence when the learning rate is too high', () => {
    const run = trainRun({ lr: 0.02, epochs: 20, batchSize: 8 }, 0, rows);
    expect(run.metrics).toEqual({ status: 'diverged', epoch: 4 });
    expect(run.valCurve).toHaveLength(3);
  });

  it('is deterministic: the same config and seed give the same curve', () => {
    const a = trainRun({ lr: 0.005, epochs: 5, batchSize: 4 }, 2, rows);
    const b = trainRun({ lr: 0.005, epochs: 5, batchSize: 4 }, 2, rows);
    expect(a).toEqual(b);
    expect(a.valCurve).toHaveLength(5);
  });
});
