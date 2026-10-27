// Code for the backpropagation lesson. Outputs were produced with NumPy 2.5.3 on CPython 3.13
// (the pure-Python gradient check with CPython 3.13); backprop.test.ts checks that the readout
// prints exactly what NumPy prints and that every gradient matches its numerical estimate.
import { BACKPROP_SOURCE, backpropExperiment, backpropSlots, type BackpropState } from '@/lib/deep/backprop';
import type { CodeExample } from '@/lib/types';

const CODE_ID = 'backprop-numpy';

/** One state for the lesson: the gradient-flow diagram, the gradient check, the code, the trace and the readout. */
export const experiment = backpropExperiment('backprop', CODE_ID);

const slot = (name: string) => (s: unknown) => backpropSlots(s as BackpropState)[name]!;

export const backpropCode: CodeExample = {
  id: CODE_ID,
  language: 'python',
  source: BACKPROP_SOURCE,
  slots: Object.fromEntries(['x0', 'x1', 'y', 'W1', 'b1', 'W2', 'b2', 'lr'].map((k) => [k, slot(k)])),
  annotations: [
    {
      id: 'loss',
      range: { line: 15 },
      kind: 'math',
      title: 'Mean squared error',
      what: 'The mean of (prediction − target)² over the batch; here the batch has one prediction.',
      why: 'Training lowers this number. Everything below computes how each parameter changes it.',
      output: 'A single number',
    },
    {
      id: 'dA2',
      range: { line: 18 },
      kind: 'math',
      title: 'dA2 = ∂L/∂A2',
      what: 'The derivative of the mean of (A2 − Y)² with respect to A2: 2(A2 − Y) divided by the number of predictions.',
      why: 'This is where the backward pass starts: how the loss changes when the prediction changes.',
      output: 'shape (1, 1), the same as A2',
    },
    {
      id: 'sigmoid-slope',
      range: { line: 19, startCol: 12, endCol: 25 },
      match: 'A2 * (1 - A2)',
      kind: 'math',
      title: 'σ′(z) = σ(z)(1 − σ(z))',
      what: 'The slope of the sigmoid, written with the output A2 = σ(Z2) the forward pass already computed.',
      why: 'Chain rule: ∂L/∂Z2 = ∂L/∂A2 · ∂A2/∂Z2. Reusing A2 avoids recomputing exponentials.',
    },
    {
      id: 'A1T',
      range: { line: 20, startCol: 6, endCol: 10 },
      match: 'A1.T',
      kind: 'framework',
      title: 'A1.T @ dZ2',
      what: 'Transposes A1 from (1, 2) to (2, 1) so that the product has the shape of W2.',
      why: '∂L/∂W2[i][j] = Σ over the batch of A1[e][i] · dZ2[e][j]: exactly A1.T @ dZ2. A gradient always has its parameter’s shape.',
      output: 'dW2: (2, 1)',
    },
    {
      id: 'sum',
      range: { line: 21, startCol: 6, endCol: 21 },
      match: 'dZ2.sum(axis=0)',
      kind: 'framework',
      title: 'dZ2.sum(axis=0)',
      what: 'Adds dZ2 over the batch axis.',
      why: 'b2 was added to every example’s Z2 (broadcasting), so its gradient collects every example’s contribution.',
      output: 'db2: (1,), the shape of b2',
    },
    {
      id: 'W2T',
      range: { line: 22, startCol: 12, endCol: 16 },
      match: 'W2.T',
      kind: 'framework',
      title: 'dZ2 @ W2.T',
      what: 'Sends the output gradient back to each hidden unit, weighted by the weight that connects them.',
      why: 'Z2 = A1 @ W2 + b2, so ∂Z2/∂A1[i] = W2[i]. (1, 1) @ (1, 2) gives (1, 2), the shape of A1.',
      output: 'dA1: (1, 2)',
    },
    {
      id: 'tanh-slope',
      range: { line: 23, startCol: 12, endCol: 25 },
      match: '(1 - A1 ** 2)',
      kind: 'math',
      title: 'tanh′(z) = 1 − tanh(z)²',
      what: 'The slope of tanh, written with A1 = tanh(Z1).',
      why: 'Chain rule through the hidden activation, entry by entry.',
    },
    {
      id: 'XT',
      range: { line: 24, startCol: 6, endCol: 9 },
      match: 'X.T',
      kind: 'framework',
      title: 'X.T @ dZ1',
      what: 'The same rule as for dW2: the layer’s input, transposed, times the gradient at its output.',
      why: '(2, 1) @ (1, 2) gives (2, 2), the shape of W1.',
      output: 'dW1: (2, 2)',
    },
    {
      id: 'lr',
      range: { line: 28, startCol: 5, endCol: 11 },
      match: '{{lr}}',
      kind: 'parameter',
      title: 'Learning rate',
      what: 'The learning rate η from the experiment.',
      why: 'It sets how far each parameter moves against its gradient.',
    },
    {
      id: 'update',
      range: { line: 29 },
      kind: 'math',
      title: 'θ ← θ − η · ∂L/∂θ',
      what: 'Moves every weight and bias a small step against its gradient.',
      why: 'The gradient points uphill in the loss; stepping the other way lowers it, if the step is small enough.',
    },
    {
      id: 'print-after',
      range: { line: 33 },
      kind: 'function',
      title: 'The loss after the step',
      what: 'Runs the forward pass again with the new parameters and prints the new loss.',
      why: 'The readout shows these two lines for the current values.',
    },
  ],
};

/** A gradient check in plain Python, run in the browser with Pyodide. */
export const gradCheckRunner: CodeExample = {
  id: 'gradcheck-runner',
  language: 'python',
  run: 'pyodide',
  source: `import math

x, y = [0.5, -1.0], 1.0
W1 = [[0.1, -0.2], [0.4, 0.3]]
b1 = [0.0, 0.1]
W2 = [0.5, -0.6]
b2 = 0.2

def loss(W1, b1, W2, b2):
    a1 = [math.tanh(x[0] * W1[0][j] + x[1] * W1[1][j] + b1[j]) for j in range(2)]
    yhat = 1 / (1 + math.exp(-(a1[0] * W2[0] + a1[1] * W2[1] + b2)))
    return (yhat - y) ** 2

# Backprop, written out for W2[0]
a1 = [math.tanh(x[0] * W1[0][j] + x[1] * W1[1][j] + b1[j]) for j in range(2)]
yhat = 1 / (1 + math.exp(-(a1[0] * W2[0] + a1[1] * W2[1] + b2)))
dz2 = 2 * (yhat - y) * yhat * (1 - yhat)
backprop = a1[0] * dz2

# Central difference: nudge W2[0] up and down by eps
eps = 1e-5
up = loss(W1, b1, [W2[0] + eps, W2[1]], b2)
down = loss(W1, b1, [W2[0] - eps, W2[1]], b2)
numeric = (up - down) / (2 * eps)

print(f"backprop:  {backprop:.10f}")
print(f"numerical: {numeric:.10f}")
print(f"relative error: {abs(backprop - numeric) / max(1, abs(backprop), abs(numeric)):.1e}")`,
  annotations: [],
  expectedOutput: 'backprop:  0.0746384695\nnumerical: 0.0746384695\nrelative error: 3.6e-12',
};
