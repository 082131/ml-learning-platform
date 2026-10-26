import type { Exercise, QuizQuestion } from '@/lib/types';

/** Self-assessment: answer these about your own implementation before you call it done. */
export const questions: QuizQuestion[] = [
  {
    id: 'gradcheck',
    type: 'choice',
    prompt:
      'Your gradient check reports a relative error of 3e-2 for W1 and 1e-9 for W2. Where is the bug most likely?',
    options: [
      {
        text: 'In the backward pass through the ReLU or the first layer',
        correct: true,
        explain:
          'W2’s gradient only needs the softmax step and the hidden activations, and it is right. The error appears when the gradient flows back through the ReLU into W1.',
      },
      {
        text: 'In the softmax',
        correct: false,
        explain: 'A softmax bug would also break W2’s gradient, which passed.',
      },
      {
        text: 'Nowhere: 3e-2 is close enough',
        correct: false,
        explain: 'In float64 a correct gradient gives about 1e-7 or less. 3e-2 means a real mistake.',
      },
    ],
  },
  {
    id: 'transpose',
    type: 'choice',
    prompt:
      'You copy your NumPy W1 of shape (64, 64) into torch.nn.Linear(64, 64) without transposing. What happens?',
    options: [
      {
        text: 'No error, because the matrix is square, but the network computes something different and the losses do not match',
        correct: true,
        explain:
          'Linear computes x @ W.T + b. With a square matrix the shapes still fit, so only the comparison test catches it.',
      },
      {
        text: 'PyTorch raises a shape error',
        correct: false,
        explain: 'Only W2 (64, 10) would fail. Square matrices hide the mistake.',
      },
    ],
  },
  {
    id: 'stable',
    type: 'choice',
    prompt: 'Why subtract the largest logit before exponentiating in softmax?',
    options: [
      {
        text: 'exp of a large logit overflows to infinity; subtracting the maximum leaves the softmax unchanged and keeps every exponent ≤ 0',
        correct: true,
        explain: 'softmax(z) = softmax(z − c) for any constant c, so the result is identical and safe.',
      },
      {
        text: 'It makes training converge faster',
        correct: false,
        explain: 'It does not change the values at all, only whether they can be computed.',
      },
    ],
  },
  {
    id: 'differences',
    type: 'order',
    prompt: 'Order the steps for explaining a gap between the NumPy and PyTorch results.',
    items: [
      'Make both versions start from the same weights and see the same batches',
      'Confirm the float64 losses match to a tight tolerance',
      'Change exactly one thing (for example float32)',
      'Measure the new difference and record it',
      'Repeat for the next difference',
    ],
    explain: 'The same discipline as an ablation: one change at a time from a matched baseline.',
  },
];

export const softmaxExercise: Exercise = {
  id: 'softmax-ce',
  prompt:
    'Write `softmax_ce(logits, label)` for one example: return the cross-entropy loss and its gradient with respect to the logits, as a list. It must not overflow or take log(0) for large logits.',
  starter: `import math

def softmax_ce(logits, label):
    # logits: list of floats, label: index of the correct class
    # Return (loss, grad) where loss = -log(softmax(logits)[label])
    # and grad[i] = softmax(logits)[i] - (1 if i == label else 0).
    pass`,
  hints: [
    'Subtract the maximum first: `m = max(logits)`, `exps = [math.exp(z - m) for z in logits]`.',
    'Probabilities are `exps[i] / sum(exps)`. For the loss use log-sum-exp, `m + math.log(sum(exps)) - logits[label]`, because `p[label]` can underflow to 0.',
    'The gradient is the probability vector with 1 subtracted at the label.',
  ],
  solution: `import math

def softmax_ce(logits, label):
    m = max(logits)
    exps = [math.exp(z - m) for z in logits]
    total = sum(exps)
    p = [e / total for e in exps]
    loss = m + math.log(total) - logits[label]  # -log p[label], without log(0)
    grad = [pi - (1 if i == label else 0) for i, pi in enumerate(p)]
    return loss, grad`,
  explanation:
    'This is the per-example version of the step that starts your backward pass. For a batch, average the losses and divide each gradient row by the batch size. Subtracting the maximum keeps exp() from overflowing, and computing the loss as log-sum-exp avoids log(0) when a probability underflows.',
  tests: `import math
loss, grad = softmax_ce([2.0, 1.0, 0.1], 0)
p0 = math.exp(2.0) / (math.exp(2.0) + math.exp(1.0) + math.exp(0.1))
assert abs(loss + math.log(p0)) < 1e-12, f"loss should be -log(softmax)[label] = {-math.log(p0):.6f}, got {loss}"
assert abs(grad[0] - (p0 - 1)) < 1e-12, 'grad at the label is p - 1'
assert abs(sum(grad)) < 1e-12, 'the gradient entries sum to zero'
loss, grad = softmax_ce([1000.0, 0.0], 1)
assert abs(loss - 1000.0) < 1e-9, f"large logits must not overflow: expected 1000.0, got {loss}"
assert abs(grad[0] - 1.0) < 1e-12 and abs(grad[1] + 1.0) < 1e-12, 'grad for [1000, 0] with label 1 is [1, -1]'`,
};
