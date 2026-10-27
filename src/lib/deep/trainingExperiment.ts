import { scalar, text } from '../trace/values';
import type { ExperimentDef, Trace, TraceStep } from '../types';
import { isolines, sampleGrid, type SampledGrid, type Segment } from './contour';
import { fmt } from './optimizers';
import {
  makeSplit,
  N_TRAIN,
  predictProba,
  SHUFFLE_SEED_OFFSET,
  train,
  type DatasetId,
  type SplitData,
  type TrainRun,
} from './training';

export interface TrainState {
  dataset: DatasetId;
  lr: number;
  batch: number;
  epochs: number;
  seed: number;
}

export interface TrainResult {
  data: SplitData;
  run: TrainRun;
  /** P(class 1) on a grid over the plot, and the 0.5 contour: the decision boundary. */
  grid: SampledGrid;
  boundary: Segment[];
}

export const HIDDEN_UNITS = 8;
export const BATCH_CHOICES = [1, 2, 4, 5, 8, 10, 16, 20, 25, 32, 50, 100];
export const LR_CHOICES = [0.01, 0.03, 0.1, 0.3, 0.5, 1, 2, 3, 5];
export const MAX_EPOCHS = 100;
export const DOMAIN: Record<DatasetId, { x: [number, number]; y: [number, number] }> = {
  moons: { x: [-1.6, 2.6], y: [-1.1, 1.6] },
  circles: { x: [-1.5, 1.5], y: [-1.5, 1.5] },
};
const GRID_POINTS = 41;

export function runTraining(s: TrainState): TrainResult {
  const data = makeSplit(s.dataset, s.seed);
  const run = train({ data, hidden: HIDDEN_UNITS, lr: s.lr, batch: s.batch, epochs: s.epochs, seed: s.seed });
  const d = DOMAIN[s.dataset];
  const xs = sampleGrid(() => 0, d.x, d.y, GRID_POINTS, GRID_POINTS);
  const flat = xs.ys.flatMap((y) => xs.xs.map((x) => [x, y]));
  const p = predictProba(run.net, flat);
  const grid = {
    xs: xs.xs,
    ys: xs.ys,
    values: xs.ys.map((_, j) => p.slice(j * GRID_POINTS, (j + 1) * GRID_POINTS)),
  };
  return { data, run, grid, boundary: isolines(grid, 0.5) };
}

const nearest = (choices: number[], v: number) =>
  choices.reduce((best, c, i) => (Math.abs(c - v) < Math.abs(choices[best]! - v) ? i : best), 0);

const choiceSlider = (id: 'lr' | 'batch', label: string, choices: number[]) =>
  ({
    kind: 'slider',
    id,
    label,
    min: 0,
    max: choices.length - 1,
    get: (s: TrainState) => nearest(choices, s[id]),
    set: (s: TrainState, i: number) => ({ ...s, [id]: choices[Math.round(i)]! }),
    format: (i: number) => String(choices[Math.round(i)]),
  }) as const;

/** The training-loop source the step-through walks (the generic form of what the page runs). */
export const LOOP_SOURCE = `const data = makeSplit('{{dataset}}', {{seed}});
let net = initNetwork([2, 8, 1], 'tanh', 'sigmoid', {{seed}});
const shuffle = mulberry32({{seed}} + 1);
const n = data.train.X.length;
const stepsPerEpoch = Math.ceil(n / {{batch}});
for (let epoch = 1; epoch <= {{epochs}}; epoch++) {
  const order = permutation(n, shuffle);
  for (let step = 0; step < stepsPerEpoch; step++) {
    const idx = order.slice(step * {{batch}}, (step + 1) * {{batch}});
    const xb = idx.map((i) => data.train.X[i]);
    const yb = idx.map((i) => data.train.y[i]);
    const { loss, grads } = lossAndGrads(net, xb, yb, 'bce');
    net = sgdStep(net, grads, {{lr}});
  }
}`;

export const loopSlots = (s: TrainState): Record<string, string> => ({
  dataset: s.dataset,
  seed: String(s.seed),
  batch: String(s.batch),
  epochs: String(s.epochs),
  lr: String(s.lr),
});

const L = {
  data: 1,
  net: 2,
  shuffle: 3,
  n: 4,
  spe: 5,
  epoch: 6,
  order: 7,
  step: 8,
  idx: 9,
  xb: 10,
  loss: 12,
  update: 13,
};
/** Steps of epoch 1 shown in full when an epoch is this short; otherwise the first two and the last. */
const FULL_EPOCH = 5;

const listPreview = (xs: number[], max = 6) =>
  `[${xs.slice(0, max).join(', ')}${xs.length > max ? `, … (${xs.length} in all)` : ''}]`;

