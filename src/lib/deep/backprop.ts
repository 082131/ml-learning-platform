import { roundTo } from '../math/numeric';
import { array, formatNumber as n, scalar, text } from '../trace/values';
import type { ExperimentDef, Trace, TraceStep, TraceValue } from '../types';
import {
  backward,
  forward,
  loss as lossOf,
  maxRelativeError,
  numericalGrads,
  parameterCount,
  sgdStep,
  type Backward,
  type ForwardCache,
  type LayerGrads,
  type Network,
} from './mlp';
import { pyFixed, pyFloatList, pyFloatVector, pyRepr } from './pyFormat';

/** The 2-2-1 network of the lesson (tanh hidden layer, sigmoid output, MSE loss) on one example. */
export interface BackpropState {
  x: [number, number];
  y: number;
  lr: number;
  W1: number[][];
  b1: number[];
  W2: number[][];
  b2: number[];
  /** The step of the gradient-flow walk-through shown on the diagram. */
  stage: number;
}

export interface BackpropResult {
  net: Network;
  cache: ForwardCache;
  loss: number;
  back: Backward;
  /** Central-difference estimates of every gradient, independent of backprop. */
  numeric: LayerGrads[];
  maxRelError: number;
  after: Network;
  lossAfter: number;
}

/** Matches the 2-2-1 example in deep.test.ts, which is checked against NumPy 2.5.3. */
export const BACKPROP_INITIAL: BackpropState = {
  x: [0.5, -1],
  y: 1,
  lr: 0.5,
  W1: [
    [0.1, -0.2],
    [0.4, 0.3],
  ],
  b1: [0, 0.1],
  W2: [[0.5], [-0.6]],
  b2: [0.2],
  stage: 0,
};

/** Step size for the numerical gradient: small enough for accuracy, large enough to avoid rounding noise. */
export const NUMERIC_EPS = 1e-5;
export const PARAM_LIMITS = { min: -3, max: 3 } as const;

export const networkOf = (s: BackpropState): Network => [
  { W: s.W1, b: s.b1, activation: 'tanh' },
  { W: s.W2, b: s.b2, activation: 'sigmoid' },
];

export function computeBackprop(s: BackpropState): BackpropResult {
  const net = networkOf(s);
  const X = [[...s.x]];
  const Y = [[s.y]];
  const cache = forward(net, X);
  const loss = lossOf('mse', cache.A[2]!, Y);
  const back = backward(net, cache, Y, 'mse');
  const numeric = numericalGrads(net, X, Y, 'mse', NUMERIC_EPS);
  const after = sgdStep(net, back.grads, s.lr);
  const lossAfter = lossOf('mse', forward(after, X).A[2]!, Y);
  return {
    net,
    cache,
    loss,
    back,
    numeric,
    maxRelError: maxRelativeError(back.grads, numeric),
    after,
    lossAfter,
  };
}

export const BACKPROP_SOURCE = `import numpy as np

X = np.array([[{{x0}}, {{x1}}]])  # (1, 2): one example
Y = np.array([[{{y}}]])  # (1, 1): its target
W1 = np.array({{W1}})  # (2, 2)
b1 = np.array({{b1}})  # (2,)
W2 = np.array({{W2}})  # (2, 1)
b2 = np.array({{b2}})  # (1,)

# forward pass
Z1 = X @ W1 + b1
A1 = np.tanh(Z1)
Z2 = A1 @ W2 + b2
A2 = 1 / (1 + np.exp(-Z2))
loss = np.mean((A2 - Y) ** 2)

# backward pass: the chain rule, from the loss back to W1
dA2 = 2 * (A2 - Y) / Y.size
dZ2 = dA2 * A2 * (1 - A2)
dW2 = A1.T @ dZ2
db2 = dZ2.sum(axis=0)
dA1 = dZ2 @ W2.T
dZ1 = dA1 * (1 - A1 ** 2)
dW1 = X.T @ dZ1
db1 = dZ1.sum(axis=0)

# one gradient descent step
lr = {{lr}}
W1, b1 = W1 - lr * dW1, b1 - lr * db1
W2, b2 = W2 - lr * dW2, b2 - lr * db2
A2_new = 1 / (1 + np.exp(-(np.tanh(X @ W1 + b1) @ W2 + b2)))
print(f"loss before: {loss:.6f}")
print(f"loss after:  {np.mean((A2_new - Y) ** 2):.6f}")`;

