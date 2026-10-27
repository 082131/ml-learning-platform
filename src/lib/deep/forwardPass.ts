import { array, formatNumber as n, scalar, text } from '../trace/values';
import type { ExperimentDef, Trace, TraceStep, TraceValue } from '../types';
import { ACTIVATIONS, type ActivationId } from './activations';
import { forward, type Network } from './mlp';
import { npRound, pyFloatList, pyFloatVector } from './pyFormat';

/**
 * A 2-3-1 network on a batch of up to 4 examples: Z1 = X @ W1 + b1, A1 = f(Z1), Z2 = A1 @ W2 + b2,
 * A2 = sigmoid(Z2). The diagram, the linked code, the trace and the readout all read this state.
 */
export interface ForwardState {
  /** All 4 example rows; the first `batch` of them are fed to the network. */
  X: number[][];
  batch: number;
  W1: number[][];
  b1: number[];
  W2: number[][];
  b2: number[];
  hidden: ActivationId;
  /** The layer selected in the diagram: 0 input, 1 hidden, 2 output. */
  layer: number;
  /** The selected unit in that layer. */
  unit: number;
  /** The batch row whose values the diagram shows. */
  example: number;
}

export interface ForwardResult {
  /** Z[0] = Z1 (batch, 3), Z[1] = Z2 (batch, 1). */
  Z: number[][][];
  /** A[0] = X (batch, 2), A[1] = A1 (batch, 3), A[2] = A2 (batch, 1). */
  A: number[][][];
}

export const SIZES = [2, 3, 1] as const;
export const MAX_BATCH = 4;
/** Editable inputs and weights stay in this range; any decimal is allowed. */
export const VALUE_LIMITS = { min: -5, max: 5 } as const;
export const LAYER_NAMES = ['Input layer', 'Hidden layer', 'Output layer'] as const;
const UNIT_PREFIX = ['x', 'h', 'ŷ'] as const;

/** The four corners of the unit square, and weights that make the output high when exactly one input is 1. */
export const FORWARD_INITIAL: ForwardState = {
  X: [
    [0, 0],
    [0, 1],
    [1, 0],
    [1, 1],
  ],
  batch: 4,
  W1: [
    [2, 2, 1],
    [2, 2, -1],
  ],
  b1: [-1, -3, 0],
  W2: [[2], [-2], [0.5]],
  b2: [-1.5],
  hidden: 'tanh',
  layer: 1,
  unit: 0,
  example: 0,
};

export const unitName = (layer: number, unit: number) =>
  layer === 2 ? UNIT_PREFIX[2] : `${UNIT_PREFIX[layer] ?? '?'}[${unit}]`;

export const batchOf = (s: ForwardState) => s.X.slice(0, s.batch);

export const networkOf = (s: ForwardState): Network => [
  { W: s.W1, b: s.b1, activation: s.hidden },
  { W: s.W2, b: s.b2, activation: 'sigmoid' },
];

export function computeForward(s: ForwardState): ForwardResult {
  const { Z, A } = forward(networkOf(s), batchOf(s));
  return { Z, A };
}

/** NumPy for the hidden activation, applied to Z1: np.tanh(Z1), np.maximum(0, Z1), ... */
export const hiddenNumpy = (id: ActivationId) => ACTIVATIONS[id].numpy.replace(/\bz\b/g, 'Z1');

export const FORWARD_SOURCE = `import numpy as np

X = np.array({{X}})  # ({{n}}, 2): {{n}} examples, 2 features each
W1 = np.array({{W1}})  # (2, 3)
b1 = np.array({{b1}})  # (3,)
W2 = np.array({{W2}})  # (3, 1)
b2 = np.array({{b2}})  # (1,)

Z1 = X @ W1 + b1  # ({{n}}, 2) @ (2, 3) + (3,) -> ({{n}}, 3)
A1 = {{f1}}  # ({{n}}, 3)
Z2 = A1 @ W2 + b2  # ({{n}}, 3) @ (3, 1) + (1,) -> ({{n}}, 1)
A2 = 1 / (1 + np.exp(-Z2))  # ({{n}}, 1)
print(A2.shape)
print(A2.round(4).tolist())`;

export const FORWARD_LINE = {
  X: 3,
  W1: 4,
  b1: 5,
  W2: 6,
  b2: 7,
  Z1: 9,
  A1: 10,
  Z2: 11,
  A2: 12,
  shape: 13,
  list: 14,
};
const L = FORWARD_LINE;

