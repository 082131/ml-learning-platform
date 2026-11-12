import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'int8-wrap',
    type: 'choice',
    prompt: 'What is `np.array([120], dtype=np.int8) + 10`?',
    options: [
      {
        text: 'array([130], dtype=int8)',
        correct: false,
        explain: 'int8 holds −128 to 127, so 130 cannot be stored.',
      },
      {
        text: 'array([-126], dtype=int8)',
        correct: true,
        explain: '130 wraps around: 130 − 256 = −126. NumPy does not raise an error for this.',
      },
      {
        text: 'array([130]) as int16',
        correct: false,
        explain:
          'NumPy 2 keeps the array’s dtype when the Python int fits in it; it does not widen the result.',
      },
      {
        text: 'OverflowError',
        correct: false,
        explain: 'That happens only when the Python number itself does not fit, such as + 300.',
      },
    ],
  },
  {
    id: 'float-eq',
    type: 'choice',
    prompt:
      'A test checks `loss == 0.3` and fails although the printed loss looks like 0.3. What is the right check?',
    options: [
      { text: 'round(loss) == 0.3', correct: false, explain: 'round(loss) rounds to an integer, 0.0 here.' },
      {
        text: 'str(loss) == "0.3"',
        correct: false,
        explain: 'Printing can hide the last digits, and 0.1 + 0.2 prints as 0.30000000000000004 anyway.',
      },
      {
        text: 'np.isclose(loss, 0.3)',
        correct: true,
        explain: 'Floats carry rounding error, so compare within a tolerance.',
      },
      { text: 'loss is 0.3', correct: false, explain: 'is compares object identity, never numeric values.' },
    ],
  },
  {
    id: 'nan-mean',
    type: 'choice',
    prompt: 'What is `np.array([3.0, np.nan, 5.0]).mean()`?',
    options: [
      {
        text: '4.0',
        correct: false,
        explain: 'That is np.nanmean, which skips NaN. Plain mean propagates it.',
      },
      {
        text: 'nan',
        correct: true,
        explain: 'Any arithmetic with NaN gives NaN. pandas skips NaN by default; NumPy does not.',
      },
      {
        text: '2.6666666666666665',
        correct: false,
        explain: 'That would treat NaN as 0, which NumPy never does.',
      },
    ],
  },
  {
    id: 'seed',
    type: 'choice',
    prompt: 'Which way of drawing random numbers makes a script reproducible without touching global state?',
    options: [
      {
        text: 'np.random.seed(0) at the top, then np.random.rand()',
        correct: false,
        explain:
          'It works but seeds a hidden global generator that any library can also draw from, shifting your numbers.',
      },
      {
        text: 'rng = np.random.default_rng(0), then rng.random()',
        correct: true,
        explain:
          'A Generator object you pass around: its stream depends only on its seed and how you use it.',
      },
      {
        text: 'import random; random.seed(0)',
        correct: false,
        explain: 'That seeds Python’s own random module, not NumPy’s generators.',
      },
    ],
  },
  {
    id: 'float32-why',
    type: 'choice',
    prompt: 'Why do neural networks usually train in float32 rather than float64?',
    options: [
      {
        text: 'float64 cannot store the negative values gradients need',
        correct: false,
        explain: 'Both formats have a sign bit.',
      },
      {
        text: 'Half the memory, faster on GPUs, precise enough',
        correct: true,
        explain:
          'Gradient noise dwarfs float32 rounding error, and GPUs have far more float32 (and lower-precision) throughput.',
      },
      {
        text: 'float32 stores decimals such as 0.1 exactly, float64 does not',
        correct: false,
        explain: 'Neither format stores 0.1 exactly; float32 is less precise, not more.',
      },
    ],
  },
  {
    id: 'astype',
    type: 'numeric',
    prompt: 'What is `int(np.array([-2.7]).astype(np.int64)[0])`?',
    answer: -2,
    tolerance: 0,
    hint: 'astype to an integer type truncates toward zero; it does not round or floor.',
    explain: 'Truncating −2.7 toward zero gives −2. np.floor would give −3 and np.round −3.',
  },
];

export const splitExercise: Exercise = {
  id: 'py-dtypes-split',
  prompt:
    'Write split_indices(n, val_fraction, seed) that returns (train_idx, val_idx), reproducibly shuffled.',
  starter: `import numpy as np

def split_indices(n, val_fraction, seed):
    idx = np.random.permutation(n)      # bug: ignores seed
    n_val = int(n * val_fraction)
    return idx[n_val:], idx[:n_val]`,
  hints: [
    'Create rng = np.random.default_rng(seed) inside the function.',
    'Use rng.permutation(n) so the same seed always gives the same order.',
    'Keep the rest of the logic: the first n_val shuffled indices are validation.',
  ],
  solution: `import numpy as np

def split_indices(n, val_fraction, seed):
    rng = np.random.default_rng(seed)
    idx = rng.permutation(n)
    n_val = int(n * val_fraction)
    return idx[n_val:], idx[:n_val]`,
  explanation:
    'A local Generator makes the split depend only on its arguments, so the same seed reproduces the same split on every run and every machine, and nothing else in the program can shift it.',
  tests: `import numpy as np
a_train, a_val = split_indices(20, 0.25, seed=3)
b_train, b_val = split_indices(20, 0.25, seed=3)
assert len(a_val) == 5 and len(a_train) == 15
assert np.array_equal(a_train, b_train) and np.array_equal(a_val, b_val), "same seed must give the same split"
assert sorted(np.concatenate([a_train, a_val]).tolist()) == list(range(20))
c_train, _ = split_indices(20, 0.25, seed=4)
assert not np.array_equal(a_train, c_train), "different seeds should differ"`,
};
