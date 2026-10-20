import { matmul } from '../math/matrix';
import { roundTo } from '../math/numeric';
import { array, formatNumber as n, scalar, text } from '../trace/values';
import type { ExperimentDef, Trace, TraceStep } from '../types';
import { ACTIVATIONS, activationOf, type ActivationId } from './activations';
import { pyFixed, pyRepr } from './pyFormat';

/** One neuron with two inputs: z = w·x + b, a = f(z). */
export interface NeuronState {
  x: [number, number];
  w: [number, number];
  b: number;
  act: ActivationId;
}

/** Two linear layers (2 → 2 → 1) used to show why a non-linear activation is needed. Fixed values. */
export const COLLAPSE = {
  W1: [
    [1, -1],
    [-1, 0.5],
  ],
  b1: [0.5, 0.5],
  W2: [[2], [1]],
  b2: [-0.5],
} as const;

export interface CollapseResult {
  /** Hidden pre-activations h = x @ W1 + b1, shape (2,). */
  h: number[];
  /** f(h) with the chosen activation. */
  fh: number[];
  /** Two-layer output f(h) @ W2 + b2. */
  y: number;
  /** The single linear map the two layers become without an activation: W = W1 @ W2, c = b1 @ W2 + b2. */
  W: number[];
  c: number;
  /** x @ W + c: the output of that single linear map. */
  yLinear: number;
}

export interface NeuronResult {
  z: number;
  a: number;
  /** f'(z), the slope of the activation at z. */
  slope: number;
  collapse: CollapseResult;
}

export const NEURON_LIMIT = 3;
const STEP = 0.1;
/** Slider values are kept to one decimal, so the code literal and the computation use the same number. */
const tidy = (v: number) => roundTo(v, 1);
const paren = (v: number) => (v < 0 ? `(${n(v)})` : n(v));

export const weightedSum = (s: Pick<NeuronState, 'x' | 'w' | 'b'>) => s.w[0] * s.x[0] + s.w[1] * s.x[1] + s.b;

/** h, f(h), the two-layer output and the collapsed linear map, for input x and activation f. */
export function collapseAt(x: readonly number[], act: ActivationId): CollapseResult {
  const f = activationOf(act).f;
  const { W1, b1, W2, b2 } = COLLAPSE;
  const W1m = W1.map((r) => [...r]);
  const W2m = W2.map((r) => [...r]);
  const h = matmul([[...x]], W1m)[0]!.map((v, j) => v + b1[j]!);
  const fh = h.map(f);
  const y = matmul([fh], W2m)[0]![0]! + b2[0];
  const W = matmul(W1m, W2m).map((r) => r[0]!);
  const c = matmul([[...b1]], W2m)[0]![0]! + b2[0];
  const yLinear = x[0]! * W[0]! + x[1]! * W[1]! + c;
  return { h, fh, y, W, c, yLinear };
}

/** The two-layer output y and the single linear map as x1 sweeps [-3, 3] with x2 fixed (for the plot). */
export function collapseCurve(x2: number, act: ActivationId, samples = 60) {
  return Array.from({ length: samples + 1 }, (_, i) => {
    const x1 = -NEURON_LIMIT + (2 * NEURON_LIMIT * i) / samples;
    const r = collapseAt([x1, x2], act);
    return { x1, y: r.y, yLinear: r.yLinear };
  });
}

export function computeNeuron(s: NeuronState): NeuronResult {
  const act = activationOf(s.act);
  const z = weightedSum(s);
  return { z, a: act.f(z), slope: act.df(z), collapse: collapseAt(s.x, s.act) };
}

/** "z = w[0]·x[0] + w[1]·x[1] + b = 0.5·1 + (-1)·2 + 0.5 = 0.5 + (-2) + 0.5 = -1" */
export function describeZ(s: NeuronState): string {
  const p0 = s.w[0] * s.x[0];
  const p1 = s.w[1] * s.x[1];
  return (
    `z = w[0]·x[0] + w[1]·x[1] + b = ${paren(s.w[0])}·${paren(s.x[0])} + ${paren(s.w[1])}·${paren(s.x[1])} + ${paren(s.b)}` +
    ` = ${n(p0)} + ${paren(p1)} + ${paren(s.b)} = ${n(weightedSum(s))}`
  );
}