/** The code lines that belong to each layer: the input data, then each layer's parameters and its two lines. */
export const LAYER_LINES: Record<number, number[]> = {
  0: [L.X],
  1: [L.W1, L.b1, L.Z1, L.A1],
  2: [L.W2, L.b2, L.Z2, L.A2],
};

export function forwardSlots(s: ForwardState): Record<string, string> {
  return {
    X: pyFloatList(batchOf(s)),
    n: String(s.batch),
    W1: pyFloatList(s.W1),
    b1: pyFloatVector(s.b1),
    W2: pyFloatList(s.W2),
    b2: pyFloatVector(s.b2),
    f1: hiddenNumpy(s.hidden),
  };
}

/** The two lines the code prints: the shape of A2 and its values rounded to 4 decimals. */
export function forwardPrint(s: ForwardState, r: ForwardResult): [string, string] {
  const A2 = r.A[2]!;
  return [`(${s.batch}, 1)`, pyFloatList(A2.map((row) => row.map((v) => npRound(v, 4))))];
}

/** Each stage of the forward pass with its shapes, for a batch of n examples. */
export function forwardShapes(n: number) {
  return [
    { layer: 0, name: 'X', expr: 'X', shapes: `(${n}, 2)`, result: `(${n}, 2)` },
    { layer: 1, name: 'Z1', expr: 'X @ W1 + b1', shapes: `(${n}, 2) @ (2, 3) + (3,)`, result: `(${n}, 3)` },
    { layer: 1, name: 'A1', expr: 'f(Z1)', shapes: `(${n}, 3), element by element`, result: `(${n}, 3)` },
    { layer: 2, name: 'Z2', expr: 'A1 @ W2 + b2', shapes: `(${n}, 3) @ (3, 1) + (1,)`, result: `(${n}, 1)` },
    { layer: 2, name: 'A2', expr: 'σ(Z2)', shapes: `(${n}, 1), element by element`, result: `(${n}, 1)` },
  ];
}

const paren = (v: number) => (v < 0 ? `(${n(v)})` : n(v));

/** How one unit of one example is computed, with its numbers. */
export function describeUnit(s: ForwardState, r: ForwardResult, layer: number, unit: number, e: number) {
  if (layer === 0) return { sum: `x[${unit}] = X[${e}][${unit}] = ${n(r.A[0]![e]![unit]!)}`, act: '' };
  const prev = r.A[layer - 1]![e]!;
  const W = layer === 1 ? s.W1 : s.W2;
  const b = layer === 1 ? s.b1 : s.b2;
  const [Zn, An, Pn] = layer === 1 ? ['Z1', 'A1', 'X'] : ['Z2', 'A2', 'A1'];
  const z = r.Z[layer - 1]![e]![unit]!;
  const a = r.A[layer]![e]![unit]!;
  const symbolic = prev.map((_, k) => `${Pn}[${e}][${k}]·W${layer}[${k}][${unit}]`).join(' + ');
  const numbers = prev.map((x, k) => `${paren(x)}·${paren(W[k]![unit]!)}`).join(' + ');
  const fname = layer === 1 ? ACTIVATIONS[s.hidden].label : 'Sigmoid';
  const actText =
    layer === 1 && s.hidden === 'identity'
      ? `${An}[${e}][${unit}] = ${n(a)} (no activation)`
      : `${An}[${e}][${unit}] = ${fname}(${n(z)}) = ${n(a)}`;
  return {
    sum: `${Zn}[${e}][${unit}] = ${symbolic} + b${layer}[${unit}] = ${numbers} + ${paren(b[unit]!)} = ${n(z)}`,
    act: actText,
  };
}

