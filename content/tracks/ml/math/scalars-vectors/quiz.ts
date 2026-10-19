import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'which-vector',
    type: 'choice',
    prompt: 'Which of these is a vector rather than a scalar?',
    options: [
      {
        text: 'The features of one house: [120.0, 3, 15]',
        correct: true,
        explain: 'It is an ordered list of numbers, one per feature, so it has shape (3,).',
      },
      {
        text: 'A learning rate of 0.01',
        correct: false,
        explain: 'A single number is a scalar. It has no components and shape ().',
      },
      {
        text: 'The number of rooms, 3',
        correct: false,
        explain: 'One number on its own is a scalar, even if it is one component of a vector elsewhere.',
      },
    ],
  },
  {
    id: 'sum',
    type: 'numeric',
    prompt: 'u = (2, −1) and v = (3, 4). What is the y component of u + v?',
    answer: 3,
    tolerance: 0,
    hint: 'Add matching components: the y component is u₁ + v₁.',
    explain: '−1 + 4 = 3, so u + v = (5, 3).',
  },
  {
    id: 'scale-negative',
    type: 'choice',
    prompt: 'What does multiplying a vector by k = −2 do to its arrow?',
    options: [
      {
        text: 'Doubles its length and flips it to point the opposite way',
        correct: true,
        explain: 'Every component is multiplied by −2: the size doubles and each sign flips.',
      },
      {
        text: 'Rotates it by 90 degrees',
        correct: false,
        explain: 'Scaling never turns an arrow sideways. It stays on the same line through the origin.',
      },
      {
        text: 'Halves its length',
        correct: false,
        explain: 'That would be k = 0.5. A magnitude of 2 doubles the length.',
      },
    ],
  },
  {
    id: 'list-plus',
    type: 'choice',
    prompt: 'In plain Python, what does [3, 1] + [1, 2] give?',
    options: [
      {
        text: '[3, 1, 1, 2]',
        correct: true,
        explain: 'On lists, + concatenates. Vector addition needs NumPy arrays or a loop over the pairs.',
      },
      {
        text: '[4, 3]',
        correct: false,
        explain: 'That is what np.array([3, 1]) + np.array([1, 2]) gives. Lists are not vectors.',
      },
      {
        text: 'A TypeError',
        correct: false,
        explain: 'Adding two lists is allowed in Python; it just joins them.',
      },
    ],
  },
];

export const vectorExercise: Exercise = {
  id: 'vector-functions',
  prompt:
    'Write `add(u, v)` and `scale(k, u)` for vectors given as Python lists, without NumPy. `add` raises `ValueError` when the lengths differ.',
  starter: `def add(u, v):
    pass

def scale(k, u):
    pass`,
  hints: [
    'Check `len(u) != len(v)` first and raise `ValueError` with both lengths in the message.',
    '`zip(u, v)` pairs up matching components: `[a + b for a, b in zip(u, v)]`.',
    'Scaling is one list comprehension: `[k * a for a in u]`.',
  ],
  solution: `def add(u, v):
    if len(u) != len(v):
        raise ValueError(f"can't add vectors of length {len(u)} and {len(v)}")
    return [a + b for a, b in zip(u, v)]

def scale(k, u):
    return [k * a for a in u]`,
  explanation:
    'Both functions work component by component. The length check matters because zip silently stops at the shorter list, which would hide the mistake instead of reporting it.',
  tests: `assert add([3, 1], [1, 2]) == [4, 3], 'add([3, 1], [1, 2]) should be [4, 3]'
assert add([1, 2, 3], [0, 0, 0]) == [1, 2, 3], 'adding the zero vector changes nothing'
assert scale(1.5, [3, 1]) == [4.5, 1.5], 'scale(1.5, [3, 1]) should be [4.5, 1.5]'
assert scale(-1, [2, -5]) == [-2, 5], 'scaling by -1 flips every sign'
try:
    add([1, 2], [1, 2, 3])
    raised = False
except ValueError:
    raised = True
assert raised, 'add should raise ValueError for vectors of different lengths'`,
};
