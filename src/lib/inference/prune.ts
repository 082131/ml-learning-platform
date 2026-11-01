import { seededRandom } from '../classical/random';
import type { ExperimentDef, ReadoutItem } from '../types';
import { countCorrect, type DigitsModel } from './digitsModel';
import { pyFixed } from './format';

/**
 * Magnitude pruning of the digits classifier: zero the smallest |w| in each weight matrix (per layer) or
 * across both (global), then count the test images still classified correctly. Biases are kept.
 * PRUNE_SOURCE is the same procedure in NumPy, checked against it in prune.test.ts.
 */
export type PruneScope = 'layer' | 'global';

export interface PruneState {
  /** Percent of weights to zero, 0 to 95. */
  sparsity: number;
  scope: PruneScope;
}

export interface PruneResult {
  W1: number[][];
  W2: number[][];
  kept: [number, number];
  total: [number, number];
  correct: number;
  floatCorrect: number;
  /** Bytes as dense float32 and as CSR (float32 values, int32 column indices, int32 row pointers). */
  denseBytes: number;
  csrBytes: number;
}

const flat = (W: number[][]) => W.flat();

/** The k-th smallest |w| (1-based), the threshold below and at which weights are zeroed. */
function threshold(values: number[], k: number): number {
  if (k <= 0) return -Infinity;
  const sorted = values.map(Math.abs).sort((a, b) => a - b);
  return sorted[k - 1]!;
}

const applyThreshold = (W: number[][], t: number) => W.map((r) => r.map((w) => (Math.abs(w) > t ? w : 0)));

const nonzero = (W: number[][]) => flat(W).filter((w) => w !== 0).length;

/** Matches Python's int(sparsity / 100 * n) for the slider's whole-percent values. */
const countToPrune = (sparsity: number, n: number) => Math.floor((sparsity * n) / 100 + 1e-9);

export function prune(m: DigitsModel, s: PruneState): Omit<PruneResult, 'correct' | 'floatCorrect'> & { correct?: number } {
  let W1: number[][];
  let W2: number[][];
  if (s.scope === 'layer') {
    W1 = applyThreshold(m.W1, threshold(flat(m.W1), countToPrune(s.sparsity, m.W1.length * m.W1[0]!.length)));
    W2 = applyThreshold(m.W2, threshold(flat(m.W2), countToPrune(s.sparsity, m.W2.length * m.W2[0]!.length)));
  } else {
    const all = [...flat(m.W1), ...flat(m.W2)];
    const t = threshold(all, countToPrune(s.sparsity, all.length));
    W1 = applyThreshold(m.W1, t);
    W2 = applyThreshold(m.W2, t);
  }
  const kept: [number, number] = [nonzero(W1), nonzero(W2)];
  const total: [number, number] = [m.W1.length * m.W1[0]!.length, m.W2.length * m.W2[0]!.length];
  const denseBytes = 4 * (total[0] + total[1]);
  const csrBytes = 8 * (kept[0] + kept[1]) + 4 * (m.W1.length + 1 + m.W2.length + 1);
  return { W1, W2, kept, total, denseBytes, csrBytes };
}

export function runPrune(m: DigitsModel, s: PruneState): PruneResult {
  const p = prune(m, s);
  return { ...p, correct: countCorrect(m, p.W1, p.W2), floatCorrect: m.floatCorrect };
}

/** Random pruning baseline: zero a random sparsity% of each matrix, averaged over `seeds` draws. */
export function randomPruneCorrect(m: DigitsModel, sparsity: number, seeds = 5): number {
  let sum = 0;
  for (let seed = 1; seed <= seeds; seed++) {
    const rand = seededRandom(seed * 7919 + sparsity);
    const drop = (W: number[][]) => {
      const n = W.length * W[0]!.length;
      const k = countToPrune(sparsity, n);
      const order = Array.from({ length: n }, (_, i) => [rand(), i] as const).sort((a, b) => a[0] - b[0]);
      const zero = new Set(order.slice(0, k).map((o) => o[1]));
      return W.map((r, i) => r.map((w, j) => (zero.has(i * r.length + j) ? 0 : w)));
    };
    sum += countCorrect(m, drop(m.W1), drop(m.W2));
  }
  return sum / seeds;
}

export const SPARSITIES = Array.from({ length: 20 }, (_, i) => i * 5);

export interface PruneSweep {
  sparsity: number;
  magnitude: number;
  random: number;
}

export const pruneSweep = (m: DigitsModel, scope: PruneScope): PruneSweep[] =>
  SPARSITIES.map((sp) => ({
    sparsity: sp,
    magnitude: runPrune(m, { sparsity: sp, scope }).correct,
    random: randomPruneCorrect(m, sp),
  }));

export const PRUNE_SOURCE = `import json
import numpy as np

model = json.load(open("digits_mlp.json"))
W1, b1 = np.array(model["W1"]), np.array(model["b1"])    # (16, 64), stored (out, in)
W2, b2 = np.array(model["W2"]), np.array(model["b2"])    # (10, 16)
X, y = np.array(model["test"]["X"]) / 16, np.array(model["test"]["y"])
sparsity = {{sparsity}}


def threshold(values, sparsity):
    k = int(sparsity * values.size)                       # how many weights to zero
    return np.sort(np.abs(values), axis=None)[k - 1] if k > 0 else -np.inf


{{thresholds}}
P1 = np.where(np.abs(W1) > t1, W1, 0.0)                    # keep only the larger weights
P2 = np.where(np.abs(W2) > t2, W2, 0.0)

correct = ((np.maximum(X @ P1.T + b1, 0) @ P2.T + b2).argmax(axis=1) == y).sum()
print(f"kept {np.count_nonzero(P1)} of {W1.size} in W1, {np.count_nonzero(P2)} of {W2.size} in W2")
print(f"correct: {correct} of {len(y)}")`;

