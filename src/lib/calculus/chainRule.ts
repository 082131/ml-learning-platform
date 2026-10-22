import { pyLiteral, pyRepr } from '../linalg/pyFormat';
import { formatNumber, scalar, text } from '../trace/values';
import type { ExperimentDef, Trace, TraceStep } from '../types';

/**
 * A one-weight linear model and its squared error as a computation graph:
 * p = w·x, ŷ = p + b, e = ŷ − y, L = e·e. The backward pass applies the chain rule node by node.
 */
export const CHAIN_SOURCE = `w, x, b, y = {{values}}

# forward pass
p = w * x
y_hat = p + b
e = y_hat - y
L = e * e

# backward pass: the chain rule, from L back to w and b
dL_de = 2 * e
dL_dyhat = dL_de * 1
dL_dp = dL_dyhat * 1
dL_db = dL_dyhat * 1
dL_dw = dL_dp * x
print(L, dL_dw, dL_db)`;

const LINE = { values: 1, p: 4, yhat: 5, e: 6, L: 7, de: 10, dyhat: 11, dp: 12, db: 13, dw: 14, print: 15 };

/** A Python number: its value and whether Python holds it as a float (any float operand makes a float). */
interface Num {
  v: number;
  float: boolean;
}
const lit = (v: number): Num => ({ v: v + 0, float: !Number.isInteger(v) });
const op = (a: Num, b: Num, f: (x: number, y: number) => number): Num => ({
  v: f(a.v, b.v),
  float: a.float || b.float,
});
const ONE: Num = { v: 1, float: false };
const TWO: Num = { v: 2, float: false };

/** str() of a Python int or float, as print shows it. */
export const pyStr = (n: Num) => (n.float ? pyRepr(n.v) : String(n.v + 0));

export interface ChainInputs {
  w: number;
  x: number;
  b: number;
  y: number;
}

export type NodeId = 'w' | 'x' | 'b' | 'y' | 'p' | 'yhat' | 'e' | 'L';

export interface ChainResult {
  value: Record<NodeId, Num>;
  /** ∂L/∂node for the nodes the backward pass reaches. */
  grad: Partial<Record<NodeId, Num>>;
}

/** The forward and backward pass, in the exact order of CHAIN_SOURCE. */
export function forwardBackward({ w, x, b, y }: ChainInputs): ChainResult {
  const [W, X, B, Y] = [lit(w), lit(x), lit(b), lit(y)];
  const p = op(W, X, (a, c) => a * c);
  const yhat = op(p, B, (a, c) => a + c);
  const e = op(yhat, Y, (a, c) => a - c);
  const L = op(e, e, (a, c) => a * c);
  const de = op(TWO, e, (a, c) => a * c);
  const dyhat = op(de, ONE, (a, c) => a * c);
  const dp = op(dyhat, ONE, (a, c) => a * c);
  const db = op(dyhat, ONE, (a, c) => a * c);
  const dw = op(dp, X, (a, c) => a * c);
  return {
    value: { w: W, x: X, b: B, y: Y, p, yhat, e, L },
    grad: { L: ONE, e: de, yhat: dyhat, p: dp, b: db, w: dw },
  };
}

const n = (x: Num) => formatNumber(x.v + 0);
const paren = (x: Num) => (x.v < 0 ? `(${n(x)})` : n(x));

