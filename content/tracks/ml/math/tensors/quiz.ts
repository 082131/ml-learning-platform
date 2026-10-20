import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'ndim',
    type: 'choice',
    prompt: 'A batch of 16 sentences, each 20 tokens long, each token a vector of 128 numbers. What is its shape?',
    options: [
      { text: '(16, 20, 128)', correct: true, explain: 'Batch first, then sequence, then features: 3 axes.' },
      { text: '(16, 2560)', correct: false, explain: 'That is the same data flattened per sentence; the token axis is gone.' },
      { text: '(128, 20, 16)', correct: false, explain: 'Same sizes, but the batch axis comes first by convention.' },
    ],
  },
  {
    id: 'minus-one',
    type: 'numeric',
    prompt: 'x has shape (4, 3, 5). What size does -1 become in x.reshape(4, -1)?',
    answer: 15,
    tolerance: 0,
    hint: 'The total number of entries stays 4 · 3 · 5. Divide it by 4.',
    explain: '60 entries / 4 = 15, so the result has shape (4, 15).',
  },
  {
    id: 'reshape-vs-transpose',
    type: 'choice',
    prompt: 'x has shape (2, 3, 4). Which statement is true?',
    options: [
      {
        text: 'x.reshape(2, 4, 3) and x.transpose(0, 2, 1) have the same shape but different contents',
        correct: true,
        explain: 'reshape keeps the flat order of the numbers; transpose moves them so that x[i, j, k] becomes y[i, k, j].',
      },
      {
        text: 'x.reshape(2, 4, 3) is the same array as x.transpose(0, 2, 1)',
        correct: false,
        explain: 'Only the shapes match. np.array_equal returns False for them.',
      },
      {
        text: 'x.reshape(5, 5) works because 2 · 3 · 4 is close to 25',
        correct: false,
        explain: 'The size must match exactly: NumPy raises ValueError: cannot reshape array of size 24 into shape (5,5).',
      },
    ],
  },
  {
    id: 'batched',
    type: 'choice',
    prompt: 'X has shape (8, 10, 64) and W has shape (64, 32). What is the shape of X @ W?',
    options: [
      { text: '(8, 10, 32)', correct: true, explain: 'Each of the 8 (10, 64) matrices is multiplied by W: (10, 64) @ (64, 32) → (10, 32).' },
      { text: '(8, 64, 32)', correct: false, explain: 'The inner size 64 is summed over, so it disappears.' },
      { text: 'An error', correct: false, explain: 'The last axis of X (64) matches the first axis of W (64), so it works.' },
    ],
  },
];

export const flattenExercise: Exercise = {
  id: 'flatten-index',
  prompt:
    'Write `flat_index(index, shape)` that returns the position of `index` when an array of `shape` is flattened in row-major order.',
  starter: `def flat_index(index, shape):
    # index and shape are tuples of the same length, for example (1, 0, 2) and (2, 2, 3).
    pass`,
  hints: [
    'In shape (2, 2, 3), moving one step along axis 0 skips 2 · 3 = 6 entries, along axis 1 skips 3, along axis 2 skips 1.',
    'Work left to right: `pos = pos * size + i` for each pair of `i` and `size`.',
    'Start from `pos = 0` and loop over `zip(index, shape)`.',
  ],
  solution: `def flat_index(index, shape):
    pos = 0
    for i, size in zip(index, shape):
        pos = pos * size + i
    return pos`,
  explanation:
    'Each step multiplies the position so far by the size of the next axis and adds the index along it. This is how NumPy finds an entry in memory for a C-ordered array, and why reshape can relabel entries without moving them.',
  tests: `assert flat_index((1, 0, 2), (2, 2, 3)) == 8, 'x[1, 0, 2] in shape (2, 2, 3) is entry 8'
assert flat_index((0, 0, 0), (2, 2, 3)) == 0, 'the first entry is 0'
assert flat_index((1, 1, 2), (2, 2, 3)) == 11, 'the last entry of 12 is 11'
assert flat_index((3, 4), (5, 6)) == 22, 'in a (5, 6) matrix, row 3 column 4 is 3 * 6 + 4'
assert flat_index((7,), (10,)) == 7, 'a 1-D index is its own position'`,
};
