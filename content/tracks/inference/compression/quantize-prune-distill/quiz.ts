import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'speed',
    type: 'choice',
    prompt: 'You zero 50% of a model’s weights by magnitude and save it as ordinary dense float32 tensors. What happens to latency on a GPU?',
    options: [
      {
        text: 'Almost nothing: the matrices have the same shape, so the same dense kernels multiply the zeros too',
        correct: true,
        explain: 'Unstructured sparsity needs sparse kernels or hardware support (such as 2:4 sparsity) to save time. Structured pruning, which removes whole rows or channels, gives smaller dense matrices.',
      },
      {
        text: 'It halves, because half the multiplications are skipped',
        correct: false,
        explain: 'Dense matrix multiplication does not check for zeros. Every multiply-add still runs.',
      },
      {
        text: 'It doubles, because zeros are slow to multiply',
        correct: false,
        explain: 'Zeros cost the same as any other number in a dense kernel.',
      },
    ],
  },
  {
    id: 'csr',
    type: 'numeric',
    prompt: 'A 1,000 × 1,000 float32 matrix keeps 30% of its entries. In CSR with 4-byte values and 4-byte column indices (ignore the row pointers), how many bytes does it take? (dense is 4,000,000)',
    answer: 2400000,
    tolerance: 0.5,
    hint: 'Each kept entry costs a value and an index.',
    explain: '300,000 kept entries × 8 bytes = 2,400,000 bytes: 60% of dense. At 50% kept, CSR is as large as dense.',
  },
  {
    id: 'which',
    type: 'choice',
    prompt: 'A model is accurate enough but its weights do not fit on your GPU. You cannot retrain it. Which method do you try first?',
    options: [
      {
        text: 'Post-training quantization of the weights to INT8 or INT4',
        correct: true,
        explain: 'It needs no training, cuts weight memory by 2× (from 16-bit) or 4×, and on the digits model INT8 kept 349 of 360 correct.',
      },
      {
        text: 'Distillation into a smaller model',
        correct: false,
        explain: 'Distillation is a full training run, which you said you cannot do.',
      },
      {
        text: 'Unstructured magnitude pruning to 50%',
        correct: false,
        explain: 'Stored densely it saves no memory at all; stored sparse at 50% it saves nothing either.',
      },
    ],
  },
  {
    id: 'distill-why',
    type: 'choice',
    prompt: 'In distill.py, a student trained on 100 labels gets 292.4 of 360 on average, but a student of the same size distilled on 1,437 images gets 344.0. What made the difference?',
    options: [
      {
        text: 'The teacher labeled 1,337 images that had no labels in that setting, with soft outputs that carry more information than one-hot labels',
        correct: true,
        explain: 'Distillation turns unlabeled data into training data. With all 1,437 labels available, the gain shrinks to 341.4 vs 344.0, within the spread of seeds.',
      },
      {
        text: 'Distilled students always have more parameters',
        correct: false,
        explain: 'Both students are 64 → 8 → 10, 610 parameters.',
      },
      {
        text: 'The temperature makes the student’s test predictions softer',
        correct: false,
        explain: 'Temperature is used only in the training loss. At test time the student predicts with its plain argmax.',
      },
    ],
  },
];

export const pruneExercise: Exercise = {
  id: 'magnitude-prune',
  prompt:
    'Write `magnitude_prune(W, sparsity)`: return a copy of the NumPy array W with the int(sparsity * W.size) smallest-magnitude weights set to 0.',
  starter: `import numpy as np


def magnitude_prune(W, sparsity):
    pass`,
  hints: [
    'k = int(sparsity * W.size). If k is 0, return W.copy().',
    'np.sort(np.abs(W), axis=None) sorts all magnitudes; the k-th smallest is at index k - 1.',
    'np.where(np.abs(W) > threshold, W, 0.0) keeps only the larger weights.',
  ],
  solution: `import numpy as np


def magnitude_prune(W, sparsity):
    k = int(sparsity * W.size)
    if k == 0:
        return W.copy()
    threshold = np.sort(np.abs(W), axis=None)[k - 1]
    return np.where(np.abs(W) > threshold, W, 0.0)`,
  explanation:
    'Magnitude pruning assumes that small weights matter least. Ties at the threshold are pruned too, so slightly more than k weights can become zero when values repeat. Always measure accuracy afterwards on held-out data.',
  tests: `import numpy as np
W = np.array([[0.1, -2.0, 0.5], [-0.05, 3.0, -0.4]])
P = magnitude_prune(W, 0.5)
assert P.shape == W.shape, 'the shape does not change'
assert np.count_nonzero(P) == 3, 'half of the 6 weights are removed'
assert P[0, 1] == -2.0 and P[1, 1] == 3.0 and P[0, 2] == 0.5, 'the largest magnitudes survive, signs kept'
assert P[1, 0] == 0 and P[0, 0] == 0 and P[1, 2] == 0, 'the three smallest magnitudes are zeroed'
assert np.array_equal(magnitude_prune(W, 0), W), 'sparsity 0 changes nothing'
assert W[0, 0] == 0.1, 'the input array is not modified'`,
};
