// Code for gradients-chain-rule. Outputs were produced by running the code with NumPy 2.5.3 on CPython 3.13;
// the experiment's printed line and trace are checked against CPython in src/lib/calculus tests.
import { CHAIN_SOURCE, CHAIN_TRACE_ID, chainRuleExperiment, chainSlots } from '@/lib/calculus/chainRule';
import type { CodeExample } from '@/lib/types';

export const experiment = chainRuleExperiment('chain-rule', { w: 1, x: 2, b: 0, y: 6, selected: 'w' });

export const chainCode: CodeExample = {
  id: CHAIN_TRACE_ID,
  language: 'python',
  source: CHAIN_SOURCE,
  slots: chainSlots,
  annotations: [
    {
      id: 'values',
      range: { line: 1, startCol: 13, endCol: 23 },
      match: '{{values}}',
      kind: 'parameter',
      title: 'The inputs',
      what: 'Weight, feature, bias and target, set by the sliders.',
      why: 'w and b are what training adjusts. x and y are one training example.',
    },
    {
      id: 'forward',
      range: { line: 3 },
      kind: 'syntax',
      title: 'Forward pass',
      what: 'Computes the prediction and the loss, one simple operation per line.',
      why: 'Each line is a node of the computation graph. Keeping the intermediate values lets the backward pass reuse them.',
    },
    {
      id: 'square',
      range: { line: 7, startCol: 4, endCol: 9 },
      match: 'e * e',
      kind: 'math',
      title: 'L = e · e',
      what: 'The squared error: 0 when the prediction is right, large when it is far off.',
      why: 'Its derivative with respect to e is 2e, the first factor of every gradient below.',
    },
    {
      id: 'backward',
      range: { line: 9 },
      kind: 'syntax',
      title: 'Backward pass',
      what: 'Walks the graph from L back to the inputs, multiplying local derivatives.',
      why: 'Each gradient reuses the one computed just before it, so every node is visited once.',
    },
    {
      id: 'dw',
      range: { line: 14, startCol: 8, endCol: 17 },
      match: 'dL_dp * x',
      kind: 'math',
      title: '∂L/∂w = ∂L/∂p · x',
      what: 'p = w·x changes by x for each unit of w, so the local derivative is x.',
      why: 'This is the chain rule: the gradient arriving at p, times how p depends on w.',
    },
    {
      id: 'print',
      range: { line: 15 },
      kind: 'function',
      title: 'print(L, dL_dw, dL_db)',
      what: 'The loss and the two partial derivatives that make up the gradient.',
      why: 'Python prints ints without a decimal point and floats with one, so 16 and 16.0 both appear depending on the inputs.',
    },
  ],
};

/** The same gradient for a batch, vectorized with NumPy. */
export const batchGradient: CodeExample = {
  id: 'chain-batch',
  language: 'python',
  source: `import numpy as np

X = np.array([[1.0, 2.0], [2.0, 0.0], [3.0, 1.0], [0.0, 4.0]])   # 4 examples, 2 features
y = np.array([5.0, 3.0, 8.0, 7.0])
w = np.array([1.0, 1.0])
b = 0.0

err = X @ w + b - y               # shape (4,)
loss = np.mean(err ** 2)
grad_w = 2 * X.T @ err / len(y)   # shape (2,)
grad_b = 2 * np.mean(err)
print(loss)
print(grad_w, grad_b)`,
  annotations: [
    {
      id: 'err',
      range: { line: 8, startCol: 0, endCol: 3 },
      match: 'err',
      kind: 'variable',
      title: 'err: one error per example',
      what: 'ŷ − y for all 4 examples at once: X @ w = [3, 2, 4, 4], so err = [−2, −1, −4, −3].',
      why: 'The same e as in the single-example graph, computed as a vector.',
      output: 'shape (4,)',
    },
    {
      id: 'mean',
      range: { line: 9, startCol: 7, endCol: 14 },
      match: 'np.mean',
      kind: 'framework',
      title: 'Mean squared error',
      what: '(4 + 1 + 16 + 9) / 4 = 7.5.',
      why: 'Averaging makes the loss independent of the batch size, so it adds a factor 1/n to every gradient.',
    },
    {
      id: 'grad-w',
      range: { line: 10, startCol: 13, endCol: 22 },
      match: 'X.T @ err',
      kind: 'math',
      title: 'X.T @ err',
      what: 'For each feature j, the sum over examples of x_ij · err_i: the chain rule’s “times x”, for every example at once.',
      why: '(2, 4) @ (4,) → (2,): one partial derivative per weight.',
      output: '[−16, −20], then × 2 / 4 = [−8, −10]',
    },
  ],
  expectedOutput: '7.5\n[ -8. -10.] -5.0',
};

/** Pure Python gradient check of the graph's result. */
export const checkRunner: CodeExample = {
  id: 'chain-runner',
  language: 'python',
  run: 'pyodide',
  source: `def loss(w, b, x=2.0, y=6.0):
    return (w * x + b - y) ** 2

w, b, h = 1.0, 0.0, 1e-5
dL_dw = (loss(w + h, b) - loss(w - h, b)) / (2 * h)   # hold b fixed
dL_db = (loss(w, b + h) - loss(w, b - h)) / (2 * h)   # hold w fixed
print(round(dL_dw, 6), round(dL_db, 6))`,
  annotations: [],
  expectedOutput: '-16.0 -8.0',
};