/** A computed trace of FORWARD_SOURCE: one step per line that runs, with shapes and the arithmetic for row 0. */
export function buildForwardTrace(s: ForwardState): Trace {
  const r = computeForward(s);
  const N = s.batch;
  const vars: Record<string, TraceValue> = {};
  const steps: TraceStep[] = [];
  const add = (line: number, name: string, value: TraceValue, note: string) => {
    vars[name] = value;
    steps.push({ range: { line }, vars: { ...vars }, note });
  };
  const row = (layer: number) =>
    Array.from({ length: SIZES[layer]! }, (_, j) => describeUnit(s, r, layer, j, 0));
  add(
    L.X,
    'X',
    array(batchOf(s)),
    `X has one row per example: ${N} rows of 2 features, shape (${N}, 2). The rows are the batch.`,
  );
  add(
    L.W1,
    'W1',
    array(s.W1),
    'W1 has one row per input (2) and one column per hidden unit (3): shape (2, 3).',
  );
  add(L.b1, 'b1', array(s.b1), 'b1 has one bias per hidden unit: shape (3,).');
  add(L.W2, 'W2', array(s.W2), 'W2 maps 3 hidden values to 1 output: shape (3, 1).');
  add(L.b2, 'b2', array(s.b2), 'b2 is the output unit’s bias: shape (1,).');
  add(
    L.Z1,
    'Z1',
    array(r.Z[0]!),
    `(${N}, 2) @ (2, 3) gives (${N}, 3), and b1 (3,) is added to every row. Row 0, unit by unit: ${row(1)
      .map((u) => u.sum)
      .join('; ')}.`,
  );
  add(
    L.A1,
    'A1',
    array(r.A[1]!),
    `The activation acts on each entry separately, so A1 keeps the shape (${N}, 3). Row 0: ${row(1)
      .map((u) => u.act)
      .join('; ')}.`,
  );
  add(L.Z2, 'Z2', array(r.Z[1]!), `(${N}, 3) @ (3, 1) gives (${N}, 1), plus b2. Row 0: ${row(2)[0]!.sum}.`);
  add(
    L.A2,
    'A2',
    array(r.A[2]!),
    `The sigmoid turns each output into a number between 0 and 1. Row 0: ${row(2)[0]!.act}.`,
  );
  const [shape, list] = forwardPrint(s, r);
  add(L.shape, 'output', text(shape), `One prediction per example: shape (${N}, 1).`);
  steps.push({
    range: { line: L.list },
    vars: { ...vars, output: text(`${shape}\n${list}`) },
    note: 'round(4) rounds each prediction to 4 decimals; tolist() turns the array into nested Python lists.',
  });
  return { source: 'computed', steps };
}

const replaceAt = <T>(xs: readonly T[], i: number, v: T) => xs.map((x, k) => (k === i ? v : x));
const setCell = (m: number[][], i: number, j: number, v: number) => replaceAt(m, i, replaceAt(m[i]!, j, v));

export type ParamName = 'W1' | 'b1' | 'W2' | 'b2';
/** Sets one weight or bias. Biases are edited as one-row grids, so their row index is always 0. */
export function setParam(s: ForwardState, name: ParamName, i: number, j: number, v: number): ForwardState {
  if (name === 'b1' || name === 'b2') return { ...s, [name]: replaceAt(s[name], j, v) };
  return { ...s, [name]: setCell(s[name], i, j, v) };
}

export function selectUnit(s: ForwardState, layer: number, unit: number): ForwardState {
  return { ...s, layer, unit: Math.min(unit, SIZES[layer]! - 1) };
}

export function forwardExperiment(
  id: string,
  traceExample: string,
  initial: ForwardState = FORWARD_INITIAL,
): ExperimentDef<ForwardState, ForwardResult> {
  return {
    id,
    initial,
    controls: [
      {
        kind: 'slider',
        id: 'batch',
        label: 'Batch size (rows of X)',
        min: 1,
        max: MAX_BATCH,
        get: (s) => s.batch,
        set: (s, v) => ({ ...s, batch: v, example: Math.min(s.example, v - 1) }),
      },
      {
        kind: 'select',
        id: 'hidden',
        label: 'Hidden activation f',
        options: (['tanh', 'relu', 'sigmoid', 'identity'] as const).map((a) => ({
          value: a,
          label: ACTIVATIONS[a].label,
        })),
        get: (s) => s.hidden,
        set: (s, v) => ({ ...s, hidden: v as ActivationId }),
      },
      {
        kind: 'matrix-cell',
        id: 'X',
        label: 'X',
        ...VALUE_LIMITS,
        get: (s) => batchOf(s),
        set: (s, i, j, v) => ({ ...s, X: setCell(s.X, i, j, v) }),
        highlight: (s) => ({ rows: [s.example] }),
      },
    ],
    compute: computeForward,
    trace: buildForwardTrace,
    traceExample,
    readout: (s, r) => {
      const [shape, list] = forwardPrint(s, r);
      return [
        { label: 'NumPy: print(A2.shape)', value: shape },
        { label: 'NumPy: print(A2.round(4).tolist())', value: list },
      ];
    },
  };
}
