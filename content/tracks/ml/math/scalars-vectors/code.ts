// Code for scalars-vectors. Outputs and error messages were produced by running the code with NumPy 2.5.3
// on CPython 3.13; the printouts in the readout are checked against NumPy in src/lib/linalg tests.
import { vectorBasicsExperiment, vectorSlots } from '@/lib/linalg/vectorExperiments';
import type { CodeExample } from '@/lib/types';

/** One state for the plane, the NumPy code and the readout. */
export const experiment = vectorBasicsExperiment('vectors', { u: [3, 1], v: [1, 2], k: 1.5 });

export const numpyVectors: CodeExample = {
  id: 'vectors-numpy',
  language: 'python',
  source: `import numpy as np

u = np.array({{u}})
v = np.array({{v}})
k = {{k}}
print(u + v)
print(k * u)`,
  slots: vectorSlots,
  annotations: [
    {
      id: 'u',
      range: { line: 3, startCol: 0, endCol: 1 },
      match: 'u',
      kind: 'variable',
      title: 'u',
      what: 'A vector with two components, x and y, stored as a 1-D NumPy array.',
      why: 'Its literal is filled from the arrow you drag, so the code always describes the picture.',
      output: 'An array of shape (2,)',
    },
    {
      id: 'np-array',
      range: { line: 3, startCol: 4, endCol: 12 },
      match: 'np.array',
      kind: 'framework',
      title: 'np.array(...)',
      what: 'Turns a Python list into a NumPy array.',
      why: 'On arrays, + and * work component by component, which is what vector arithmetic needs. On plain lists they do something else (see Common mistakes).',
      inputs: 'A list of numbers',
      output: 'An int array if every number is whole, otherwise a float array',
    },
    {
      id: 'k',
      range: { line: 5, startCol: 0, endCol: 1 },
      match: 'k',
      kind: 'variable',
      title: 'k: a scalar',
      what: 'A single number, not an array.',
      why: 'Multiplying a vector by a scalar stretches, shrinks or flips the arrow without turning it sideways.',
    },
    {
      id: 'plus',
      range: { line: 6, startCol: 8, endCol: 9 },
      match: '+',
      kind: 'math',
      title: 'u + v',
      what: 'Adds matching components: (u₀ + v₀, u₁ + v₁).',
      why: 'Geometrically, place v’s tail at u’s tip; the sum points from the origin to v’s new tip.',
      inputs: 'Two arrays of the same shape',
      output: 'An array of the same shape',
    },
    {
      id: 'times',
      range: { line: 7, startCol: 8, endCol: 9 },
      match: '*',
      kind: 'math',
      title: 'k * u',
      what: 'Multiplies every component of u by k.',
      why: 'NumPy applies the scalar to each element. This is called broadcasting a scalar.',
      output: 'An array with u’s shape. It is a float array if k or u holds a non-whole number',
    },
  ],
};

/** A data point as a vector of features. */
export const featureVector: CodeExample = {
  id: 'vectors-features',
  language: 'python',
  source: `import numpy as np

house = np.array([120.0, 3, 15])   # area in m², rooms, age in years
print(house.shape)
print(house[0])
print(house)

houses = np.array([[120.0, 3, 15],
                   [85.0, 2, 40]])
print(houses.shape)`,
  annotations: [
    {
      id: 'house',
      range: { line: 3, startCol: 0, endCol: 5 },
      match: 'house',
      kind: 'variable',
      title: 'house: a feature vector',
      what: 'One house described by three numbers: its features.',
      why: 'Models only see numbers. Writing each example as a vector lets the same math handle houses, images or sentences.',
      output: 'shape (3,): one axis with 3 entries',
    },
    {
      id: 'index',
      range: { line: 5, startCol: 6, endCol: 14 },
      match: 'house[0]',
      kind: 'syntax',
      title: 'house[0]',
      what: 'The first component, counted from 0.',
      why: 'The position tells you which feature it is, so the order of features must stay the same for every example.',
      output: '120.0, a scalar',
    },
    {
      id: 'print-house',
      range: { line: 6 },
      kind: 'function',
      title: 'print(house)',
      what: 'Prints [120.   3.  15.]: one value was written with a decimal point, so the whole array is float.',
      why: 'A NumPy array holds one type. NumPy pads the numbers so the decimal points line up.',
    },
    {
      id: 'houses',
      range: { line: 8, startCol: 0, endCol: 6 },
      match: 'houses',
      kind: 'variable',
      title: 'houses: a batch',
      what: 'Two feature vectors stacked as rows.',
      why: 'A batch of examples is a matrix with one row per example, the shape the next lessons build on.',
      output: 'shape (2, 3)',
    },
  ],
  expectedOutput: '(3,)\n120.0\n[120.   3.  15.]\n(2, 3)',
};

/** Pure Python, so it runs in the browser without downloading NumPy. */
export const listRunner: CodeExample = {
  id: 'vectors-runner',
  language: 'python',
  run: 'pyodide',
  source: `u = [3, 1]
v = [1, 2]
k = 1.5

print(u + v)                          # lists: + joins them
print([a + b for a, b in zip(u, v)])  # vector addition
print([k * a for a in u])             # scaling by k`,
  annotations: [],
  expectedOutput: '[3, 1, 1, 2]\n[4, 3]\n[4.5, 1.5]',
};
