// Code for the forward propagation lesson. Outputs were produced with NumPy 2.5.3 on CPython 3.13;
// forwardPass.test.ts checks that the readout prints exactly what NumPy prints for the same values.
import {
  FORWARD_SOURCE,
  forwardExperiment,
  forwardSlots,
  LAYER_LINES,
  LAYER_NAMES,
  type ForwardState,
} from '@/lib/deep/forwardPass';
import type { CodeExample } from '@/lib/types';

const CODE_ID = 'forward-numpy';

/** One state for the lesson: the diagram, the marked code, the annotated code, the trace and the readout. */
export const experiment = forwardExperiment('forward', CODE_ID);
export const layerLines = LAYER_LINES;
export const layerNames = LAYER_NAMES;

const slot = (name: string) => (s: unknown) => forwardSlots(s as ForwardState)[name]!;

export const forwardCode: CodeExample = {
  id: CODE_ID,
  language: 'python',
  source: FORWARD_SOURCE,
  slots: Object.fromEntries(['X', 'n', 'W1', 'b1', 'W2', 'b2', 'f1'].map((k) => [k, slot(k)])),
  annotations: [
    {
      id: 'X',
      range: { line: 3, startCol: 0, endCol: 1 },
      match: 'X',
      kind: 'variable',
      title: 'X: the batch',
      what: 'One row per example, one column per input feature.',
      why: 'Feeding many examples at once turns per-example dot products into one matrix multiplication.',
      output: 'shape (batch, 2)',
    },
    {
      id: 'W1',
      range: { line: 4, startCol: 0, endCol: 2 },
      match: 'W1',
      kind: 'variable',
      title: 'W1: hidden layer weights',
      what: 'Row k holds input k’s weight to each hidden unit; column j holds all the weights into hidden unit j.',
      why: 'Shape (in, out) = (2, 3) is what X @ W1 needs: the inner sizes (2) match.',
      output: 'shape (2, 3)',
    },
    {
      id: 'b1',
      range: { line: 5, startCol: 0, endCol: 2 },
      match: 'b1',
      kind: 'variable',
      title: 'b1: hidden layer biases',
      what: 'One bias per hidden unit.',
      why: 'It is shared by every example in the batch.',
      output: 'shape (3,)',
    },
    {
      id: 'W2',
      range: { line: 6, startCol: 0, endCol: 2 },
      match: 'W2',
      kind: 'variable',
      title: 'W2: output layer weights',
      what: 'One weight from each of the 3 hidden units to the single output.',
      why: 'The output layer’s input is the hidden layer’s output, so its in-size is 3.',
      output: 'shape (3, 1)',
    },
    {
      id: 'XW1',
      range: { line: 9, startCol: 5, endCol: 11 },
      match: 'X @ W1',
      kind: 'math',
      title: 'X @ W1',
      what: 'Every example’s row times every hidden unit’s column: all the weighted sums of the layer at once.',
      why: 'Entry [e][j] is example e’s dot product with hidden unit j’s weights, exactly one neuron’s w·x.',
      inputs: 'X: (batch, 2), W1: (2, 3)',
      output: '(batch, 3)',
    },
    {
      id: 'plus-b1',
      range: { line: 9, startCol: 12, endCol: 16 },
      match: '+ b1',
      kind: 'math',
      title: '+ b1 (broadcasting)',
      what: 'Adds b1 (3,) to every row of the (batch, 3) result.',
      why: 'NumPy broadcasting repeats b1 along the batch dimension, so each example gets the same biases.',
      output: '(batch, 3)',
    },
    {
      id: 'f1',
      range: { line: 10, startCol: 5, endCol: 11 },
      match: '{{f1}}',
      kind: 'parameter',
      title: 'The hidden activation',
      what: 'The activation picked in the experiment, applied to every entry of Z1.',
      why: 'Element-wise, so the shape stays (batch, 3). Without it the two layers would collapse into one.',
    },
    {
      id: 'A1W2',
      range: { line: 11, startCol: 5, endCol: 12 },
      match: 'A1 @ W2',
      kind: 'math',
      title: 'A1 @ W2',
      what: 'The hidden values of every example times the output weights.',
      why: 'The same layer formula again, with the previous layer’s output as input.',
      inputs: 'A1: (batch, 3), W2: (3, 1)',
      output: '(batch, 1)',
    },
    {
      id: 'sigmoid',
      range: { line: 12 },
      kind: 'math',
      title: 'Sigmoid output',
      what: 'Turns each output into a number between 0 and 1.',
      why: 'For a yes/no task the output reads as a probability.',
      output: 'A2, shape (batch, 1): one prediction per example',
    },
    {
      id: 'tolist',
      range: { line: 14 },
      kind: 'function',
      title: 'print(A2.round(4).tolist())',
      what: 'Rounds to 4 decimals and converts the array into nested Python lists for printing.',
      why: 'The readout shows exactly this line for the current values.',
    },
  ],
};

/** The same forward pass with plain lists and loops, run in the browser with Pyodide. */
export const denseRunner: CodeExample = {
  id: 'forward-runner',
  language: 'python',
  run: 'pyodide',
  source: `import math

def dense(X, W, b):
    out = []
    for row in X:
        out.append([sum(row[k] * W[k][j] for k in range(len(W))) + b[j] for j in range(len(b))])
    return out

X = [[0.0, 0.0], [0.0, 1.0], [1.0, 0.0], [1.0, 1.0]]
W1 = [[2.0, 2.0, 1.0], [2.0, 2.0, -1.0]]
b1 = [-1.0, -3.0, 0.0]
W2 = [[2.0], [-2.0], [0.5]]
b2 = [-1.5]

Z1 = dense(X, W1, b1)
A1 = [[math.tanh(z) for z in row] for row in Z1]
Z2 = dense(A1, W2, b2)
A2 = [[1 / (1 + math.exp(-z)) for z in row] for row in Z2]
print(Z1)
print([[round(a, 4) for a in row] for row in A2])`,
  annotations: [],
  expectedOutput:
    '[[-1.0, -3.0, 0.0], [1.0, -1.0, -1.0], [1.0, -1.0, 1.0], [3.0, 1.0, 0.0]]\n[[0.2625], [0.7623], [0.8729], [0.2625]]',
};
