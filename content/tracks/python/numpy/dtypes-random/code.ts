// Code for "dtypes, precision and reproducible randomness". Runnable examples were run with CPython 3.13
// and NumPy 2.5 and their output copied; content/tracks/python/python-outputs.test.ts re-runs them. The dtype
// explorer was recorded by src/lib/pycourse/fixtures/dtypes.py.
import { span } from '@/lib/foundations/annotate';
import { recordedExperiment, recordedSlots, type RecordedFixture } from '@/lib/pycourse/recorded';
import fixture from '@/lib/pycourse/fixtures/dtypes.json';
import type { CodeExample } from '@/lib/types';

const dtypes = fixture as RecordedFixture;
const SRC = dtypes.template;

export const experiment = recordedExperiment('py-dtypes', dtypes, 'dtype and addition');

export const dtypeCode: CodeExample = {
  id: 'py-dtypes-code',
  language: 'python',
  source: SRC,
  slots: recordedSlots(dtypes),
  annotations: [
    {
      id: 'dtype',
      ...span(SRC, 3, 'dtype=np.{{dtype}}'),
      kind: 'parameter',
      title: 'The element type',
      what: 'Every element of x is stored in this fixed-size type: int8 uses 1 byte, float32 4 bytes, float64 8 bytes.',
      why: 'The type decides the range of integers and the precision of floats, and NumPy keeps it through arithmetic.',
      inputs: 'the dtype chosen above',
    },
    {
      id: 'add',
      ...span(SRC, 4, 'x + {{add}}'),
      kind: 'math',
      title: 'Adding a Python number',
      what: 'Since NumPy 2, a Python int or float added to an array adopts the array’s dtype if it fits that kind; a Python float added to an int array gives float64.',
      why: 'So int8 + 10 stays int8 and can wrap around, while int8 + 300 is refused because 300 does not fit in int8.',
      inputs: 'the number chosen above',
    },
  ],
};

/** Float comparisons, float32 precision, truncation and integer division. */
export const floatsRunner: CodeExample = {
  id: 'py-dtypes-floats',
  language: 'python',
  run: 'pyodide',
  source: `import numpy as np

print(0.1 + 0.2 == 0.3, 0.1 + 0.2)
print(np.isclose(0.1 + 0.2, 0.3), abs((0.1 + 0.2) - 0.3) < 1e-9)

big = np.float32(16_777_216)               # 2**24
print(big + np.float32(1) == big)          # float32 has 24 bits of precision

x = np.full(1_000_000, 0.1, dtype=np.float32)
print(x.sum(dtype=np.float64), np.float64(x[0]))  # float32 cannot store 0.1 exactly

print(np.array([2.7, -2.7]).astype(np.int64))     # astype truncates toward zero
print(7 // 2, -7 // 2, int(-3.5), round(2.5), round(3.5))
print(np.float32(1.0).nbytes, np.float64(1.0).nbytes)`,
  annotations: [],
  expectedOutput: `False 0.30000000000000004
True True
True
100000.00149011612 0.10000000149011612
[ 2 -2]
3 -4 -3 2 4
4 8`,
};

/** NaN behaviour and the nan-aware reductions. */
export const nanRunner: CodeExample = {
  id: 'py-dtypes-nan',
  language: 'python',
  run: 'pyodide',
  source: `import numpy as np

v = np.array([3.0, np.nan, 5.0])
print(np.nan == np.nan, np.isnan(v))
print(v.mean(), np.nanmean(v), np.nanmax(v))
print(v[~np.isnan(v)])
print(np.array([1, 2]) / np.array([0, 0]))        # warns and gives inf, not an error
print(np.array([0.0]) / 0.0)`,
  annotations: [],
  expectedOutput: `False [False  True False]
nan 4.0 5.0
[3. 5.]
[inf inf]
[nan]`,
};

/** Seeded Generators: same seed, same numbers; a seeded split. */
export const rngRunner: CodeExample = {
  id: 'py-dtypes-rng',
  language: 'python',
  run: 'pyodide',
  source: `import numpy as np

rng = np.random.default_rng(seed=42)
print(rng.integers(0, 10, size=5))
print(rng.normal(loc=0.0, scale=1.0, size=3).round(3))

again = np.random.default_rng(seed=42)
print(again.integers(0, 10, size=5))               # same seed, same numbers

rng = np.random.default_rng(seed=7)
idx = rng.permutation(10)
train, val = idx[:8], idx[8:]
print(train, val)

a = np.random.default_rng(0).random(3).round(3)
b = np.random.default_rng(1).random(3).round(3)
print(a, b)`,
  annotations: [],
  expectedOutput: `[0 7 6 4 4]
[ 0.941 -1.951 -1.302]
[0 7 6 4 4]
[8 0 7 1 3 6 2 4] [5 9]
[0.637 0.27  0.041] [0.512 0.95  0.144]`,
};
