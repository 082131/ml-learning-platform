// Code for tensors. Outputs and error messages were produced by running the code with NumPy 2.5.3 on
// CPython 3.13; every printout of the shape builder is checked against NumPy in src/lib/linalg tests.
import { tensorExperiment, tensorSlots } from '@/lib/linalg/tensor';
import type { CodeExample } from '@/lib/types';

export const experiment = tensorExperiment('tensors', { shape: [2, 2, 3], op: 'flatten', focus: [1, 1, 0] });

export const numpyTensor: CodeExample = {
  id: 'tensors-numpy',
  language: 'python',
  source: `import numpy as np

x = np.arange({{size}}).reshape({{shape}})
y = {{op}}
print(x.shape, '->', y.shape)
print(y)`,
  slots: tensorSlots,
  annotations: [
    {
      id: 'arange',
      range: { line: 3, startCol: 4, endCol: 13 },
      match: 'np.arange',
      kind: 'framework',
      title: 'np.arange(n)',
      what: 'The integers 0, 1, …, n − 1 in a 1-D array.',
      why: 'Each entry equals its position, so after a reshape you can see where every number went.',
    },
    {
      id: 'reshape-x',
      range: { line: 3, startCol: 24, endCol: 31 },
      match: 'reshape',
      kind: 'framework',
      title: '.reshape(b, r, c)',
      what: 'Lays the same numbers out in a new shape, filling the last axis first (row-major order).',
      why: 'It builds a 3-D tensor: b items, each an r × c matrix.',
      inputs: 'A shape whose sizes multiply to the number of entries',
      output: 'A tensor of shape (b, r, c)',
    },
    {
      id: 'op',
      range: { line: 4, startCol: 4, endCol: 10 },
      match: '{{op}}',
      kind: 'math',
      title: 'The operation',
      what: 'A reshape keeps the numbers in the same flat order; transpose(0, 2, 1) swaps the last two axes, which moves numbers.',
      why: 'Change the operation in the experiment to see both. Same numbers, different arrangement.',
      output: 'y, with the shape printed on the next line',
    },
    {
      id: 'shape',
      range: { line: 5, startCol: 6, endCol: 13 },
      match: 'x.shape',
      kind: 'framework',
      title: 'x.shape',
      what: 'One size per axis: (b, r, c). The number of axes is x.ndim.',
      why: 'Printing shapes before and after an operation is the fastest way to catch a mistake.',
    },
  ],
};

/** Common tensor shapes in ML, including a batched matrix product. */
export const realShapes: CodeExample = {
  id: 'tensors-real',
  language: 'python',
  source: `import numpy as np

rng = np.random.default_rng(0)
images = rng.normal(size=(32, 3, 28, 28))   # batch, channels, height, width
print(images.shape, images.ndim, images.size)
print(images.reshape(32, -1).shape)

tokens = rng.normal(size=(8, 10, 64))       # batch, sequence, features
W = rng.normal(size=(64, 32))
print((tokens @ W).shape)`,
  annotations: [
    {
      id: 'images',
      range: { line: 4, startCol: 0, endCol: 6 },
      match: 'images',
      kind: 'variable',
      title: 'images: a 4-D tensor',
      what: '32 color images, each with 3 channels (red, green, blue) of 28 × 28 pixels.',
      why: 'This (N, C, H, W) layout is PyTorch’s convention; TensorFlow defaults to (N, H, W, C).',
      output: 'shape (32, 3, 28, 28), 75,264 numbers',
    },
    {
      id: 'minus-one',
      range: { line: 6, startCol: 6, endCol: 28 },
      match: 'images.reshape(32, -1)',
      kind: 'framework',
      title: 'reshape(32, -1)',
      what: '-1 asks NumPy to work out that size: 75,264 / 32 = 2,352 = 3 · 28 · 28.',
      why: 'Flattening each image into one row is what a dense layer needs as input.',
      output: '(32, 2352)',
    },
    {
      id: 'batched',
      range: { line: 10, startCol: 7, endCol: 17 },
      match: 'tokens @ W',
      kind: 'math',
      title: 'tokens @ W (batched)',
      what: 'The same (10, 64) @ (64, 32) product, done for each of the 8 sequences.',
      why: '@ treats the last two axes as matrices and every axis before them as a batch.',
      output: '(8, 10, 32)',
    },
  ],
  expectedOutput: '(32, 3, 28, 28) 4 75264\n(32, 2352)\n(8, 10, 32)',
};
