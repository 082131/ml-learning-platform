// Code for dot-product. Outputs and error messages were produced by running the code with NumPy 2.5.3
// on CPython 3.13; the readout's printouts are checked against NumPy in src/lib/linalg tests.
import { dotProductExperiment, dotSlots } from '@/lib/linalg/vectorExperiments';
import type { CodeExample } from '@/lib/types';

export const experiment = dotProductExperiment('dot', { u: [3, 1], v: [1, 2] });

export const numpyDot: CodeExample = {
  id: 'dot-numpy',
  language: 'python',
  source: `import numpy as np

u = np.array({{u}})
v = np.array({{v}})
d = np.dot(u, v)
cos = d / (np.linalg.norm(u) * np.linalg.norm(v))
print(d)
print(cos)`,
  slots: dotSlots,
  annotations: [
    {
      id: 'dot',
      range: { line: 5, startCol: 4, endCol: 10 },
      match: 'np.dot',
      kind: 'framework',
      title: 'np.dot(u, v)',
      what: 'Multiplies matching components and adds the products: u₀v₀ + u₁v₁.',
      why: 'One number that grows when the vectors point the same way and turns negative when they point apart.',
      inputs: 'Two 1-D arrays of the same length',
      output: 'A scalar. For int arrays it is an int; u @ v gives the same result',
    },
    {
      id: 'norm',
      range: { line: 6, startCol: 11, endCol: 25 },
      match: 'np.linalg.norm',
      kind: 'framework',
      title: 'np.linalg.norm(u)',
      what: 'The length ‖u‖ = √(u · u), always a float.',
      why: 'Dividing by both lengths removes the effect of size and leaves only direction.',
      output: 'A float, for example √10 ≈ 3.1623 for (3, 1)',
    },
    {
      id: 'cos',
      range: { line: 6, startCol: 0, endCol: 3 },
      match: 'cos',
      kind: 'math',
      title: 'cos = d / (‖u‖ ‖v‖)',
      what: 'The cosine of the angle between the vectors, between −1 and 1.',
      why: '1 means same direction, 0 means perpendicular, −1 means opposite. This is cosine similarity.',
      output: 'nan when either vector is (0, 0), because 0 / 0 is undefined',
    },
    {
      id: 'print-cos',
      range: { line: 8 },
      kind: 'function',
      title: 'print(cos)',
      what: 'Prints the float with all the digits needed to identify it exactly.',
      why: 'That is why you may see 0.7071067811865475 or −0.9999999999999998 instead of a round number: floats carry rounding error.',
    },
  ],
};

/** Pure Python, so it runs in the browser without downloading NumPy. */
export const dotRunner: CodeExample = {
  id: 'dot-runner',
  language: 'python',
  run: 'pyodide',
  source: `import math

u = [3, 1]
v = [1, 2]
d = sum(a * b for a, b in zip(u, v))
cos = d / (math.sqrt(sum(a * a for a in u)) * math.sqrt(sum(b * b for b in v)))
print(d)
print(cos)
print(math.degrees(math.acos(cos)))`,
  annotations: [],
  expectedOutput: '5\n0.7071067811865475\n45.00000000000001',
};

/** Cosine similarity between word-count vectors of three tiny documents. */
export const similarity: CodeExample = {
  id: 'dot-similarity',
  language: 'python',
  source: `import numpy as np

# counts of the words "cat", "dog", "car" in three documents
docs = np.array([[2, 1, 0],
                 [4, 2, 0],
                 [0, 1, 3]])
unit = docs / np.linalg.norm(docs, axis=1, keepdims=True)
print(np.round(unit @ unit.T, 3))`,
  annotations: [
    {
      id: 'unit',
      range: { line: 7, startCol: 0, endCol: 4 },
      match: 'unit',
      kind: 'variable',
      title: 'unit: every row scaled to length 1',
      what: 'Each document vector divided by its own length.',
      why: 'For unit vectors the dot product is the cosine, so one matrix product compares every pair.',
      output: 'shape (3, 3), each row of length 1',
    },
    {
      id: 'axis',
      range: { line: 7, startCol: 35, endCol: 41 },
      match: 'axis=1',
      kind: 'parameter',
      title: 'axis=1, keepdims=True',
      what: 'One length per row, kept as a column of shape (3, 1).',
      why: 'The column shape lets NumPy divide each row by its own length.',
    },
    {
      id: 'gram',
      range: { line: 8, startCol: 15, endCol: 28 },
      match: 'unit @ unit.T',
      kind: 'math',
      title: 'unit @ unit.T',
      what: 'Entry [i, j] is the dot product of rows i and j: their cosine similarity.',
      why: 'Documents 0 and 1 use the words in the same proportions, so their similarity is 1 even though document 1 is twice as long.',
      output: 'A (3, 3) matrix with 1 on the diagonal',
    },
  ],
  expectedOutput: '[[1.    1.    0.141]\n [1.    1.    0.141]\n [0.141 0.141 1.   ]]',
};
