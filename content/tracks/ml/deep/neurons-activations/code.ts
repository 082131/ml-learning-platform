// Code for the neurons lesson. Outputs were produced by running the code with NumPy 2.5.3 on
// CPython 3.13 (and the pure-Python runner with CPython 3.13); neuron.test.ts checks that the
// readout prints exactly what NumPy prints for the same values.
import { NEURON_SOURCE, neuronExperiment, neuronSlots, type NeuronState } from '@/lib/deep/neuron';
import type { CodeExample } from '@/lib/types';

const CODE_ID = 'neuron-numpy';

/** One state for the lesson: the neuron diagram, the activation plot, the code, the trace and the collapse demo. */
export const experiment = neuronExperiment('neuron', CODE_ID);

const slot = (name: string) => (s: unknown) => neuronSlots(s as NeuronState)[name]!;

export const neuronCode: CodeExample = {
  id: CODE_ID,
  language: 'python',
  source: NEURON_SOURCE,
  slots: Object.fromEntries(['x1', 'x2', 'w1', 'w2', 'b', 'f'].map((k) => [k, slot(k)])),
  annotations: [
    {
      id: 'import',
      range: { line: 1 },
      kind: 'syntax',
      title: 'import numpy as np',
      what: 'Loads NumPy under its usual short name np.',
      why: 'NumPy gives us arrays, the dot product (@) and element-wise functions such as np.exp and np.tanh.',
    },
    {
      id: 'x',
      range: { line: 3, startCol: 0, endCol: 1 },
      match: 'x',
      kind: 'variable',
      title: 'x: the inputs',
      what: 'The two numbers the neuron receives, for example two features of one example.',
      why: 'A neuron always works on a vector of inputs. Here it has 2 entries.',
      output: 'shape (2,)',
    },
    {
      id: 'np-array',
      range: { line: 3, startCol: 4, endCol: 12 },
      match: 'np.array',
      kind: 'framework',
      title: 'np.array([...])',
      what: 'Builds a 1-D NumPy array from a Python list.',
      why: 'Arrays support @ (dot product) and element-wise math; lists do not.',
    },
    {
      id: 'w',
      range: { line: 4, startCol: 0, endCol: 1 },
      match: 'w',
      kind: 'variable',
      title: 'w: the weights',
      what: 'One weight per input. A weight says how strongly, and in which direction, its input pushes z.',
      why: 'Training learns these numbers. w must have as many entries as x.',
      output: 'shape (2,)',
    },
    {
      id: 'b',
      range: { line: 5, startCol: 0, endCol: 1 },
      match: 'b',
      kind: 'variable',
      title: 'b: the bias',
      what: 'A single number added to the weighted sum.',
      why: 'It moves the point where the activation switches on, independently of the inputs. Training learns it too.',
    },
    {
      id: 'z',
      range: { line: 6, startCol: 0, endCol: 1 },
      match: 'z',
      kind: 'variable',
      title: 'z: the weighted sum',
      what: 'Also called the pre-activation: the value before f is applied.',
      why: 'Everything the neuron learned is in how it computes z; f only reshapes it.',
      output: 'A single number (a NumPy float64)',
    },
    {
      id: 'dot',
      range: { line: 6, startCol: 4, endCol: 9 },
      match: 'w @ x',
      kind: 'math',
      title: 'w @ x (dot product)',
      what: 'For two 1-D arrays, @ multiplies matching entries and adds them: w[0]·x[0] + w[1]·x[1].',
      why: 'It is the same row-times-column product as in matrix multiplication, for one row and one column.',
      inputs: 'w: (2,), x: (2,)',
      output: 'A single number',
    },
    {
      id: 'activation',
      range: { line: 7, startCol: 4, endCol: 9 },
      match: '{{f}}',
      kind: 'parameter',
      title: 'The activation function',
      what: 'The function chosen in the experiment, written in NumPy: sigmoid, tanh, ReLU (np.maximum(0, z)) or none.',
      why: 'This is the only non-linear step. Without it, stacked neurons stay one linear function.',
      output: 'a, the neuron’s output',
    },
    {
      id: 'print',
      range: { line: 8 },
      kind: 'function',
      title: 'print(f"...")',
      what: 'Prints z and a, each rounded to 4 decimals by the :.4f format.',
      why: 'The readout below the code shows exactly this line for the current sliders.',
    },
  ],
};

/** Two linear layers equal one: checked with NumPy 2.5.3. */
export const collapseCode: CodeExample = {
  id: 'collapse-numpy',
  language: 'python',
  source: `import numpy as np

x = np.array([1.0, 2.0])
W1 = np.array([[1.0, -1.0], [-1.0, 0.5]])
b1 = np.array([0.5, 0.5])
W2 = np.array([[2.0], [1.0]])
b2 = np.array([-0.5])

two_layers = (x @ W1 + b1) @ W2 + b2
W = W1 @ W2
c = b1 @ W2 + b2
one_layer = x @ W + c
print(two_layers, one_layer)

with_relu = np.maximum(0, x @ W1 + b1) @ W2 + b2
print(with_relu)`,
  annotations: [
    {
      id: 'two',
      range: { line: 9 },
      kind: 'math',
      title: 'Two layers, no activation',
      what: 'Layer 1 maps x (2,) to 2 hidden values; layer 2 maps those to 1 output.',
      why: 'This is a 2-layer network with the activation left out.',
      output: 'shape (1,)',
    },
    {
      id: 'merge',
      range: { line: 10, startCol: 4, endCol: 11 },
      match: 'W1 @ W2',
      kind: 'math',
      title: 'W1 @ W2',
      what: 'Multiplies the two weight matrices: (2, 2) @ (2, 1) gives one (2, 1) matrix.',
      why: 'Because (x @ W1) @ W2 = x @ (W1 @ W2), one matrix does the job of two.',
    },
    {
      id: 'c',
      range: { line: 11 },
      kind: 'math',
      title: 'c = b1 @ W2 + b2',
      what: 'The first bias passes through W2, then the second bias is added.',
      why: 'Expanding (x @ W1 + b1) @ W2 + b2 gives x @ (W1 @ W2) + (b1 @ W2 + b2).',
    },
    {
      id: 'relu',
      range: { line: 15, startCol: 12, endCol: 22 },
      match: 'np.maximum',
      kind: 'framework',
      title: 'np.maximum(0, ...)',
      what: 'ReLU: replaces each negative hidden value by 0.',
      why: 'The hidden value -0.5 becomes 0, and the output changes from -1 to 0. No single linear map does that for every x.',
    },
  ],
  expectedOutput: '[-1.] [-1.]\n[0.]',
};

/** The same neuron in plain Python, run in the browser with Pyodide. */
export const neuronRunner: CodeExample = {
  id: 'neuron-runner',
  language: 'python',
  run: 'pyodide',
  source: `import math

def neuron(x, w, b, activation):
    z = sum(wi * xi for wi, xi in zip(w, x)) + b
    if activation == "sigmoid":
        a = 1 / (1 + math.exp(-z))
    elif activation == "tanh":
        a = math.tanh(z)
    elif activation == "relu":
        a = max(0.0, z)
    else:
        a = z
    return z, a

for f in ["sigmoid", "tanh", "relu", "none"]:
    z, a = neuron([1.0, 2.0], [0.5, -1.0], 0.5, f)
    print(f, round(z, 4), round(a, 4))`,
  annotations: [],
  expectedOutput: 'sigmoid -1.0 0.2689\ntanh -1.0 -0.7616\nrelu -1.0 0.0\nnone -1.0 -1.0',
};