/** A computed trace of epoch 1 of the run, then a summary of the remaining epochs. */
export function buildTrainingTrace(s: TrainState, r: TrainResult): Trace {
  const { run } = r;
  const spe = run.stepsPerEpoch;
  const first = run.iters.filter((it) => it.epoch === 1);
  const vars: TraceStep['vars'] = {};
  const steps: TraceStep[] = [];
  const push = (line: number, note: string, set: TraceStep['vars'] = {}) => {
    Object.assign(vars, set);
    steps.push({ range: { line }, vars: { ...vars }, note });
  };
  push(
    L.data,
    `${N_TRAIN} training and ${r.data.val.X.length} validation points from the seeded ${s.dataset} generator (seed ${s.seed}). X has shape (${N_TRAIN}, 2), y has shape (${N_TRAIN}, 1).`,
    {
      'X.shape': text(`(${N_TRAIN}, 2)`),
    },
  );
  push(
    L.net,
    `A 2-8-1 network: 2 inputs, 8 tanh hidden units, 1 sigmoid output. ${2 * 8 + 8 + 8 + 1} parameters, initialized from seed ${s.seed}.`,
  );
  push(L.shuffle, `A separate random stream for shuffling, seeded with ${s.seed + SHUFFLE_SEED_OFFSET}.`);
  push(L.n, `n = ${N_TRAIN} training examples.`, { n: scalar(N_TRAIN) });
  push(
    L.spe,
    `stepsPerEpoch = ceil(${N_TRAIN} / ${s.batch}) = ${spe}.${N_TRAIN % s.batch ? ` The last batch holds ${N_TRAIN - (spe - 1) * s.batch} examples.` : ''}`,
    {
      stepsPerEpoch: scalar(spe),
    },
  );
  push(L.epoch, 'epoch = 1: the first pass over the training set.', { epoch: scalar(1) });
  push(
    L.order,
    `A fresh shuffle of 0..${N_TRAIN - 1}, so each epoch visits the examples in a different order.`,
    {
      order: text(
        listPreview(
          first.flatMap((it) => it.idx!),
          8,
        ),
      ),
    },
  );
  const shown = spe <= FULL_EPOCH ? first : [first[0]!, first[1]!, first.at(-1)!];
  shown.forEach((it, k) => {
    if (k > 0 && it.step !== shown[k - 1]!.step + 1)
      push(L.step, `Steps 2 to ${it.step - 1} do the same on the next slices of order (skipped here).`);
    push(L.step, `step = ${it.step}: iteration ${it.iter} of ${run.iters.length}.`, {
      step: scalar(it.step),
    });
    push(
      L.idx,
      `idx = order[${it.step * s.batch}:${it.step * s.batch + it.size}]: ${it.size} example${it.size === 1 ? '' : 's'}.`,
      {
        idx: text(listPreview(it.idx!)),
      },
    );
    push(L.xb, `xb has shape (${it.size}, 2) and yb shape (${it.size}, 1).`, {
      'xb.shape': text(`(${it.size}, 2)`),
    });
    push(
      L.loss,
      `Forward and backward pass on this batch: loss = ${fmt(it.loss)} (binary cross-entropy, averaged over the batch).`,
      {
        loss: scalar(it.loss),
      },
    );
    push(L.update, `θ ← θ − ${s.lr}·∇loss for all 33 parameters: one iteration done.`);
  });
  const e1 = run.epochs[1]!;
  const last = run.epochs.at(-1)!;
  push(
    L.epoch,
    `After epoch 1: train loss ${fmt(e1.trainLoss)}, validation loss ${fmt(e1.valLoss)}.${s.epochs > 1 ? ` Epochs 2 to ${s.epochs} repeat this (${run.iters.length} iterations in all) and end at train loss ${fmt(last.trainLoss)}, validation loss ${fmt(last.valLoss)}.` : ''}`,
    {
      epoch: scalar(s.epochs),
      'train loss': scalar(last.trainLoss),
      'val loss': scalar(last.valLoss),
    },
  );
  return { source: 'computed', steps };
}

const pct = (x: number) => `${Math.round(x * 100)}%`;

export function trainingExperiment(id: string, traceExample: string): ExperimentDef<TrainState, TrainResult> {
  return {
    id,
    initial: { dataset: 'moons', lr: 0.5, batch: 10, epochs: 50, seed: 1 },
    controls: [
      {
        kind: 'select',
        id: 'dataset',
        label: 'Dataset',
        options: [
          { value: 'moons', label: 'Two moons' },
          { value: 'circles', label: 'Circles' },
        ],
        get: (s) => s.dataset,
        set: (s, v) => ({ ...s, dataset: v as DatasetId }),
      },
      choiceSlider('lr', 'Learning rate η', LR_CHOICES),
      choiceSlider('batch', 'Batch size B', BATCH_CHOICES),
      {
        kind: 'slider',
        id: 'epochs',
        label: 'Epochs',
        min: 1,
        max: MAX_EPOCHS,
        get: (s) => s.epochs,
        set: (s, epochs) => ({ ...s, epochs }),
      },
      {
        kind: 'number',
        id: 'seed',
        label: 'Seed',
        min: 1,
        max: 999,
        step: 1,
        get: (s) => s.seed,
        set: (s, seed) => ({ ...s, seed: Math.round(seed) }),
      },
    ],
    compute: runTraining,
    trace: (s) => buildTrainingTrace(s, runTraining(s)),
    traceExample,
    readout: (s, r) => {
      const last = r.run.epochs.at(-1)!;
      const spe = r.run.stepsPerEpoch;
      const rem = N_TRAIN % s.batch;
      return [
        {
          label: 'Steps per epoch',
          value: `ceil(${N_TRAIN} / ${s.batch}) = ${spe}${rem ? ` (last batch: ${rem})` : ''}`,
        },
        { label: 'Iterations in total', value: `${s.epochs} × ${spe} = ${r.run.iters.length}` },
        { label: `Train loss after epoch ${s.epochs}`, value: fmt(last.trainLoss) },
        { label: 'Validation loss', value: fmt(last.valLoss) },
        { label: 'Accuracy (train / validation)', value: `${pct(last.trainAcc)} / ${pct(last.valAcc)}` },
      ];
    },
  };
}
