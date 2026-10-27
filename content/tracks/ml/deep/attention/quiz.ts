import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'scores-shape',
    type: 'choice',
    prompt: 'A sequence has 10 tokens and d_k = 64. What is the shape of Q @ K.T?',
    options: [
      {
        text: '(10, 10)',
        correct: true,
        explain: '(10, 64) @ (64, 10): one score for every (query, key) pair.',
      },
      {
        text: '(64, 64)',
        correct: false,
        explain: 'That would be K.T @ Q. The scores compare tokens with tokens, so both axes have length 10.',
      },
      {
        text: '(10, 64)',
        correct: false,
        explain: 'That is the shape of Q itself, or of the output when d_v = 64.',
      },
    ],
  },
  {
    id: 'row-weight',
    type: 'numeric',
    prompt:
      'In the lesson’s example, row 0 (“the”) has exp(score − max) = 0.1199, 0.4931, 1 and 0.0591 for the, cat, sat and down. What is the attention weight on “sat”? Give 3 decimals.',
    answer: 0.598,
    tolerance: 0.002,
    hint: 'Add the four numbers, then divide the one for “sat” by the sum.',
    explain: '0.1199 + 0.4931 + 1 + 0.0591 ≈ 1.672, and 1 / 1.672 ≈ 0.598.',
  },
  {
    id: 'scale',
    type: 'choice',
    prompt: 'Why are the scores divided by √d_k?',
    options: [
      {
        text: 'Dot products of long vectors are large, which would make the softmax nearly one-hot and its gradients tiny',
        correct: true,
        explain:
          'Dividing by √d_k keeps the scores in a range where the softmax still spreads weight and learns well.',
      },
      {
        text: 'So that each row of weights adds up to 1',
        correct: false,
        explain: 'The softmax does that, whatever the scale of the scores.',
      },
      {
        text: 'To turn the dot product into a cosine similarity',
        correct: false,
        explain:
          'Cosine similarity divides by the vectors’ lengths, which differ per pair; √d_k is one constant for all pairs.',
      },
    ],
  },
  {
    id: 'causal-first',
    type: 'choice',
    prompt: 'With the causal mask, what are the weights in row 0 (the first token) of a 4-token sequence?',
    options: [
      {
        text: '[1, 0, 0, 0]',
        correct: true,
        explain: 'The first token may only attend to itself; the other three scores are −∞ and get weight 0.',
      },
      {
        text: '[0.25, 0.25, 0.25, 0.25]',
        correct: false,
        explain:
          'Equal weights would mean no mask and equal scores. The mask removes the three later tokens.',
      },
      {
        text: 'It depends on the values in Q and K',
        correct: false,
        explain:
          'Only for later rows. Row 0 has a single unmasked entry, so softmax gives it weight 1 whatever its score.',
      },
    ],
  },
  {
    id: 'order',
    type: 'order',
    prompt: 'Put the steps of scaled dot-product attention in order.',
    items: [
      'Compute Q, K and V from X with three weight matrices',
      'Compute the scores Q @ K.T and divide by √d_k',
      'Set masked scores to −∞ (causal attention only)',
      'Apply softmax to each row',
      'Multiply the weights by V',
    ],
    explain:
      'softmax(Q Kᵀ / √d_k + mask) V: the mask must come before the softmax so masked entries get weight 0.',
  },
];

export const softmaxExercise: Exercise = {
  id: 'softmax-row',
  prompt:
    'Write `softmax(scores)` for a list of numbers, without NumPy, so that it also works for very large scores.',
  starter: `import math

def softmax(scores):
    # subtract the largest score, exponentiate, divide by the sum
    pass`,
  hints: [
    'Find `m = max(scores)` first.',
    'Compute `exps = [math.exp(s - m) for s in scores]`. The largest is exp(0) = 1, so nothing overflows.',
    'Return `[e / sum(exps) for e in exps]`.',
  ],
  solution: `import math

def softmax(scores):
    m = max(scores)
    exps = [math.exp(s - m) for s in scores]
    total = sum(exps)
    return [e / total for e in exps]`,
  explanation:
    'Subtracting the maximum multiplies every exp by the same constant exp(−m), which cancels in the division, so the result is unchanged. Without it, math.exp(1000) raises OverflowError.',
  tests: `w = softmax([0, math.log(3)])
assert abs(w[0] - 0.25) < 1e-12 and abs(w[1] - 0.75) < 1e-12, f'exp(0) = 1 and exp(ln 3) = 3, so expected [0.25, 0.75]; got {w}'
assert abs(sum(softmax([1.0, 2.0, 3.0])) - 1) < 1e-12, 'the weights should add up to 1'
assert softmax([5, 5]) == [0.5, 0.5], 'equal scores give equal weights'
w = softmax([1000, 1000 + math.log(3)])
assert abs(w[1] - 0.75) < 1e-12, 'large scores must not overflow: subtract the maximum before math.exp'
assert softmax([2, float('-inf')]) == [1.0, 0.0], 'a masked score of -inf gets weight 0'`,
};
