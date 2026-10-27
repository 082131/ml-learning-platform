/**
 * The logistic-regression lesson's experiment: Adelie (0) vs Chinstrap (1) penguins on bill length
 * and bill depth, standardized with training statistics and trained by batch gradient descent.
 */
import { formatNumber, scalar, text } from '../trace/values';
import type { ExperimentDef, Trace, TraceStep } from '../types';
import {
  accuracy,
  binaryTask,
  fitScaler,
  logLoss,
  predictProba,
  scale,
  score,
  sigmoid,
  trainLogistic,
  type LogisticModel,
  type LogisticRun,
} from './logistic';

export const BILL_TASK = binaryTask('Adelie', 'Chinstrap', ['bill_length_mm', 'bill_depth_mm']);
export const BILL_SCALER = fitScaler(BILL_TASK.train.map((p) => p.x));
const TRAIN_Z = BILL_TASK.train.map((p) => scale(BILL_SCALER, p.x));
const TRAIN_Y = BILL_TASK.train.map((p) => p.label);

export interface LogState {
  lr: number;
  steps: number;
  /** Index into BILL_TASK.all of the penguin whose score is explained. */
  sel: number;
}

export interface LogResult {
  run: LogisticRun;
  model: LogisticModel;
  /** P(Chinstrap) for every penguin in BILL_TASK.all. */
  probs: number[];
  trainLoss: number;
  trainAcc: number;
  testLoss: number;
  testAcc: number;
  sel: { z: number; p: number; x1: number; x2: number };
}

export const LOG_LR_OPTIONS = [0.01, 0.1, 0.5, 1, 3, 10, 30] as const;
export const LOG_MAX_STEPS = 500;

export function computeLogistic(s: LogState): LogResult {
  const run = trainLogistic(TRAIN_Z, TRAIN_Y, { lr: s.lr, steps: s.steps });
  const model = run.model;
  const probs = BILL_TASK.all.map((p) => predictProba(model, scale(BILL_SCALER, p.x)));
  const pick = (split: 'train' | 'test') => {
    const idx = BILL_TASK.all.flatMap((p, i) => (p.split === split ? [i] : []));
    return { p: idx.map((i) => probs[i]!), y: idx.map((i) => BILL_TASK.all[i]!.label) };
  };
  const tr = pick('train');
  const te = pick('test');
  const [x1, x2] = scale(BILL_SCALER, BILL_TASK.all[s.sel]!.x) as [number, number];
  const z = score(model, [x1, x2]);
  return {
    run,
    model,
    probs,
    trainLoss: logLoss(tr.p, tr.y),
    trainAcc: accuracy(tr.p, tr.y),
    testLoss: logLoss(te.p, te.y),
    testAcc: accuracy(te.p, te.y),
    sel: { z, p: sigmoid(z), x1, x2 },
  };
}

/** A number for written arithmetic: negative values in brackets. */
export const paren = (v: number) => (v < 0 ? `(${formatNumber(v)})` : formatNumber(v));
/** A probability for display: 4 decimals, or 3 significant digits when it would round to 0 or 1. */
export function formatP(p: number): string {
  if (p > 0 && p < 5e-5) return p.toExponential(2);
  if (p < 1 && p > 1 - 5e-5) return `1 − ${(1 - p).toExponential(2)}`;
  return formatNumber(p);
}
const article = (word: string) => (/^[AEIOU]/.test(word) ? `an ${word}` : `a ${word}`);

const count = (acc: number, n: number) => `${Math.round(acc * n)}/${n} = ${formatNumber(acc)}`;

/** The selected penguin's score, written for one penguin in pure Python. */
export const PREDICT_SOURCE = `import math

bill_length, bill_depth = {{x}}  # {{who}}
mean = ${JSON.stringify(BILL_SCALER.mean).replace(/,/g, ', ')}  # training means (mm)
std = ${JSON.stringify(BILL_SCALER.std).replace(/,/g, ', ')}  # training standard deviations
w1, w2, b = {{w}}
x1 = (bill_length - mean[0]) / std[0]
x2 = (bill_depth - mean[1]) / std[1]
z = w1 * x1 + w2 * x2 + b
p = 1 / (1 + math.exp(-z))
print(round(z, 4), round(p, 4), "Chinstrap" if p >= 0.5 else "Adelie")`;

const pyNum = (v: number) => (Number.isInteger(v) ? `${v}.0` : String(v));

export function predictSlots(s: LogState, r: LogResult): Record<string, string> {
  const p = BILL_TASK.all[s.sel]!;
  return {
    x: p.x.map(pyNum).join(', '),
    who: `CSV row ${p.row}, ${p.species}, ${p.split === 'train' ? 'training' : 'test'} set`,
    w: [...r.model.w, r.model.b].map(pyNum).join(', '),
  };
}

const r4 = (v: number) => pyNum(Number(v.toFixed(4)));
/** What PREDICT_SOURCE prints. */
export function predictPrint(r: LogResult): string {
  return `${r4(r.sel.z)} ${r4(r.sel.p)} ${r.sel.p >= 0.5 ? 'Chinstrap' : 'Adelie'}`;
}

