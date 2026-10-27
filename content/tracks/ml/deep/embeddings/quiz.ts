import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'lookup-shape',
    type: 'choice',
    prompt:
      'An embedding table E has shape (50257, 768). A batch holds 4 sequences of 10 token IDs each, shape (4, 10). What is the shape of E[ids]?',
    options: [
      {
        text: '(4, 10, 768)',
        correct: true,
        explain: 'Every ID is replaced by its row of 768 numbers, so a new last axis of size 768 is added.',
      },
      {
        text: '(4, 768)',
        correct: false,
        explain: 'That would be one vector per sequence. The lookup gives one vector per token.',
      },
      {
        text: '(50257, 768)',
        correct: false,
        explain: 'That is the whole table. Indexing selects only the rows named by the IDs.',
      },
      {
        text: '(4, 10, 50257)',
        correct: false,
        explain: 'That is the shape of the one-hot vectors for the batch, before they are multiplied by E.',
      },
    ],
  },
  {
    id: 'cos-value',
    type: 'numeric',
    prompt: 'What is the cosine similarity of a = (3, 4) and b = (4, 3)? Give 2 decimals.',
    answer: 0.96,
    tolerance: 0.005,
    hint: 'Dot product first: 3·4 + 4·3. Both vectors have length 5.',
    explain: 'a · b = 12 + 12 = 24 and ‖a‖ = ‖b‖ = 5, so cos = 24 / 25 = 0.96.',
  },
  {
    id: 'cos-length',
    type: 'choice',
    prompt: 'b = 2a (the same direction, twice as long). What is cos(a, b)?',
    options: [
      {
        text: '1',
        correct: true,
        explain:
          'Cosine similarity only looks at direction: the doubling cancels between the dot product and the lengths.',
      },
      {
        text: '2',
        correct: false,
        explain:
          'Cosine similarity is always between −1 and 1. The dot product would double, not the cosine.',
      },
      {
        text: '0.5',
        correct: false,
        explain: 'Length does not change the angle, and the angle between a and 2a is 0.',
      },
    ],
  },
  {
    id: 'one-hot-sim',
    type: 'choice',
    prompt: 'Why are one-hot vectors useless for measuring how similar two tokens are?',
    options: [
      {
        text: 'Any two different one-hot vectors have dot product 0, so every pair of tokens looks equally unrelated',
        correct: true,
        explain:
          'Each has a single 1 in a different position, so the products are all 0. Dense learned vectors fix this.',
      },
      {
        text: 'They have too few dimensions',
        correct: false,
        explain: 'They have as many dimensions as the vocabulary, far more than a dense embedding.',
      },
      {
        text: 'Their cosine similarity is always 1',
        correct: false,
        explain: 'It is 0 for two different tokens and 1 only for a token with itself.',
      },
    ],
  },
  {
    id: 'map-limits',
    type: 'choice',
    prompt: 'A 2-D plot of real 768-dimensional embeddings shows two words far apart. What can you conclude?',
    options: [
      {
        text: 'Not much on its own: squeezing 768 dimensions into 2 distorts distances, so check the real cosine similarity',
        correct: true,
        explain:
          'Projections such as PCA keep only part of the spread. Points can look far apart while their full vectors are close, and the reverse.',
      },
      {
        text: 'Their cosine similarity is negative',
        correct: false,
        explain: 'The plot is a projection; the real similarity has to be computed on the full vectors.',
      },
      {
        text: 'The model never uses them in the same context',
        correct: false,
        explain:
          'Neither the plot nor one similarity number says that. Similar vectors come from similar usage in training, on average.',
      },
    ],
  },
];

export const cosineExercise: Exercise = {
  id: 'cosine-function',
  prompt: 'Write `cosine(a, b)` for two equal-length lists of numbers, without NumPy.',
  starter: `import math

def cosine(a, b):
    # dot product, then divide by both lengths
    pass`,
  hints: [
    'The dot product is `sum(x * y for x, y in zip(a, b))`.',
    'The length of a is `math.sqrt(sum(x * x for x in a))`.',
    'Return `dot / (length_a * length_b)`.',
  ],
  solution: `import math

def cosine(a, b):
    dot = sum(x * y for x, y in zip(a, b))
    length_a = math.sqrt(sum(x * x for x in a))
    length_b = math.sqrt(sum(y * y for y in b))
    return dot / (length_a * length_b)`,
  explanation:
    'The dot product measures how much the vectors point the same way, scaled by both lengths. Dividing by the lengths removes the scale and leaves cos θ, between −1 and 1.',
  tests: `assert abs(cosine([3, 1], [2, 1]) - 0.98995) < 1e-4, 'cat and kitten from the lesson: 7 / (sqrt(10) * sqrt(5)) is about 0.98995'
assert abs(cosine([1, 0], [0, 1])) < 1e-12, 'perpendicular vectors have cosine 0'
assert abs(cosine([1, 2], [2, 4]) - 1) < 1e-12, 'b = 2a points the same way: cosine 1'
assert abs(cosine([1, 2], [-1, -2]) + 1) < 1e-12, 'opposite vectors have cosine -1'
assert abs(cosine([3, 4, 0], [4, 3, 0]) - 0.96) < 1e-12, 'works in 3 dimensions too: 24 / 25'`,
};