/** A computed trace of CHAIN_SOURCE: one step per executed line, with the arithmetic of each. */
export function buildChainTrace(inputs: ChainInputs): Trace {
  const { value: v, grad: g } = forwardBackward(inputs);
  const vars: TraceStep['vars'] = {};
  const steps: TraceStep[] = [];
  const set = (name: string, x: Num, line: number, note: string) => {
    vars[name] = scalar(x.v + 0);
    steps.push({ range: { line }, vars: { ...vars }, note });
  };
  vars.w = scalar(v.w.v);
  vars.x = scalar(v.x.v);
  vars.b = scalar(v.b.v);
  set(
    'y',
    v.y,
    LINE.values,
    `Inputs: weight w = ${n(v.w)}, feature x = ${n(v.x)}, bias b = ${n(v.b)}, target y = ${n(v.y)}.`,
  );
  set('p', v.p, LINE.p, `p = w·x = ${paren(v.w)}·${paren(v.x)} = ${n(v.p)}.`);
  set('y_hat', v.yhat, LINE.yhat, `The prediction ŷ = p + b = ${n(v.p)} + ${paren(v.b)} = ${n(v.yhat)}.`);
  set('e', v.e, LINE.e, `The error e = ŷ − y = ${n(v.yhat)} − ${paren(v.y)} = ${n(v.e)}.`);
  set(
    'L',
    v.L,
    LINE.L,
    `The loss L = e·e = ${paren(v.e)}·${paren(v.e)} = ${n(v.L)}. The forward pass is done.`,
  );
  set('dL_de', g.e!, LINE.de, `Local derivative of e·e is 2e, so ∂L/∂e = 2·${paren(v.e)} = ${n(g.e!)}.`);
  set(
    'dL_dyhat',
    g.yhat!,
    LINE.dyhat,
    `e = ŷ − y, so ∂e/∂ŷ = 1. Chain rule: ∂L/∂ŷ = ∂L/∂e · 1 = ${n(g.yhat!)}.`,
  );
  set('dL_dp', g.p!, LINE.dp, `ŷ = p + b, so ∂ŷ/∂p = 1 and ∂L/∂p = ∂L/∂ŷ · 1 = ${n(g.p!)}.`);
  set('dL_db', g.b!, LINE.db, `Also ∂ŷ/∂b = 1, so ∂L/∂b = ∂L/∂ŷ · 1 = ${n(g.b!)}.`);
  set(
    'dL_dw',
    g.w!,
    LINE.dw,
    `p = w·x, so ∂p/∂w = x. ∂L/∂w = ∂L/∂p · x = ${paren(g.p!)}·${paren(v.x)} = ${n(g.w!)}.`,
  );
  steps.push({
    range: { line: LINE.print },
    vars: { ...vars, output: text(printLine(inputs)) },
    note: `print shows the loss and the gradient (∂L/∂w, ∂L/∂b) = (${n(g.w!)}, ${n(g.b!)}).`,
  });
  return { source: 'computed', steps };
}

/** What print(L, dL_dw, dL_db) prints. */
export function printLine(inputs: ChainInputs) {
  const { value, grad } = forwardBackward(inputs);
  return [value.L, grad.w!, grad.b!].map(pyStr).join(' ');
}

export interface ChainState extends ChainInputs {
  selected: NodeId;
}

export const INPUT_RANGE = { min: -3, max: 3, step: 0.5 } as const;
export const TARGET_RANGE = { min: -6, max: 6, step: 0.5 } as const;
export const CHAIN_TRACE_ID = 'chain-rule-code';

/** The chain-rule lesson's experiment: four inputs, a selected graph node, the trace and the readout. */
export function chainRuleExperiment(id: string, initial: ChainState): ExperimentDef<ChainState, ChainResult> {
  const input = (
    key: keyof ChainInputs,
    label: string,
    range: { min: number; max: number; step: number } = INPUT_RANGE,
  ) =>
    ({
      kind: 'slider',
      id: key,
      label,
      ...range,
      get: (s: ChainState) => s[key],
      set: (s: ChainState, v: number) => ({ ...s, [key]: v }),
      format: formatNumber,
    }) as const;
  return {
    id,
    initial,
    controls: [
      input('w', 'Weight w'),
      input('b', 'Bias b'),
      input('x', 'Feature x'),
      input('y', 'Target y', TARGET_RANGE),
    ],
    compute: (s) => forwardBackward(s),
    trace: (s) => buildChainTrace(s),
    traceExample: CHAIN_TRACE_ID,
    readout: (s, r) => [
      { label: 'Prediction ŷ = w·x + b', value: n(r.value.yhat) },
      { label: 'Loss L = (ŷ − y)²', value: n(r.value.L) },
      { label: 'Gradient (∂L/∂w, ∂L/∂b)', value: `(${n(r.grad.w!)}, ${n(r.grad.b!)})` },
      { label: 'print(L, dL_dw, dL_db)', value: printLine(s) },
    ],
  };
}

export const chainSlots = {
  values: (s: unknown) => {
    const c = s as ChainState;
    return [c.w, c.x, c.b, c.y].map(pyLiteral).join(', ');
  },
};