export function backpropSlots(s: BackpropState): Record<string, string> {
  return {
    x0: pyRepr(s.x[0]),
    x1: pyRepr(s.x[1]),
    y: pyRepr(s.y),
    W1: pyFloatList(s.W1),
    b1: pyFloatVector(s.b1),
    W2: pyFloatList(s.W2),
    b2: pyFloatVector(s.b2),
    lr: pyRepr(s.lr),
  };
}

/** The two lines the code prints. */
export const backpropPrint = (r: Pick<BackpropResult, 'loss' | 'lossAfter'>): [string, string] => [
  `loss before: ${pyFixed(r.loss, 6)}`,
  `loss after:  ${pyFixed(r.lossAfter, 6)}`,
];

export type Phase = 'forward' | 'backward' | 'update';

/** One step of the walk-through: the code line, the chain-rule formula and the same formula with numbers. */
export interface Stage {
  id: string;
  phase: Phase;
  line: number;
  title: string;
  formula: string;
  arithmetic: string[];
  /** Units ("layer:unit"; layer 3 is the loss) and edges ("layer:from:to") this step touches. */
  units: string[];
  edges: string[];
  /** The variable the line creates, for the trace. */
  name: string;
  value: TraceValue;
}

const p = (v: number) => (v < 0 ? `(${n(v)})` : n(v));
const both = (f: (i: number) => string) => [f(0), f(1)];

