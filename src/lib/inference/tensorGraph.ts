import type { ExperimentDef, ReadoutItem } from '../types';
import type { DigitsModel } from './digitsModel';

/**
 * Follows a batch of digit images through the two-layer digits classifier (64 → 16 → 10) and reports the
 * shape and dtype after every step, or the error NumPy raises. The printout mirrors GRAPH_SOURCE and is
 * checked against NumPy 2.5.3 in tensorGraph.test.ts.
 */
export type Prep = 'flat' | 'image' | 'single' | 'scale255';

export interface GraphState {
  batch: number;
  prep: Prep;
}

export type Shape = number[];

export interface GraphStep {
  id: 'input' | 'prep' | 'dense1' | 'relu' | 'dense2' | 'argmax';
  label: string;
  op: string;
  /** Output shape, or undefined when this step raised or was never reached. */
  shape?: Shape;
  error?: string;
}

export interface GraphResult {
  steps: GraphStep[];
  dtype: 'float64' | 'int64';
  error?: string;
  /** Predicted and true labels, when the graph ran to the end. */
  labels?: number[];
  truth: number[];
  correct?: number;
}

export const MAX_BATCH = 360;

export const PREP_CODE: Record<Prep, string> = {
  flat: 'images.reshape(len(images), 64) / 16',
  image: 'images / 16',
  single: 'images[0].reshape(64) / 16',
  scale255: 'images.reshape(len(images), 64) / 255',
};

export const PREP_LABEL: Record<Prep, string> = {
  flat: 'Flatten to (batch, 64), divide by 16',
  image: 'Forget to flatten: (batch, 8, 8)',
  single: 'Send one image without a batch dimension',
  scale255: 'Divide by 255, as for 8-bit photos',
};

export const shapeText = (s: Shape) => (s.length === 1 ? `(${s[0]},)` : `(${s.join(', ')})`);

const matmulError = (k: number, got: number) =>
  `ValueError: matmul: Input operand 1 has a mismatch in its core dimension 0, with gufunc signature (n?,k),(k,m?)->(n?,m?) (size ${k} is different from ${got})`;

/** x (rows of length k) @ W.T + b, with W stored (out, in) as in digits_mlp.json. */
function dense(x: number[][], W: number[][], b: number[]): number[][] {
  return x.map((row) =>
    W.map((w, j) => {
      let s = 0;
      for (let k = 0; k < row.length; k++) s += row[k]! * w[k]!;
      return s + b[j]!;
    }),
  );
}

const argmax = (v: number[]) => v.reduce((best, x, i) => (x > v[best]! ? i : best), 0);

export function runGraph(m: DigitsModel, s: GraphState): GraphResult {
  const B = s.batch;
  const images = m.test.X.slice(0, B);
  const truth = m.test.y.slice(0, B);
  const dtype = 'float64';
  const steps: GraphStep[] = [
    { id: 'input', label: 'images', op: 'camera frames', shape: [B, 8, 8] },
    { id: 'prep', label: 'x', op: PREP_CODE[s.prep] },
    { id: 'dense1', label: 'Dense 1', op: 'x @ W1 + b1, W1: (64, 16)' },
    { id: 'relu', label: 'ReLU', op: 'np.maximum(·, 0)' },
    { id: 'dense2', label: 'Dense 2', op: 'h @ W2 + b2, W2: (16, 10)' },
    { id: 'argmax', label: 'ArgMax', op: 'argmax(axis=1)' },
  ];
  const set = (i: number, shape: Shape) => (steps[i]!.shape = shape);
  const fail = (i: number, error: string): GraphResult => {
    steps[i]!.error = error;
    return { steps, dtype, error, truth };
  };

  if (s.prep === 'image') {
    set(1, [B, 8, 8]);
    return fail(2, matmulError(64, 8));
  }
  if (s.prep === 'single') {
    set(1, [64]);
    set(2, [16]);
    set(3, [16]);
    set(4, [10]);
    return fail(5, 'numpy.exceptions.AxisError: axis 1 is out of bounds for array of dimension 1');
  }
  const scale = s.prep === 'scale255' ? 255 : 16;
  const x = images.map((img) => img.map((p) => p / scale));
  set(1, [B, 64]);
  const h = dense(x, m.W1, m.b1).map((r) => r.map((v) => Math.max(v, 0)));
  set(2, [B, 16]);
  set(3, [B, 16]);
  const logits = dense(h, m.W2, m.b2);
  set(4, [B, 10]);
  const labels = logits.map(argmax);
  set(5, [B]);
  return { steps, dtype, labels, truth, correct: labels.filter((l, i) => l === truth[i]).length };
}

