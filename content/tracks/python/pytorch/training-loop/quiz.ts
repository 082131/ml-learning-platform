import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'steps',
    type: 'numeric',
    prompt:
      'A training set has 2,000 examples. With `batch_size=50` and 10 epochs, how many times does `opt.step()` run?',
    answer: 400,
    tolerance: 0,
    hint: 'One step per batch; count the batches in one epoch first.',
    explain: '2000 / 50 = 40 batches per epoch, and 40 × 10 epochs = 400 steps.',
  },
  {
    id: 'order',
    type: 'choice',
    prompt: 'Which order of calls inside the batch loop is correct?',
    options: [
      {
        text: 'loss, backward, zero_grad, step',
        correct: false,
        explain: 'zero_grad after backward wipes the gradients just computed, so step updates nothing.',
      },
      {
        text: 'loss, zero_grad, backward, step',
        correct: true,
        explain:
          'Clear old gradients, compute new ones, then update. zero_grad at the very start of the loop body works too.',
      },
      {
        text: 'loss, step, zero_grad, backward',
        correct: false,
        explain:
          'step runs before backward, so it uses the previous batch’s gradients, which zero_grad then throws away.',
      },
      {
        text: 'zero_grad, step, loss, backward',
        correct: false,
        explain: 'step runs before any gradient exists for this batch, so it uses zeros (or stale values).',
      },
    ],
  },
  {
    id: 'ln2',
    type: 'choice',
    prompt:
      'A binary classifier trained with BCEWithLogitsLoss sits at a loss of exactly 0.6931 and does not move. What is the model most likely doing?',
    options: [
      {
        text: 'Predicting the majority class every time',
        correct: false,
        explain:
          'On balanced data that gives a large loss for every minority example, not a flat ln 2 = 0.6931.',
      },
      {
        text: 'Overfitting the training data',
        correct: false,
        explain: 'Overfitting drives the training loss down toward 0, not to a fixed value.',
      },
      {
        text: 'Outputting probability 0.5 for everything',
        correct: true,
        explain:
          'Cross-entropy at p = 0.5 is −ln 0.5 = ln 2 = 0.6931 whatever the label. Logits stuck at 0 (here, a ReLU on the output) do exactly that.',
      },
      {
        text: 'Using a learning rate that is too large',
        correct: false,
        explain: 'A too-large learning rate makes the loss jump around or grow, as in the lr=10 run above.',
      },
    ],
  },
  {
    id: 'no-zero',
    type: 'choice',
    prompt: 'In the explorer, why does the run with zero_grad forgotten get worse after a few good epochs?',
    options: [
      {
        text: 'Each step applies the sum of all past gradients',
        correct: true,
        explain:
          'backward() adds to .grad, so the update keeps growing. Early on that speeds training up; later the steps overshoot.',
      },
      {
        text: 'The gradients are zero, so nothing is learned',
        correct: false,
        explain: 'The opposite: the loss fell quickly at first, so gradients were clearly non-zero.',
      },
      {
        text: 'PyTorch raises a warning and skips the step',
        correct: false,
        explain:
          'Nothing warns you. Accumulating gradients is legal (and used on purpose for large batches).',
      },
      {
        text: 'The validation set leaked into training',
        correct: false,
        explain: 'The validation tensors never go through backward(); this is purely an optimizer bug.',
      },
    ],
  },
  {
    id: 'item',
    type: 'choice',
    prompt: 'Why does the loop write `total += loss.item() * len(xb)` and not `total += loss * len(xb)`?',
    options: [
      {
        text: 'loss is a tensor, which cannot be added to a float',
        correct: false,
        explain: 'Adding a float and a tensor works; it gives a tensor.',
      },
      {
        text: 'A tensor total keeps every batch’s graph in memory',
        correct: true,
        explain:
          'total would be a tensor that depends on all losses, so their graphs could never be freed. .item() gives a plain float.',
      },
      {
        text: '.item() averages the loss over the batch',
        correct: false,
        explain:
          'The loss is already the batch mean; .item() only converts the one-element tensor to a float.',
      },
    ],
  },
  {
    id: 'best',
    type: 'choice',
    prompt:
      'From epoch 12 on, training loss keeps falling but validation loss rises. Which checkpoint should you deploy?',
    options: [
      {
        text: 'The last one, since it has the lowest training loss',
        correct: false,
        explain:
          'Lower training loss with rising validation loss is overfitting; the last model generalizes worse.',
      },
      {
        text: 'The one with the lowest validation loss',
        correct: true,
        explain:
          'That is what the loop above saves. Then confirm the choice once on a test set it has not been selected on.',
      },
      {
        text: 'The first one, before any overfitting started',
        correct: false,
        explain: 'Epoch 1 is usually underfit; validation loss was still falling for several epochs.',
      },
    ],
  },
];

export const loopExercise: Exercise = {
  id: 'py-torch-train-linear',
  prompt:
    'Fix train_linear(X, y) so each mini-batch step uses only that batch’s gradient (the NumPy version of zero_grad).',
  starter: `import numpy as np

def train_linear(X, y, lr=0.1, epochs=100, batch_size=4):
    w = np.zeros(X.shape[1])
    b = 0.0
    gw, gb = np.zeros_like(w), 0.0
    for epoch in range(epochs):
        for start in range(0, len(X), batch_size):
            xb, yb = X[start:start + batch_size], y[start:start + batch_size]
            err = xb @ w + b - yb
            gw += 2 * xb.T @ err / len(xb)      # bug: gradients pile up across steps
            gb += 2 * err.mean()
            w = w - lr * gw
            b = b - lr * gb
    return w, b`,
  hints: [
    'The gradient of the mean squared error for one batch is 2 · xbᵀ · err / len(xb) for w, and 2 · mean(err) for b.',
    'Assign the batch gradient with = instead of adding it to a running total with +=.',
  ],
  solution: `import numpy as np

def train_linear(X, y, lr=0.1, epochs=100, batch_size=4):
    w = np.zeros(X.shape[1])
    b = 0.0
    for epoch in range(epochs):
        for start in range(0, len(X), batch_size):
            xb, yb = X[start:start + batch_size], y[start:start + batch_size]
            err = xb @ w + b - yb
            gw = 2 * xb.T @ err / len(xb)
            gb = 2 * err.mean()
            w = w - lr * gw
            b = b - lr * gb
    return w, b`,
  explanation:
    'Each step must use the gradient of the current batch only. PyTorch accumulates into .grad on purpose, which is why every loop calls opt.zero_grad().',
  tests: `import numpy as np
X = np.array([[0.0, 1.0], [1.0, 0.0], [1.0, 1.0], [2.0, 1.0], [0.5, -1.0], [-1.0, 0.5], [1.5, 2.0], [-0.5, -0.5]])
y = 3 * X[:, 0] - 2 * X[:, 1] + 1
w, b = train_linear(X, y)
assert np.all(np.isfinite(w)) and np.isfinite(b), "the weights blew up: are gradients reset every step?"
assert np.allclose(w, [3, -2], atol=0.01), w
assert abs(b - 1) < 0.01, b`,
};