/** The forward, backward and update steps, each with its numbers. */
export function buildStages(s: BackpropState, r: BackpropResult): Stage[] {
  const { Z, A } = r.cache;
  const z1 = Z[0]![0]!;
  const a1 = A[1]![0]!;
  const z2 = Z[1]![0]![0]!;
  const yhat = A[2]![0]![0]!;
  const { dA, dZ, grads } = r.back;
  const dyhat = dA[2]![0]![0]!;
  const dz2 = dZ[1]![0]![0]!;
  const da1 = dA[1]![0]!;
  const dz1 = dZ[0]![0]!;
  const x = s.x;
  const W1edges = ['1:0:0', '1:0:1', '1:1:0', '1:1:1'];
  const W2edges = ['2:0:0', '2:1:0'];
  return [
    {
      id: 'z1',
      phase: 'forward',
      line: 11,
      title: 'Hidden weighted sums',
      formula: 'z1[j] = x[0]·W1[0][j] + x[1]·W1[1][j] + b1[j]',
      arithmetic: both(
        (j) =>
          `z1[${j}] = ${p(x[0])}·${p(s.W1[0]![j]!)} + ${p(x[1])}·${p(s.W1[1]![j]!)} + ${p(s.b1[j]!)} = ${n(z1[j]!)}`,
      ),
      units: ['1:0', '1:1'],
      edges: W1edges,
      name: 'Z1',
      value: array(Z[0]!),
    },
    {
      id: 'a1',
      phase: 'forward',
      line: 12,
      title: 'Hidden activations',
      formula: 'a1[j] = tanh(z1[j])',
      arithmetic: both((j) => `a1[${j}] = tanh(${n(z1[j]!)}) = ${n(a1[j]!)}`),
      units: ['1:0', '1:1'],
      edges: [],
      name: 'A1',
      value: array(A[1]!),
    },
    {
      id: 'z2',
      phase: 'forward',
      line: 13,
      title: 'Output weighted sum',
      formula: 'z2 = a1[0]·W2[0] + a1[1]·W2[1] + b2',
      arithmetic: [
        `z2 = ${p(a1[0]!)}·${p(s.W2[0]![0]!)} + ${p(a1[1]!)}·${p(s.W2[1]![0]!)} + ${p(s.b2[0]!)} = ${n(z2)}`,
      ],
      units: ['2:0'],
      edges: W2edges,
      name: 'Z2',
      value: array(Z[1]!),
    },
    {
      id: 'a2',
      phase: 'forward',
      line: 14,
      title: 'Prediction',
      formula: 'ŷ = σ(z2) = 1 / (1 + e^(−z2))',
      arithmetic: [`ŷ = σ(${n(z2)}) = ${n(yhat)}`],
      units: ['2:0'],
      edges: [],
      name: 'A2',
      value: array(A[2]!),
    },
    {
      id: 'loss',
      phase: 'forward',
      line: 15,
      title: 'Loss',
      formula: 'L = (ŷ − y)²  (the mean over 1 prediction)',
      arithmetic: [`L = (${n(yhat)} − ${n(s.y)})² = ${p(yhat - s.y)}² = ${n(r.loss)}`],
      units: ['3:0'],
      edges: ['3:0:0'],
      name: 'loss',
      value: scalar(r.loss),
    },
    {
      id: 'dA2',
      phase: 'backward',
      line: 18,
      title: 'Gradient at the prediction',
      formula: '∂L/∂ŷ = 2(ŷ − y) / N, with N = 1 prediction',
      arithmetic: [`∂L/∂ŷ = 2·(${n(yhat)} − ${n(s.y)}) / 1 = ${n(dyhat)}`],
      units: ['2:0', '3:0'],
      edges: ['3:0:0'],
      name: 'dA2',
      value: array(dA[2]!),
    },
    {
      id: 'dZ2',
      phase: 'backward',
      line: 19,
      title: 'Through the sigmoid',
      formula: '∂L/∂z2 = ∂L/∂ŷ · σ′(z2) = ∂L/∂ŷ · ŷ(1 − ŷ)',
      arithmetic: [`∂L/∂z2 = ${p(dyhat)} · ${n(yhat)} · ${n(1 - yhat)} = ${n(dz2)}`],
      units: ['2:0'],
      edges: [],
      name: 'dZ2',
      value: array(dZ[1]!),
    },
    {
      id: 'dW2',
      phase: 'backward',
      line: 20,
      title: 'Output weights',
      formula: '∂L/∂W2[i] = a1[i] · ∂L/∂z2  (z2 depends on W2[i] through a1[i])',
      arithmetic: both((i) => `∂L/∂W2[${i}] = ${p(a1[i]!)} · ${p(dz2)} = ${n(grads[1]!.dW[i]![0]!)}`),
      units: ['2:0'],
      edges: W2edges,
      name: 'dW2',
      value: array(grads[1]!.dW),
    },
    {
      id: 'db2',
      phase: 'backward',
      line: 21,
      title: 'Output bias',
      formula: '∂L/∂b2 = ∂L/∂z2 · 1  (z2 = … + b2)',
      arithmetic: [`∂L/∂b2 = ${n(grads[1]!.db[0]!)}`],
      units: ['2:0'],
      edges: [],
      name: 'db2',
      value: array(grads[1]!.db),
    },
    {
      id: 'dA1',
      phase: 'backward',
      line: 22,
      title: 'Back to the hidden layer',
      formula: '∂L/∂a1[i] = ∂L/∂z2 · W2[i]  (z2 depends on a1[i] through W2[i])',
      arithmetic: both((i) => `∂L/∂a1[${i}] = ${p(dz2)} · ${p(s.W2[i]![0]!)} = ${n(da1[i]!)}`),
      units: ['1:0', '1:1'],
      edges: W2edges,
      name: 'dA1',
      value: array(dA[1]!),
    },
    {
      id: 'dZ1',
      phase: 'backward',
      line: 23,
      title: 'Through tanh',
      formula: '∂L/∂z1[i] = ∂L/∂a1[i] · (1 − a1[i]²)',
      arithmetic: both(
        (i) =>
          `∂L/∂z1[${i}] = ${p(da1[i]!)} · (1 − ${p(a1[i]!)}²) = ${p(da1[i]!)} · ${n(1 - a1[i]! ** 2)} = ${n(dz1[i]!)}`,
      ),
      units: ['1:0', '1:1'],
      edges: [],
      name: 'dZ1',
      value: array(dZ[0]!),
    },
    {
      id: 'dW1',
      phase: 'backward',
      line: 24,
      title: 'Hidden weights',
      formula: '∂L/∂W1[k][i] = x[k] · ∂L/∂z1[i]',
      arithmetic: [0, 1].flatMap((k) =>
        both((i) => `∂L/∂W1[${k}][${i}] = ${p(x[k]!)} · ${p(dz1[i]!)} = ${n(grads[0]!.dW[k]![i]!)}`),
      ),
      units: ['1:0', '1:1'],
      edges: W1edges,
      name: 'dW1',
      value: array(grads[0]!.dW),
    },
    {
      id: 'db1',
      phase: 'backward',
      line: 25,
      title: 'Hidden biases',
      formula: '∂L/∂b1[i] = ∂L/∂z1[i]',
      arithmetic: both((i) => `∂L/∂b1[${i}] = ${n(grads[0]!.db[i]!)}`),
      units: ['1:0', '1:1'],
      edges: [],
      name: 'db1',
      value: array(grads[0]!.db),
    },
    {
      id: 'update',
      phase: 'update',
      line: 29,
      title: 'One gradient descent step',
      formula: 'θ ← θ − η · ∂L/∂θ for every weight and bias θ',
      arithmetic: [
        `W2[0] ← ${n(s.W2[0]![0]!)} − ${n(s.lr)} · ${p(grads[1]!.dW[0]![0]!)} = ${n(r.after[1]!.W[0]![0]!)}`,
        `W1[0][0] ← ${n(s.W1[0]![0]!)} − ${n(s.lr)} · ${p(grads[0]!.dW[0]![0]!)} = ${n(r.after[0]!.W[0]![0]!)}`,
        `… and the same for the other ${parameterCount(r.net) - 2} parameters`,
      ],
      units: ['1:0', '1:1', '2:0'],
      edges: [...W1edges, ...W2edges],
      name: 'W1',
      value: array(r.after[0]!.W),
    },
    {
      id: 'loss-after',
      phase: 'update',
      line: 33,
      title: 'The loss after the step',
      formula: 'Run the forward pass again with the new parameters',
      arithmetic: [
        `L before = ${n(r.loss)}, L after = ${n(r.lossAfter)}: ${r.lossAfter < r.loss ? 'lower' : 'not lower'} by ${n(Math.abs(r.loss - r.lossAfter))}`,
      ],
      units: ['3:0'],
      edges: [],
      name: 'output',
      value: text(backpropPrint(r).join('\n')),
    },
  ];
}

