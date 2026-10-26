// Code for "Vectorization and broadcasting". Outputs were produced by running the code with CPython 3.13 +
// NumPy 2.5 and with Pyodide 314.0.7 (Python 3.14, NumPy 2.4); both print the same. Broadcasting results and
// errors in the experiment are checked against NumPy in src/lib/foundations/broadcasting.test.ts. The timing
// runner has no expected output on purpose: its numbers exist only once it runs in the learner's browser.
import { lineOf, span } from '@/lib/foundations/annotate';
import { aText, bText, broadcastExperiment, type BroadcastState } from '@/lib/foundations/broadcasting';
import type { CodeExample } from '@/lib/types';

/** One state: the broadcasting picture, the code and the readout read it. */
export const experiment = broadcastExperiment('broadcast', { a: '2,3', b: '3' });

const st = (s: unknown) => s as BroadcastState;
const BROADCAST_SOURCE = `import numpy as np

A = {{a}}
B = {{b}}
C = A + B
print(C.shape)
print(C)`;

export const broadcastCode: CodeExample = {
  id: 'broadcast-code',
  language: 'python',
  source: BROADCAST_SOURCE,
  slots: { a: (s) => aText(st(s).a), b: (s) => bText(st(s).b) },
  annotations: [
    {
      id: 'a',
      ...span(BROADCAST_SOURCE, 3, '{{a}}'),
      kind: 'variable',
      title: 'A',
      what: 'An array built from nested lists: one inner list per row.',
      why: 'Writing the numbers out makes the shape visible: count the rows and the numbers in each row.',
    },
    {
      id: 'b',
      ...span(BROADCAST_SOURCE, 4, '{{b}}'),
      kind: 'variable',
      title: 'B',
      what: 'The second operand. It may have fewer axes than A, or size 1 along some axes, or be a plain number.',
      why: 'Change its shape with the controls to see which shapes NumPy accepts.',
    },
    {
      id: 'plus',
      ...span(BROADCAST_SOURCE, 5, 'A + B'),
      kind: 'math',
      title: 'A + B, element-wise with broadcasting',
      what: 'Adds matching elements. If the shapes differ, NumPy lines them up from the right; every axis must have equal sizes or a size of 1, and size-1 axes are stretched.',
      why: 'Broadcasting lets one row, column or number combine with a whole table without a loop and without copying data.',
      output: 'C, an array of the broadcast shape, or a ValueError',
    },
    {
      id: 'shape',
      ...span(BROADCAST_SOURCE, lineOf(BROADCAST_SOURCE, 'C.shape'), 'C.shape'),
      kind: 'variable',
      title: 'C.shape',
      what: 'For each axis, the larger of the two sizes (after lining up from the right).',
      why: 'Predicting this shape before running is the quickest way to catch a broadcasting bug.',
    },
  ],
};

/** Loops vs whole-array operations, masks and per-column statistics, in the browser with Pyodide. */
export const vectorRunner: CodeExample = {
  id: 'vector-runner',
  language: 'python',
  run: 'pyodide',
  source: `import numpy as np

prices = [3.0, 12.5, 7.25, 20.0]
qty = [2, 1, 4, 3]
totals = []
for i in range(len(prices)):
    totals.append(prices[i] * qty[i])
print(totals)

P = np.array(prices)
Q = np.array(qty)
print(P * Q)
print((P * Q).sum())
print(P > 10)
print(P[P > 10])
print(P.mean(), P.max())

X = np.array([[1.0, 200.0], [2.0, 300.0], [3.0, 400.0]])
print(X.shape, X.mean(axis=0).shape)
print(X.mean(axis=0))
print(X - X.mean(axis=0))
Z = (X - X.mean(axis=0)) / X.std(axis=0)
print(Z.round(3))`,
  annotations: [],
  expectedOutput: `[6.0, 12.5, 29.0, 60.0]
[ 6.  12.5 29.  60. ]
107.5
[False  True False  True]
[12.5 20. ]
10.6875 20.0
(3, 2) (2,)
[  2. 300.]
[[  -1. -100.]
 [   0.    0.]
 [   1.  100.]]
[[-1.225 -1.225]
 [ 0.     0.   ]
 [ 1.225  1.225]]`,
};

/** Times a Python loop and NumPy on the same million numbers. Nothing is shown until it runs. */
export const timingRunner: CodeExample = {
  id: 'timing-runner',
  language: 'python',
  run: 'pyodide',
  source: `import time
import numpy as np

x = np.arange(1_000_000) / 1_000_000   # a million numbers from 0 to 1
xs = x.tolist()                         # the same numbers as a Python list

def best_ms(work, repeats=3):
    times = []
    for _ in range(repeats):
        start = time.perf_counter()
        result = work()
        times.append((time.perf_counter() - start) * 1000)
    return min(times), result

def with_loop():
    total = 0.0
    for v in xs:
        total += v * v
    return total

def with_numpy():
    return np.sum(x * x)

loop_ms, a = best_ms(with_loop)
numpy_ms, b = best_ms(with_numpy)
print("Same answer:", bool(np.isclose(a, b)))
print(f"Python loop: {loop_ms:8.1f} ms")
print(f"NumPy:       {numpy_ms:8.1f} ms")
print(f"Measured in your browser just now: NumPy was {loop_ms / numpy_ms:.0f} times as fast.")`,
  annotations: [],
};
