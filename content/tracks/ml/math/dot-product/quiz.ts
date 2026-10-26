import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'compute',
    type: 'numeric',
    prompt: 'What is the dot product of (2, −1, 3) and (4, 5, 1)?',
    answer: 6,
    tolerance: 0,
    hint: 'Multiply matching components, then add: 2·4 + (−1)·5 + 3·1.',
    explain: '8 − 5 + 3 = 6.',
  },
  {
    id: 'length',
    type: 'numeric',
    prompt: 'What is the length ‖u‖ of u = (3, 4)?',
    answer: 5,
    tolerance: 0,
    hint: '‖u‖ = √(u · u). Start with u · u = 3·3 + 4·4.',
    explain: 'u · u = 9 + 16 = 25, and √25 = 5.',
  },
  {
    id: 'sign',
    type: 'choice',
    prompt: 'The dot product of two nonzero vectors is negative. What does that tell you?',
    options: [
      {
        text: 'The angle between them is more than 90°',
        correct: true,
        explain:
          'u · v = ‖u‖‖v‖ cos θ, and the lengths are positive, so the sign is the sign of cos θ: negative beyond 90°.',
      },
      {
        text: 'One of the vectors has a negative length',
        correct: false,
        explain: 'Lengths are never negative: ‖u‖ = √(u · u) ≥ 0.',
      },
      {
        text: 'They are perpendicular',
        correct: false,
        explain: 'Perpendicular vectors have a dot product of exactly 0.',
      },
    ],
  },
  {
    id: 'cosine-scale',
    type: 'choice',
    prompt: 'Document B has exactly twice the word counts of document A. What is their cosine similarity?',
    options: [
      {
        text: '1',
        correct: true,
        explain: 'B = 2A points in the same direction, and cosine similarity ignores length.',
      },
      {
        text: '2',
        correct: false,
        explain:
          'Cosine similarity is a cosine, so it is never above 1. The dot product would double, but the lengths cancel it.',
      },
      {
        text: '0.5',
        correct: false,
        explain: 'Scaling one vector changes its length, not its direction, so the angle stays 0.',
      },
    ],
  },
];

export const cosineExercise: Exercise = {
  id: 'cosine-function',
  prompt:
    'Write `dot(u, v)` and `cosine(u, v)` for vectors given as lists, without NumPy. Both raise `ValueError` for different lengths; `cosine` also raises it when a vector has length 0.',
  starter: `import math

def dot(u, v):
    pass

def cosine(u, v):
    pass`,
  hints: [
    '`dot` is `sum(a * b for a, b in zip(u, v))`, after checking the lengths.',
    'The length of u is `math.sqrt(dot(u, u))`.',
    'In `cosine`, compute both lengths first and raise `ValueError` if either is 0, then return `dot(u, v) / (nu * nv)`.',
  ],
  solution: `import math

def dot(u, v):
    if len(u) != len(v):
        raise ValueError(f"lengths differ: {len(u)} and {len(v)}")
    return sum(a * b for a, b in zip(u, v))

def cosine(u, v):
    nu = math.sqrt(dot(u, u))
    nv = math.sqrt(dot(v, v))
    if nu == 0 or nv == 0:
        raise ValueError("a zero vector has no direction")
    return dot(u, v) / (nu * nv)`,
  explanation:
    'cosine reuses dot three times: once for the numerator and once for each length. A zero vector would divide by zero, so it is rejected with a clear message, which is better than NumPy’s silent nan.',
  tests: `assert dot([3, 1], [1, 2]) == 5, 'dot([3, 1], [1, 2]) should be 5'
assert dot([3, 4], [4, -3]) == 0, 'perpendicular vectors have dot product 0'
assert abs(cosine([3, 1], [1, 2]) - 0.7071067811865475) < 1e-12, 'cosine([3, 1], [1, 2]) should be about 0.7071'
assert abs(cosine([1, 2], [2, 4]) - 1) < 1e-12, 'vectors pointing the same way have cosine 1'
assert abs(cosine([1, 0], [-3, 0]) + 1) < 1e-12, 'opposite vectors have cosine -1'
for bad in ([[1, 2], [1, 2, 3]], [[0, 0], [1, 2]]):
    try:
        cosine(*bad)
        raised = False
    except ValueError:
        raised = True
    assert raised, f'cosine{tuple(bad)} should raise ValueError'`,
};
