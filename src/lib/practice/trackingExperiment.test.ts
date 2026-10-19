import { describe, expect, it } from 'vitest';
import { validateExperiment } from '../experiment';
import { makeDeliveries } from './deliveries';
import { computeTracking, trackingExperiment, type TrackingState } from './trackingExperiment';

const initial: TrackingState = { lr: 0.005, lrB: 0.01, epochs: 20, batchSize: 8, seed: 0, seeds: 10 };

describe('trackingExperiment', () => {
  const r = computeTracking(initial, makeDeliveries());

  it('prints the same record as the lesson Python (CPython 3.13 output)', () => {
    expect(r.record).toBe(
      '{"config": {"lr": 0.005, "epochs": 20, "batch_size": 8}, "seed": 0, "data": "make_deliveries(60, seed=2024)", "metrics": {"status": "ok", "w": 3.6607, "b": 2.2882, "val_mse": 31.1996}}',
    );
    expect(r.reproduced).toBe(true);
  });

  it('summarizes both configs over the seeds (values from the Python sweep)', () => {
    expect(r.summaryA.values).toEqual([
      31.1996, 20.2202, 18.435, 26.9867, 21.652, 24.3053, 29.9675, 26.3012, 21.145, 12.1353,
    ]);
    expect(r.summaryA.mean).toBeCloseTo(23.23478, 9);
    expect(r.summaryB.mean).toBeCloseTo(24.06209, 9);
    expect(r.bWins).toBe(7);
  });

  it('records a diverged run in the Python format', () => {
    const d = computeTracking({ ...initial, lr: 0.02, seeds: 1 }, makeDeliveries());
    expect(d.record).toContain('"metrics": {"status": "diverged", "epoch": 4}');
    expect(d.summaryA).toEqual({ values: [], diverged: 1 });
  });

  it('is a valid experiment', () => {
    expect(validateExperiment(trackingExperiment('t', initial))).toEqual([]);
  });
});