/** The activation step with its numbers, for example "a = σ(z) = 1 / (1 + e^(1)) = 1 / (1 + 2.7183) = 0.2689". */
export function describeA(act: ActivationId, z: number): string {
  const a = ACTIVATIONS[act].f(z);
  switch (act) {
    case 'sigmoid':
      return `a = σ(z) = 1 / (1 + e^(−z)) = 1 / (1 + e^(${n(-z)})) = 1 / (1 + ${n(Math.exp(-z))}) = ${n(a)}`;
    case 'tanh':
      return `a = tanh(z) = tanh(${n(z)}) = ${n(a)}`;
    case 'relu':
      return `a = ReLU(z) = max(0, ${n(z)}) = ${n(a)}`;
    case 'identity':
      return `a = z = ${n(a)} (no activation)`;
  }
}

/** The line Python prints for this state. */
export const neuronPrint = (r: Pick<NeuronResult, 'z' | 'a'>) =>
  `z = ${pyFixed(r.z, 4)}, a = ${pyFixed(r.a, 4)}`;

export const NEURON_SOURCE = `import numpy as np

x = np.array([{{x1}}, {{x2}}])  # inputs, shape (2,)
w = np.array([{{w1}}, {{w2}}])  # weights, shape (2,)
b = {{b}}  # bias, a single number
z = w @ x + b  # weighted sum
a = {{f}}  # activation
print(f"z = {z:.4f}, a = {a:.4f}")`;

export const NEURON_LINE = { x: 3, w: 4, b: 5, z: 6, a: 7, print: 8 } as const;

/** Slot values for NEURON_SOURCE: inputs and weights as Python floats, and the activation in NumPy. */
export function neuronSlots(s: NeuronState): Record<string, string> {
  return {
    x1: pyRepr(s.x[0]),
    x2: pyRepr(s.x[1]),
    w1: pyRepr(s.w[0]),
    w2: pyRepr(s.w[1]),
    b: pyRepr(s.b),
    f: ACTIVATIONS[s.act].numpy,
  };
}

/** A computed trace of NEURON_SOURCE: one step per line that runs, with the arithmetic in the notes. */
export function buildNeuronTrace(s: NeuronState): Trace {
  const r = computeNeuron(s);
  const x = array([...s.x]);
  const w = array([...s.w]);
  const L = NEURON_LINE;
  const steps: TraceStep[] = [
    {
      range: { line: L.x },
      vars: { x },
      note: `x holds the two inputs, ${n(s.x[0])} and ${n(s.x[1])}: shape (2,).`,
    },
    {
      range: { line: L.w },
      vars: { x, w },
      note: `w holds one weight per input: shape (2,), the same as x, so w @ x is defined.`,
    },
    { range: { line: L.b }, vars: { x, w, b: scalar(s.b) }, note: `The bias b = ${n(s.b)} shifts the sum.` },
    {
      range: { line: L.z, startCol: 0, endCol: 13 },
      vars: { x, w, b: scalar(s.b), z: scalar(r.z) },
      note: `For 1-D arrays, @ is the dot product. ${describeZ(s)}.`,
    },
    {
      range: { line: L.a },
      vars: { x, w, b: scalar(s.b), z: scalar(r.z), a: scalar(r.a) },
      note: `${ACTIVATIONS[s.act].label}: ${describeA(s.act, r.z)}.`,
    },
    {
      range: { line: L.print },
      vars: { x, w, b: scalar(s.b), z: scalar(r.z), a: scalar(r.a), output: text(neuronPrint(r)) },
      note: 'The f-string rounds both numbers to 4 decimals for printing; z and a keep full precision.',
    },
  ];
  return { source: 'computed', steps };
}

export const NEURON_INITIAL: NeuronState = { x: [1, 2], w: [0.5, -1], b: 0.5, act: 'sigmoid' };