/** A unit as the network diagram shows it: its label, its value and, once known, its gradient. */
export interface DiagramUnitData {
  label: string;
  value: string;
  sub?: string;
}

/** What the diagram shows at a stage: values known so far, gradients computed so far, labels on active edges. */
export function diagramAt(s: BackpropState, r: BackpropResult, stages: Stage[], k: number) {
  const done = new Set(stages.slice(0, k + 1).map((st) => st.id));
  const stage = stages[k]!;
  const { A } = r.cache;
  const { dZ, grads } = r.back;
  const grad = (id: string, v: number) => (done.has(id) ? `g ${n(v)}` : undefined);
  const value = (id: string, v: number) => (done.has(id) ? n(v) : '?');
  const units: DiagramUnitData[][] = [
    [0, 1].map((i) => ({ label: `x[${i}]`, value: n(s.x[i]!) })),
    [0, 1].map((i) => ({
      label: `h[${i}]`,
      value: value('a1', A[1]![0]![i]!),
      sub: grad('dZ1', dZ[0]![0]![i]!),
    })),
    [{ label: 'ŷ', value: value('a2', A[2]![0]![0]!), sub: grad('dZ2', dZ[1]![0]![0]!) }],
    [{ label: 'L', value: value('loss', r.loss) }],
  ];
  const label = (key: string): string | undefined => {
    if (!stage.edges.includes(key)) return undefined;
    const [l, i, j] = key.split(':').map(Number) as [number, number, number];
    if (l === 3) return undefined;
    const W = l === 1 ? s.W1 : s.W2;
    if (stage.id === 'dW1' || stage.id === 'dW2') return `g ${n(grads[l - 1]!.dW[i]![j]!)}`;
    if (stage.id === 'update') return `→ ${n(r.after[l - 1]!.W[i]![j]!)}`;
    return `w ${n(W[i]![j]!)}`;
  };
  const edges = [
    ...[0, 1].flatMap((i) => [0, 1].map((j) => ({ layer: 1, from: i, to: j, weight: s.W1[i]![j]! }))),
    ...[0, 1].map((i) => ({ layer: 2, from: i, to: 0, weight: s.W2[i]![0]! })),
    { layer: 3, from: 0, to: 0, weight: 0 },
  ].map((e) => {
    const key = `${e.layer}:${e.from}:${e.to}`;
    return { ...e, active: stage.edges.includes(key), label: label(key) };
  });
  return {
    layers: ['Input', 'Hidden', 'Output', 'Loss'].map((name, l) => ({ name, units: units[l]! })),
    edges,
    flow: (stage.phase === 'backward' ? 'backward' : 'forward') as 'forward' | 'backward',
  };
}