/**
 * The graph's layout in diagram units: the chain from w to L in one row, b feeding ŷ from below. The
 * data x and y are not nodes; their values appear in the edge and node labels that use them.
 */
const LAYOUT: Partial<Record<NodeId, [number, number]>> = {
  w: [0, 0],
  p: [260, 0],
  yhat: [520, 0],
  b: [520, 130],
  e: [780, 0],
  L: [1040, 0],
};
const NAMES: Record<NodeId, string> = { w: 'w', x: 'x', b: 'b', y: 'y', p: 'p', yhat: 'ŷ', e: 'e', L: 'L' };
const FORMULA: Partial<Record<NodeId, string>> = { p: 'w·x', yhat: 'p + b', e: 'ŷ − y', L: 'e·e' };
/** Each node's path to L, for the chain-rule product. */
const PATH: Partial<Record<NodeId, NodeId[]>> = {
  L: ['L'],
  e: ['e', 'L'],
  yhat: ['yhat', 'e', 'L'],
  p: ['p', 'yhat', 'e', 'L'],
  b: ['b', 'yhat', 'e', 'L'],
  w: ['w', 'p', 'yhat', 'e', 'L'],
};

export interface GraphNode {
  id: NodeId;
  label: string;
  detail: string;
  x: number;
  y: number;
}
export interface GraphEdge {
  from: NodeId;
  to: NodeId;
  label: string;
  active: boolean;
}

/** The local derivative ∂to/∂from on each edge, with its value. */
function localDerivatives(r: ChainResult): { from: NodeId; to: NodeId; symbol: string; value: number }[] {
  const v = r.value;
  return [
    { from: 'w', to: 'p', symbol: 'x', value: v.x.v },
    { from: 'p', to: 'yhat', symbol: '1', value: 1 },
    { from: 'b', to: 'yhat', symbol: '1', value: 1 },
    { from: 'yhat', to: 'e', symbol: '1', value: 1 },
    { from: 'e', to: 'L', symbol: '2e', value: 2 * v.e.v },
  ];
}

/** Nodes show their forward value and ∂L/∂node; edges show local derivatives. The selected path is active. */
export function chainGraph(r: ChainResult, selected: NodeId): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const path = new Set(PATH[selected] ?? []);
  const nodes = (Object.keys(LAYOUT) as NodeId[]).map((id) => {
    const [x, y] = LAYOUT[id]!;
    const name = NAMES[id];
    const value = formatNumber(r.value[id].v + 0);
    const g = r.grad[id];
    return {
      id,
      label: FORMULA[id] ? `${name} = ${FORMULA[id]} = ${value}` : `${name} = ${value}`,
      detail: `∂L/∂${name} = ${formatNumber(g!.v + 0)}`,
      x,
      y,
    };
  });
  const edges = localDerivatives(r).map((d) => ({
    from: d.from,
    to: d.to,
    label: `∂${NAMES[d.to]}/∂${NAMES[d.from]} = ${d.symbol === formatNumber(d.value) ? d.symbol : `${d.symbol} = ${formatNumber(d.value + 0)}`}`,
    active: path.has(d.from) && path.has(d.to),
  }));
  return { nodes, edges };
}

/** "∂L/∂w = ∂L/∂e · ∂e/∂ŷ · ∂ŷ/∂p · ∂p/∂w = (−8) · 1 · 1 · 2 = −16", or why a node has no gradient. */
export function describeGradient(r: ChainResult, node: NodeId): string {
  const path = PATH[node];
  const name = NAMES[node];
  if (!path)
    return `${name} is data, not a parameter: training never changes it, so its gradient is not computed.`;
  if (node === 'L') return '∂L/∂L = 1: the backward pass starts here.';
  const locals = localDerivatives(r);
  const factors = path
    .slice(0, -1)
    .map((from, i) => locals.find((d) => d.from === from && d.to === path[i + 1])!);
  const symbols = [...factors].reverse().map((d) => `∂${NAMES[d.to]}/∂${NAMES[d.from]}`);
  const values = [...factors]
    .reverse()
    .map((d) => (d.value < 0 ? `(${formatNumber(d.value)})` : formatNumber(d.value)));
  return `∂L/∂${name} = ${symbols.join(' · ')} = ${values.join(' · ')} = ${formatNumber(r.grad[node]!.v + 0)}`;
}