/** The single-neuron playground: five sliders and an activation choice, shared by every view. */
export function neuronExperiment(
  id: string,
  traceExample: string,
  initial: NeuronState = NEURON_INITIAL,
): ExperimentDef<NeuronState, NeuronResult> {
  const slider = (
    cid: string,
    label: string,
    get: (s: NeuronState) => number,
    set: (s: NeuronState, v: number) => NeuronState,
  ) =>
    ({
      kind: 'slider',
      id: cid,
      label,
      min: -NEURON_LIMIT,
      max: NEURON_LIMIT,
      step: STEP,
      get,
      set: (s: NeuronState, v: number) => set(s, tidy(v)),
      format: (v: number) => n(tidy(v)),
    }) as const;
  return {
    id,
    initial,
    controls: [
      slider(
        'x1',
        'Input x[0]',
        (s) => s.x[0],
        (s, v) => ({ ...s, x: [v, s.x[1]] }),
      ),
      slider(
        'x2',
        'Input x[1]',
        (s) => s.x[1],
        (s, v) => ({ ...s, x: [s.x[0], v] }),
      ),
      slider(
        'w1',
        'Weight w[0]',
        (s) => s.w[0],
        (s, v) => ({ ...s, w: [v, s.w[1]] }),
      ),
      slider(
        'w2',
        'Weight w[1]',
        (s) => s.w[1],
        (s, v) => ({ ...s, w: [s.w[0], v] }),
      ),
      slider(
        'b',
        'Bias b',
        (s) => s.b,
        (s, v) => ({ ...s, b: v }),
      ),
      {
        kind: 'select',
        id: 'act',
        label: 'Activation f',
        options: (['sigmoid', 'tanh', 'relu', 'identity'] as const).map((a) => ({
          value: a,
          label: ACTIVATIONS[a].label,
        })),
        get: (s) => s.act,
        set: (s, act) => ({ ...s, act: act as ActivationId }),
      },
    ],
    compute: computeNeuron,
    trace: buildNeuronTrace,
    traceExample,
    readout: (s, r) => [
      { label: 'Python: print(...)', value: neuronPrint(r) },
      { label: `Output a = ${ACTIVATIONS[s.act].label}(z)`, value: n(r.a) },
      { label: 'Slope f′(z) at this z', value: n(r.slope) },
    ],
  };
}

const vec = (v: readonly number[]) => `[${v.map(n).join(', ')}]`;

/** The collapse demo written out with its numbers, one line per stage. */
export function describeCollapse(x: readonly number[], act: ActivationId) {
  const r = collapseAt(x, act);
  const { W1, b1, W2, b2 } = COLLAPSE;
  const col = (j: number) =>
    `${paren(x[0]!)}·${paren(W1[0]![j]!)} + ${paren(x[1]!)}·${paren(W1[1]![j]!)} + ${paren(b1[j]!)}`;
  const label = ACTIVATIONS[act].label;
  const same = Math.abs(r.y - r.yLinear) < 1e-9;
  return {
    hidden: `h = x @ W1 + b1 = [${col(0)}, ${col(1)}] = ${vec(r.h)}`,
    activated:
      act === 'identity' ? `f(h) = h = ${vec(r.fh)} (no activation)` : `f(h) = ${label}(h) = ${vec(r.fh)}`,
    twoLayers: `y = f(h) @ W2 + b2 = ${paren(r.fh[0]!)}·${n(W2[0]![0]!)} + ${paren(r.fh[1]!)}·${n(W2[1]![0]!)} + ${paren(b2[0])} = ${n(r.y)}`,
    merged: `W = W1 @ W2 = ${vec(r.W)}, c = b1 @ W2 + b2 = ${n(r.c)}`,
    oneLayer: `x @ W + c = ${paren(x[0]!)}·${paren(r.W[0]!)} + ${paren(x[1]!)}·${paren(r.W[1]!)} + ${paren(r.c)} = ${n(r.yLinear)}`,
    same,
    verdict: same
      ? act === 'identity'
        ? 'Equal: without an activation the two layers are exactly one linear map.'
        : `Equal at this x: ${label} acts like a straight line on these hidden values. Move x[0] to see them part.`
      : `Different: ${label} between the layers changes the output, so no single linear map can replace the two layers.`,
  };
}