/** A computed trace of BACKPROP_SOURCE: the setup lines, then one step per stage with its chain-rule arithmetic. */
export function buildBackpropTrace(s: BackpropState): Trace {
  const r = computeBackprop(s);
  const vars: Record<string, TraceValue> = {};
  const steps: TraceStep[] = [];
  const add = (line: number, name: string, value: TraceValue, note: string) => {
    vars[name] = value;
    steps.push({ range: { line }, vars: { ...vars }, note });
  };
  add(3, 'X', array([[...s.x]]), 'X holds one example as a batch of one: shape (1, 2).');
  add(4, 'Y', array([[s.y]]), `Y is the target for that example: ${n(s.y)}, shape (1, 1).`);
  add(5, 'W1', array(s.W1), 'W1: (2, 2), from 2 inputs to 2 hidden units.');
  add(6, 'b1', array(s.b1), 'b1: (2,).');
  add(7, 'W2', array(s.W2), 'W2: (2, 1), from 2 hidden units to 1 output.');
  add(8, 'b2', array(s.b2), 'b2: (1,).');
  for (const st of buildStages(s, r)) {
    if (st.id === 'update') {
      add(28, 'lr', scalar(s.lr), `The learning rate η = ${n(s.lr)}: how far to step against the gradient.`);
      vars.b1 = array(r.after[0]!.b);
      add(29, 'W1', array(r.after[0]!.W), `${st.formula}. ${st.arithmetic[1]}.`);
      vars.b2 = array(r.after[1]!.b);
      add(30, 'W2', array(r.after[1]!.W), `${st.arithmetic[0]}.`);
      add(
        31,
        'A2_new',
        array(forwardOut(r.after, s)),
        'The forward pass again, with the updated parameters.',
      );
      add(32, 'output', text(backpropPrint(r)[0]), 'The loss before the step, to 6 decimals.');
      continue;
    }
    if (st.id === 'loss-after') {
      add(33, 'output', st.value, `${st.arithmetic[0]}.`);
      continue;
    }
    add(st.line, st.name, st.value, `${st.title}: ${st.formula}. ${st.arithmetic.join('; ')}.`);
  }
  return { source: 'computed', steps };
}