export const GRAPH_SOURCE = `import json
import numpy as np

model = json.load(open("digits_mlp.json"))
W1, b1 = np.array(model["W1"]).T, np.array(model["b1"])   # (64, 16), (16,)
W2, b2 = np.array(model["W2"]).T, np.array(model["b2"])   # (16, 10), (10,)
images = np.array(model["test"]["X"][:{{batch}}]).reshape(-1, 8, 8)   # pixels 0 to 16
true = np.array(model["test"]["y"][:{{batch}}])

x = {{prep}}
print("x      ", x.shape, x.dtype)
h = np.maximum(x @ W1 + b1, 0)
print("h      ", h.shape)
logits = h @ W2 + b2
print("logits ", logits.shape)
labels = logits.argmax(axis=1)
print("labels ", labels.shape, labels[:8])
print("correct", (labels == true).sum(), "of", len(true))`;

export const graphSlots = (s: GraphState): Record<string, string> => ({
  batch: String(s.batch),
  prep: PREP_CODE[s.prep],
});

const intArray = (v: number[]) => `[${v.join(' ')}]`;

/** What GRAPH_SOURCE prints; on an error, the lines before it and the error's last traceback line. */
export function graphPrintout(r: GraphResult): string[] {
  const out: string[] = [];
  const st = (id: GraphStep['id']) => r.steps.find((x) => x.id === id)!;
  const x = st('prep');
  if (x.shape) out.push(`x       ${shapeText(x.shape)} ${r.dtype}`);
  for (const [id, name] of [
    ['dense1', 'h      '],
    ['dense2', 'logits '],
  ] as const) {
    const step = st(id);
    if (step.error) return [...out, step.error];
    out.push(`${name} ${shapeText(step.shape!)}`);
  }
  const am = st('argmax');
  if (am.error) return [...out, am.error];
  out.push(`labels  ${shapeText(am.shape!)} ${intArray(r.labels!.slice(0, 8))}`);
  out.push(`correct ${r.correct} of ${r.truth.length}`);
  return out;
}

export function graphReadout(s: GraphState, r: GraphResult): ReadoutItem[] {
  return [
    {
      label: 'What the code prints',
      value: graphPrintout(r).join('\n'),
      status: r.error ? 'error' : 'ok',
    },
    {
      label: 'Accuracy on this batch',
      value:
        r.correct === undefined
          ? 'No predictions: the graph stopped with an error.'
          : `${r.correct} of ${s.batch} correct (${((100 * r.correct) / s.batch).toFixed(1)}%)${s.prep === 'scale255' ? ', with no error raised' : ''}`,
    },
  ];
}

export function graphExperiment(id: string, model: DigitsModel, initial: GraphState): ExperimentDef<GraphState, GraphResult> {
  return {
    id,
    initial,
    controls: [
      {
        kind: 'slider',
        id: 'batch',
        label: 'Batch size',
        min: 1,
        max: MAX_BATCH,
        get: (s) => s.batch,
        set: (s, v) => ({ ...s, batch: v }),
      },
      {
        kind: 'select',
        id: 'prep',
        label: 'Preprocessing',
        options: (Object.keys(PREP_CODE) as Prep[]).map((p) => ({ value: p, label: PREP_LABEL[p] })),
        get: (s) => s.prep,
        set: (s, v) => ({ ...s, prep: v as Prep }),
      },
    ],
    compute: (s) => runGraph(model, s),
    readout: graphReadout,
  };
}