export function pruneSlots(s: PruneState): Record<string, string> {
  return {
    sparsity: pyFixed(s.sparsity / 100, 2),
    thresholds:
      s.scope === 'layer'
        ? 't1, t2 = threshold(W1, sparsity), threshold(W2, sparsity)       # one threshold per layer'
        : 't1 = t2 = threshold(np.concatenate([W1.ravel(), W2.ravel()]), sparsity)   # one for both',
  };
}

export function prunePrintout(r: PruneResult): string[] {
  return [
    `kept ${r.kept[0]} of ${r.total[0]} in W1, ${r.kept[1]} of ${r.total[1]} in W2`,
    `correct: ${r.correct} of 360`,
  ];
}

export function pruneReadout(_s: PruneState, r: PruneResult): ReadoutItem[] {
  const keptAll = r.kept[0] + r.kept[1];
  const totalAll = r.total[0] + r.total[1];
  const drop = r.floatCorrect - r.correct;
  return [
    { label: 'What the code prints', value: prunePrintout(r).join('\n') },
    {
      label: 'Accuracy change',
      value: drop === 0 ? `none: ${r.correct} of 360, as before pruning` : `${r.correct - r.floatCorrect} images (${r.floatCorrect} → ${r.correct} of 360)`,
      status: drop > 18 ? 'error' : 'ok',
    },
    {
      label: 'Storage',
      value: `${keptAll} of ${totalAll} weights left (${pyFixed((100 * keptAll) / totalAll, 1)}%). Dense float32 ${r.denseBytes} bytes; sparse (CSR) ${r.csrBytes} bytes${r.csrBytes >= r.denseBytes ? ': larger than dense at this sparsity' : ''}.`,
    },
  ];
}

export function pruneExperiment(id: string, m: DigitsModel, initial: PruneState): ExperimentDef<PruneState, PruneResult> {
  return {
    id,
    initial,
    controls: [
      {
        kind: 'slider',
        id: 'sparsity',
        label: 'Sparsity (% of weights zeroed)',
        min: 0,
        max: 95,
        step: 5,
        get: (s) => s.sparsity,
        set: (s, v) => ({ ...s, sparsity: v }),
        format: (v) => `${v}%`,
      },
      {
        kind: 'select',
        id: 'scope',
        label: 'Threshold',
        options: [
          { value: 'layer', label: 'Per layer: the same % of each matrix' },
          { value: 'global', label: 'Global: one threshold for both matrices' },
        ],
        get: (s) => s.scope,
        set: (s, v) => ({ ...s, scope: v as PruneScope }),
      },
    ],
    compute: (s) => runPrune(m, s),
    readout: pruneReadout,
  };
}

// ---- Temperature: how a teacher's outputs are softened for distillation ----

export interface TempState {
  image: number;
  temperature: number;
}

export interface TempResult {
  logits: number[];
  probs: number[];
  hardProbs: number[];
  label: number;
  predicted: number;
}

export function teacherLogits(m: DigitsModel, image: number[]): number[] {
  const x = image.map((p) => p / 16);
  const h = m.W1.map((row, i) => Math.max(0, row.reduce((t, w, k) => t + w * x[k]!, 0) + m.b1[i]!));
  return m.W2.map((row, j) => row.reduce((t, w, k) => t + w * h[k]!, 0) + m.b2[j]!);
}

export function softmaxT(z: number[], T: number): number[] {
  const max = Math.max(...z);
  const e = z.map((v) => Math.exp((v - max) / T));
  const sum = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / sum);
}

export function runTemperature(m: DigitsModel, s: TempState): TempResult {
  const logits = teacherLogits(m, m.test.X[s.image]!);
  const probs = softmaxT(logits, s.temperature);
  return {
    logits,
    probs,
    hardProbs: softmaxT(logits, 1),
    label: m.test.y[s.image]!,
    predicted: logits.indexOf(Math.max(...logits)),
  };
}

export function tempReadout(s: TempState, r: TempResult): ReadoutItem[] {
  const top = r.probs
    .map((p, d) => [p, d] as const)
    .sort((a, b) => b[0] - a[0])
    .slice(0, 3)
    .map(([p, d]) => `${d}: ${pyFixed(p, 3)}`)
    .join(', ');
  return [
    { label: `Teacher’s probabilities at T = ${s.temperature}, top 3`, value: top },
    {
      label: 'True digit, teacher’s prediction',
      value: `${r.label}, ${r.predicted}${r.label === r.predicted ? '' : ' (wrong)'}`,
    },
  ];
}

export function temperatureExperiment(id: string, m: DigitsModel, initial: TempState): ExperimentDef<TempState, TempResult> {
  return {
    id,
    initial,
    controls: [
      {
        kind: 'slider',
        id: 'image',
        label: 'Test image',
        min: 0,
        max: m.test.X.length - 1,
        get: (s) => s.image,
        set: (s, v) => ({ ...s, image: v }),
      },
      {
        kind: 'slider',
        id: 'temperature',
        label: 'Temperature T',
        min: 1,
        max: 10,
        step: 0.5,
        get: (s) => s.temperature,
        set: (s, v) => ({ ...s, temperature: v }),
      },
    ],
    compute: (s) => runTemperature(m, s),
    readout: tempReadout,
  };
}
