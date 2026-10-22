import { describe, expect, it } from 'vitest';
import { validateExperiment } from '../experiment';
import {
  best,
  computeTuning,
  distinctLearningRates,
  earlyStop,
  gridSearch,
  randomSearch,
  searchLine,
  stopLine,
  tuningExperiment,
  valCurve,
  valLoss,
} from './tuning';

// Expected values were printed by the lesson's Python (CPython 3.13). Losses use exp, whose last bit
// may differ between libm and V8, so floats are compared to 12 digits; positions compare exactly.
describe('valLoss', () => {
  it('is lowest at the known optimum and grows away from it', () => {
    expect(valLoss(-1.9, 0.2)).toBeCloseTo(0.3, 15);
    expect(valLoss(-1, 0.2)).toBeGreaterThan(valLoss(-1.9, 0.2));
    // Dropout matters far less than the learning rate: its whole range adds at most 0.04 · 1.2² ≈ 0.0576.
    expect(valLoss(-1.9, 0.5) - valLoss(-1.9, 0.2)).toBeCloseTo(0.0576, 12);
  });
});

describe('grid and random search', () => {
  const cases: [number, number, 'grid' | 'random', number, number, number][] = [
    [2, 1, 'grid', 0.8072709790233109, -1.0, 0.0],
    [2, 1, 'random', 0.3967133422143945, -1.675711112562567, 0.278094285284169],
    [5, 3, 'grid', 0.3454729615857273, -1.75, 0.25],
    [5, 3, 'random', 0.33928861103143676, -1.9841784862801433, 0.0022214105119928718],
    [7, 9, 'grid', 0.32070839046837224, -2.0, 0.16666666666666666],
    [7, 9, 'random', 0.30028103640216375, -1.9008764559403062, 0.22089664672967046],
  ];
  it.each(cases)('k=%i seed=%i %s finds the Python best', (k, seed, method, loss, logLr, dropout) => {
    const b = best(method === 'grid' ? gridSearch(k) : randomSearch(k * k, seed));
    expect(b.logLr).toBe(logLr);
    expect(b.dropout).toBe(dropout);
    expect(b.loss).toBeCloseTo(loss, 12);
  });

  it('grid tries only k distinct learning rates, random tries k²', () => {
    expect(distinctLearningRates(gridSearch(3))).toBe(3);
    expect(distinctLearningRates(randomSearch(9, 0))).toBe(9);
  });

  it('prints the same lines as the Python', () => {
    const r = computeTuning({ k: 3, seed: 0, patience: 3 });
    expect(searchLine('grid', r.grid)).toBe(
      'grid: best loss 0.6866 at lr=10^-2.50, dropout=0.25; 3 distinct learning rates',
    );
    expect(searchLine('random', r.random)).toBe(
      'random: best loss 0.3023 at lr=10^-1.88, dropout=0.16; 9 distinct learning rates',
    );
    expect(stopLine({ k: 3, seed: 0, patience: 3 }, r)).toBe(
      'patience 3: best epoch 25 (loss 0.4405), stopped after epoch 28',
    );
  });
});

describe('early stopping', () => {
  it('matches the Python on seed 4', () => {
    const c = valCurve(60, 4);
    expect(c[0]).toBeCloseTo(1.0221260675442658, 12);
    expect(c[59]).toBeCloseTo(0.5474402358907673, 12);
    expect(earlyStop(c, 2)).toEqual({ bestEpoch: 23, stopped: 25 });
    expect(earlyStop(c, 8)).toEqual({ bestEpoch: 26, stopped: 34 });
  });

  it('with patience 1, noise stops seed 0 early, at epoch 16, before the true best (25)', () => {
    const r = computeTuning({ k: 3, seed: 0, patience: 1 });
    expect(r.stop).toEqual({ bestEpoch: 15, stopped: 16 });
    expect(r.trueBestEpoch).toBe(25);
  });

  it('never stops on a strictly improving curve', () => {
    expect(earlyStop([3, 2, 1], 1)).toEqual({ bestEpoch: 3, stopped: 3 });
  });
});

describe('tuningExperiment', () => {
  it('is valid', () => {
    expect(validateExperiment(tuningExperiment('t', { k: 3, seed: 0, patience: 3 }))).toEqual([]);
  });
});