/** A computed trace of PREDICT_SOURCE for the selected penguin and the current weights. */
export function buildPredictTrace(s: LogState): Trace {
  const r = computeLogistic(s);
  const pen = BILL_TASK.all[s.sel]!;
  const [L, D] = pen.x as [number, number];
  const [m1, m2] = BILL_SCALER.mean as [number, number];
  const [s1, s2] = BILL_SCALER.std as [number, number];
  const [w1, w2] = r.model.w as [number, number];
  const { b } = r.model;
  const f = formatNumber;
  const vars: TraceStep['vars'] = {};
  const steps: TraceStep[] = [];
  const at = (line: number, note: string) => steps.push({ range: { line }, vars: { ...vars }, note });
  vars.bill_length = scalar(L);
  vars.bill_depth = scalar(D);
  at(3, `Penguin at CSV row ${pen.row} (${pen.species}): bill ${f(L)} mm long and ${f(D)} mm deep.`);
  at(4, `Training means: ${f(m1)} mm and ${f(m2)} mm.`);
  at(5, `Training standard deviations: ${f(s1)} mm and ${f(s2)} mm.`);
  vars.w1 = scalar(w1);
  vars.w2 = scalar(w2);
  vars.b = scalar(b);
  at(6, `The trained weights: w1 = ${f(w1)}, w2 = ${f(w2)}, b = ${f(b)}.`);
  vars.x1 = scalar(r.sel.x1);
  at(7, `x1 = (${f(L)} − ${f(m1)}) / ${f(s1)} = ${f(r.sel.x1)} standard deviations from the mean.`);
  vars.x2 = scalar(r.sel.x2);
  at(8, `x2 = (${f(D)} − ${f(m2)}) / ${f(s2)} = ${f(r.sel.x2)}.`);
  vars.z = scalar(r.sel.z);
  at(
    9,
    `z = ${f(w1)} × ${paren(r.sel.x1)} + ${paren(w2)} × ${paren(r.sel.x2)} + ${paren(b)} = ${f(r.sel.z)}.`,
  );
  vars.p = scalar(r.sel.p);
  at(
    10,
    `p = 1 / (1 + e^(−z)) = 1 / (1 + ${f(Math.exp(-r.sel.z))}) = ${formatP(r.sel.p)}: the model's probability that this penguin is a Chinstrap.`,
  );
  steps.push({
    range: { line: 11 },
    vars: { ...vars, output: text(predictPrint(r)) },
    note: `p ${r.sel.p >= 0.5 ? '≥' : '<'} 0.5, so the prediction is ${r.sel.p >= 0.5 ? 'Chinstrap' : 'Adelie'}; the penguin is ${article(pen.species)}.`,
  });
  return { source: 'computed', steps };
}

export function logisticExperiment(id: string, traceExample: string): ExperimentDef<LogState, LogResult> {
  return {
    id,
    initial: { lr: 0.5, steps: 50, sel: 0 },
    controls: [
      {
        kind: 'select',
        id: 'lr',
        label: 'Learning rate η',
        options: LOG_LR_OPTIONS.map((v) => ({ value: String(v), label: String(v) })),
        get: (s) => String(s.lr),
        set: (s, v) => ({ ...s, lr: Number(v) }),
      },
      {
        kind: 'slider',
        id: 'steps',
        label: 'Steps',
        min: 0,
        max: LOG_MAX_STEPS,
        get: (s) => s.steps,
        set: (s, steps) => ({ ...s, steps }),
      },
      {
        kind: 'slider',
        id: 'sel',
        label: 'Selected penguin',
        min: 1,
        max: BILL_TASK.all.length,
        get: (s) => s.sel + 1,
        set: (s, v) => ({ ...s, sel: v - 1 }),
      },
    ],
    compute: computeLogistic,
    trace: buildPredictTrace,
    traceExample,
    readout: (s, r) => [
      {
        label: 'Weights',
        value: `w1 = ${formatNumber(r.model.w[0]!)}, w2 = ${formatNumber(r.model.w[1]!)}, b = ${formatNumber(r.model.b)}`,
      },
      { label: 'Training log loss', value: formatNumber(r.trainLoss) },
      { label: 'Test log loss', value: formatNumber(r.testLoss) },
      { label: 'Training accuracy', value: count(r.trainAcc, BILL_TASK.train.length) },
      { label: 'Test accuracy', value: count(r.testAcc, BILL_TASK.test.length) },
      {
        label: `Penguin ${s.sel + 1}`,
        value: `z = ${formatNumber(r.sel.z)}, p = ${formatP(r.sel.p)}`,
      },
      { label: 'The NumPy loop prints', value: gdPrint(r) },
    ],
  };
}

/** What the lesson's NumPy training loop prints (two lines). */
export function gdPrint(r: LogResult): string {
  const [w1, w2] = r.model.w as [number, number];
  return `w1=${w1.toFixed(4)} w2=${w2.toFixed(4)} b=${r.model.b.toFixed(4)}\nlog loss=${r.trainLoss.toFixed(4)} accuracy=${r.trainAcc.toFixed(4)}`;
}