const forwardOut = (net: Network, s: BackpropState) => forward(net, [[...s.x]]).A[2]!;

/** Every gradient from backprop next to its numerical estimate. */
export function gradCheckRows(r: BackpropResult) {
  const rows: { name: string; exact: number; numeric: number; relError: number }[] = [];
  const add = (name: string, exact: number, numeric: number) =>
    rows.push({
      name,
      exact,
      numeric,
      relError: Math.abs(exact - numeric) / Math.max(1, Math.abs(exact), Math.abs(numeric)),
    });
  r.back.grads.forEach((g, l) => {
    g.dW.forEach((row, i) =>
      row.forEach((v, j) => add(l === 0 ? `W1[${i}][${j}]` : `W2[${i}]`, v, r.numeric[l]!.dW[i]![j]!)),
    );
    g.db.forEach((v, j) => add(l === 0 ? `b1[${j}]` : 'b2', v, r.numeric[l]!.db[j]!));
  });
  return rows;
}

const tidy = (v: number) => roundTo(v, 2);
const slider = (
  id: string,
  label: string,
  min: number,
  max: number,
  step: number,
  get: (s: BackpropState) => number,
  set: (s: BackpropState, v: number) => BackpropState,
) => ({
  kind: 'slider' as const,
  id,
  label,
  min,
  max,
  step,
  get,
  set: (s: BackpropState, v: number) => set(s, tidy(v)),
  format: (v: number) => n(tidy(v)),
});

export function backpropExperiment(
  id: string,
  traceExample: string,
  initial: BackpropState = BACKPROP_INITIAL,
): ExperimentDef<BackpropState, BackpropResult> {
  return {
    id,
    initial,
    controls: [
      slider(
        'x0',
        'Input x[0]',
        -2,
        2,
        0.1,
        (s) => s.x[0],
        (s, v) => ({ ...s, x: [v, s.x[1]] }),
      ),
      slider(
        'x1',
        'Input x[1]',
        -2,
        2,
        0.1,
        (s) => s.x[1],
        (s, v) => ({ ...s, x: [s.x[0], v] }),
      ),
      slider(
        'y',
        'Target y',
        0,
        1,
        0.1,
        (s) => s.y,
        (s, v) => ({ ...s, y: v }),
      ),
      slider(
        'lr',
        'Learning rate lr',
        0.05,
        5,
        0.05,
        (s) => s.lr,
        (s, v) => ({ ...s, lr: v }),
      ),
    ],
    compute: computeBackprop,
    trace: buildBackpropTrace,
    traceExample,
    readout: (_s, r) => {
      const [before, after] = backpropPrint(r);
      const lower = r.lossAfter < r.loss;
      return [
        { label: 'Python prints', value: `${before}\n${after}` },
        {
          label: 'Change in loss after one step',
          value: `${n(r.lossAfter - r.loss)} (${lower ? 'lower' : 'not lower: the step overshot'})`,
          status: lower ? 'ok' : 'error',
        },
        { label: 'Gradient check: max relative error', value: r.maxRelError.toExponential(1) },
      ];
    },
  };
}

export type BackpropParam = 'W1' | 'b1' | 'W2' | 'b2';
/** Sets one weight or bias (biases are edited as one-row grids, so their row index is 0). */
export function setBackpropParam(
  s: BackpropState,
  name: BackpropParam,
  i: number,
  j: number,
  v: number,
): BackpropState {
  if (name === 'b1' || name === 'b2') return { ...s, [name]: s[name].map((x, k) => (k === j ? v : x)) };
  return { ...s, [name]: s[name].map((row, a) => row.map((x, b) => (a === i && b === j ? v : x))) };
}
