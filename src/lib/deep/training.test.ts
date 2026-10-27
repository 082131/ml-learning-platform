import { describe, expect, it } from 'vitest';
import { fillSlots } from '../code/slots';
import { validateTrace } from '../code/validate';
import { validateExperiment } from '../experiment';
import { mulberry32, permutation } from './rng';
import { initNetwork, lossAndGrads, sgdStep } from './mlp';
import { makeMoons, makeSplit, N_TRAIN, stepsPerEpoch, train } from './training';
import {
  buildTrainingTrace,
  LOOP_SOURCE,
  loopSlots,
  runTraining,
  trainingExperiment,
} from './trainingExperiment';

describe('datasets', () => {
  it('two moons: alternating labels, points near their arcs, reproducible from the seed', () => {
    const a = makeMoons(20, 0, mulberry32(3));
    expect(a.y.map((r) => r[0])).toEqual(Array.from({ length: 20 }, (_, i) => i % 2));
    // Without noise, class 0 lies on the unit circle and class 1 on the circle around (1, 0.5).
    a.X.forEach(([x, y], i) => {
      const r = i % 2 === 0 ? Math.hypot(x!, y!) : Math.hypot(x! - 1, y! - 0.5);
      expect(r).toBeCloseTo(1, 12);
    });
    expect(makeSplit('moons', 7)).toEqual(makeSplit('moons', 7));
    expect(makeSplit('moons', 7)).not.toEqual(makeSplit('moons', 8));
    const s = makeSplit('circles', 1);
    expect([s.train.X.length, s.val.X.length]).toEqual([100, 50]);
  });
});

describe('the training loop', () => {
  it('takes ceil(N / B) steps per epoch, with a smaller last batch', () => {
    expect([
      stepsPerEpoch(100, 32),
      stepsPerEpoch(100, 10),
      stepsPerEpoch(100, 1),
      stepsPerEpoch(100, 100),
    ]).toEqual([4, 10, 100, 1]);
    const run = train({ data: makeSplit('moons', 1), hidden: 8, lr: 0.5, batch: 32, epochs: 3, seed: 1 });
    expect(run.iters).toHaveLength(12);
    expect(run.iters.slice(0, 4).map((i) => i.size)).toEqual([32, 32, 32, 4]);
    expect(run.epochs).toHaveLength(4);
    // Epoch 1 uses every training example exactly once.
    expect(
      run.iters
        .filter((i) => i.epoch === 1)
        .flatMap((i) => i.idx!)
        .sort((a, b) => a - b),
    ).toEqual(Array.from({ length: N_TRAIN }, (_, i) => i));
  });

  it('gives exactly the same numbers as the generic mlp.ts loop shown in the lesson', () => {
    const data = makeSplit('moons', 4);
    const fast = train({ data, hidden: 8, lr: 0.5, batch: 16, epochs: 3, seed: 4 });
    let net = initNetwork([2, 8, 1], 'tanh', 'sigmoid', 4);
    const shuffle = mulberry32(5);
    const losses: number[] = [];
    for (let e = 1; e <= 3; e++) {
      const order = permutation(100, shuffle);
      for (let s = 0; s < 7; s++) {
        const idx = order.slice(s * 16, (s + 1) * 16);
        const r = lossAndGrads(
          net,
          idx.map((i) => data.train.X[i]!),
          idx.map((i) => data.train.y[i]!),
          'bce',
        );
        losses.push(r.loss);
        net = sgdStep(net, r.grads, 0.5);
      }
    }
    fast.iters.forEach((it, i) => expect(it.loss).toBeCloseTo(losses[i]!, 13));
    fast.net.forEach((layer, l) =>
      layer.W.flat().forEach((w, k) => expect(w).toBeCloseTo(net[l]!.W.flat()[k]!, 13)),
    );
  });

  it('learns the moons: loss falls and validation accuracy is high with the default settings', () => {
    const r = runTraining({ dataset: 'moons', lr: 0.5, batch: 10, epochs: 50, seed: 1 });
    const [start, end] = [r.run.epochs[0]!, r.run.epochs.at(-1)!];
    expect(end.trainLoss).toBeLessThan(start.trainLoss / 3);
    expect(end.valAcc).toBeGreaterThanOrEqual(0.9);
    expect(r.boundary.length).toBeGreaterThan(10);
  });
});

describe('claims made in the lesson (seed 1, two moons, 50 epochs)', () => {
  const at = (lr: number, batch: number) =>
    runTraining({ dataset: 'moons', lr, batch, epochs: 50, seed: 1 }).run;
  it('η = 5, B = 10 overfits: training loss about 0.03, validation loss lowest at epoch 32', () => {
    const run = at(5, 10);
    expect(run.epochs.at(-1)!.trainLoss).toBeCloseTo(0.033, 3);
    const best = run.epochs.reduce((b, e) => (e.valLoss < b.valLoss ? e : b));
    expect(best.epoch).toBe(32);
    expect(run.epochs.at(-1)!.valLoss).toBeGreaterThan(best.valLoss);
  });
  it('B = 100 makes one step per epoch; B = 1 makes 100', () => {
    expect(at(0.5, 100).iters).toHaveLength(50);
    expect(at(0.5, 1).iters).toHaveLength(5000);
  });
});

describe('the experiment and its trace', () => {
  const def = trainingExperiment('training', 'loop');
  it('is valid and its trace fits the filled source', () => {
    expect(validateExperiment(def)).toEqual([]);
    for (const batch of [1, 10, 32, 100]) {
      const s = { ...def.initial, batch, epochs: 2 };
      const src = fillSlots(LOOP_SOURCE, [], loopSlots(s)).source;
      expect(validateTrace(buildTrainingTrace(s, runTraining(s)), src)).toEqual([]);
    }
  });
  it('explains the step count and the short last batch', () => {
    const s = { ...def.initial, batch: 32 };
    const r = def.compute(s);
    expect(def.readout!(s, r)[0]!.value).toBe('ceil(100 / 32) = 4 (last batch: 4)');
    const notes = buildTrainingTrace(s, r).steps.map((st) => st.note);
    expect(notes).toContain('stepsPerEpoch = ceil(100 / 32) = 4. The last batch holds 4 examples.');
    expect(notes.some((n) => n.startsWith('idx = order[96:100]: 4 examples.'))).toBe(true);
  });
});
