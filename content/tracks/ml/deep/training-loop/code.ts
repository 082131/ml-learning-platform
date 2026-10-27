// Code for the training-loop lesson. The TypeScript loop is what the page runs (through an equivalent
// flat-array version in src/lib/deep/training.ts, tested to give identical numbers). The NumPy script was run
// with NumPy 2.5.3 on CPython 3.13 and its output is copied below; it uses NumPy's random generator, so its
// numbers differ from the browser run, which uses our seeded mulberry32 generator.
import { LOOP_SOURCE, loopSlots, trainingExperiment, type TrainState } from '@/lib/deep/trainingExperiment';
import type { CodeExample } from '@/lib/types';

const LOOP_ID = 'training-loop-ts';

/** One state for the boundary, the loss curves, the loop code, its step-through and the readout. */
export const experiment = trainingExperiment('training-loop', LOOP_ID);

const slot = (name: string) => (s: unknown) => loopSlots(s as TrainState)[name]!;

export const loopCode: CodeExample = {
  id: LOOP_ID,
  language: 'typescript',
  source: LOOP_SOURCE,
  slots: Object.fromEntries(['dataset', 'seed', 'batch', 'epochs', 'lr'].map((n) => [n, slot(n)])),
  annotations: [
    {
      id: 'data',
      range: { line: 1, startCol: 13, endCol: 47 },
      match: "makeSplit('{{dataset}}', {{seed}})",
      kind: 'function',
      title: 'makeSplit(dataset, seed)',
      what: 'Draws 150 noisy 2-D points from the chosen generator and splits them into 100 for training and 50 for validation.',
      why: 'The validation points are never trained on, so their loss shows how well the network does on data it has not seen.',
      output: 'train.X: (100, 2), train.y: (100, 1); val.X: (50, 2), val.y: (50, 1)',
    },
    {
      id: 'net',
      range: { line: 2, startCol: 10, endCol: 61 },
      match: "initNetwork([2, 8, 1], 'tanh', 'sigmoid', {{seed}})",
      kind: 'function',
      title: 'initNetwork([2, 8, 1], ...)',
      what: 'Random starting weights for 2 inputs, 8 tanh hidden units and 1 sigmoid output: W₁ (2, 8), b₁ (8,), W₂ (8, 1), b₂ (1,), 33 parameters.',
      why: 'The seed makes the starting point reproducible; change it and the run changes.',
    },
    {
      id: 'shuffle',
      range: { line: 3, startCol: 16, endCol: 40 },
      match: 'mulberry32({{seed}} + 1)',
      kind: 'function',
      title: 'mulberry32(seed + 1)',
      what: 'A seeded random number generator used only for shuffling.',
      why: 'A separate stream keeps the data, the weights and the batch order independently reproducible.',
    },
    {
      id: 'spe',
      range: { line: 5, startCol: 22, endCol: 46 },
      match: 'Math.ceil(n / {{batch}})',
      kind: 'math',
      title: 'ceil(N / B)',
      what: 'The number of mini-batches needed to cover all N examples once.',
      why: 'Rounding up includes the remainder: with B = 32, the 4th batch holds the last 4 examples.',
    },
    {
      id: 'epochs',
      range: { line: 6, startCol: 20, endCol: 39 },
      match: 'epoch <= {{epochs}}',
      kind: 'parameter',
      title: 'Epochs',
      what: 'How many full passes over the training set to make.',
      why: 'Filled from the Epochs slider.',
    },
    {
      id: 'perm',
      range: { line: 7, startCol: 16, endCol: 39 },
      match: 'permutation(n, shuffle)',
      kind: 'function',
      title: 'permutation(n, shuffle)',
      what: 'A shuffled list of 0..n−1 (Fisher–Yates), new every epoch.',
      why: 'Batches then mix examples differently each epoch, so the gradient noise is not the same every pass and the data order (for example all of one class first) cannot bias the steps.',
    },
    {
      id: 'steps',
      range: { line: 8, startCol: 21, endCol: 41 },
      match: 'step < stepsPerEpoch',
      kind: 'syntax',
      title: 'step < stepsPerEpoch',
      what: 'One iteration per mini-batch.',
      why: 'Total iterations = epochs × stepsPerEpoch.',
    },
    {
      id: 'slice',
      range: { line: 9, startCol: 16, endCol: 69 },
      match: 'order.slice(step * {{batch}}, (step + 1) * {{batch}})',
      kind: 'framework',
      title: 'order.slice(start, end)',
      what: 'The next B shuffled indices. slice stops at the end of the array, so the last batch can be shorter.',
      why: 'Consecutive slices of one permutation use every example exactly once per epoch.',
      output: 'idx: up to B indices',
    },
    {
      id: 'grads',
      range: { line: 12, startCol: 28, endCol: 60 },
      match: "lossAndGrads(net, xb, yb, 'bce')",
      kind: 'function',
      title: 'lossAndGrads(...)',
      what: 'Forward pass on the batch, binary cross-entropy loss averaged over its examples, and backpropagation.',
      why: 'The gradient of a batch is an estimate of the gradient over the whole training set: cheaper, but noisy.',
      output: 'loss: a number; grads: one dW and db per layer',
    },
    {
      id: 'sgd',
      range: { line: 13, startCol: 10, endCol: 37 },
      match: 'sgdStep(net, grads, {{lr}})',
      kind: 'function',
      title: 'sgdStep(net, grads, η)',
      what: 'θ ← θ − η·gradient for every weight and bias.',
      why: 'The update from the optimizers lesson, once per iteration.',
    },
  ],
};

export const numpyLoop: CodeExample = {
  id: 'training-loop-numpy',
  language: 'python',
  source: `import numpy as np

rng = np.random.default_rng(1)
t = rng.uniform(0, np.pi, 150)
cls = np.arange(150) % 2
X = np.where(cls[:, None] == 0,
             np.c_[np.cos(t), np.sin(t)],
             np.c_[1 - np.cos(t), 0.5 - np.sin(t)])
X = X + rng.normal(0, 0.2, X.shape)
y = cls.reshape(-1, 1).astype(float)
X_train, y_train, X_val, y_val = X[:100], y[:100], X[100:], y[100:]

W1 = rng.normal(0, np.sqrt(2 / 10), (2, 8)); b1 = np.zeros(8)
W2 = rng.normal(0, np.sqrt(2 / 9), (8, 1)); b2 = np.zeros(1)

def forward(X):
    H = np.tanh(X @ W1 + b1)                  # (B, 8)
    P = 1 / (1 + np.exp(-(H @ W2 + b2)))      # (B, 1)
    return H, P

def bce(P, y):
    P = np.clip(P, 1e-7, 1 - 1e-7)
    return -np.mean(y * np.log(P) + (1 - y) * np.log(1 - P))

lr, batch_size, epochs = 0.5, 10, 50
n = len(X_train)
steps_per_epoch = int(np.ceil(n / batch_size))
for epoch in range(1, epochs + 1):
    order = rng.permutation(n)
    for step in range(steps_per_epoch):
        idx = order[step * batch_size:(step + 1) * batch_size]
        xb, yb = X_train[idx], y_train[idx]
        H, P = forward(xb)
        dZ2 = (P - yb) / len(idx)                 # (B, 1)
        dZ1 = (dZ2 @ W2.T) * (1 - H ** 2)         # (B, 8)
        W2 -= lr * H.T @ dZ2; b2 -= lr * dZ2.sum(0)
        W1 -= lr * xb.T @ dZ1; b1 -= lr * dZ1.sum(0)
    if epoch % 10 == 0:
        train_loss = bce(forward(X_train)[1], y_train)
        val_loss = bce(forward(X_val)[1], y_val)
        print(f"epoch {epoch:2d}  train {train_loss:.4f}  val {val_loss:.4f}")`,
  annotations: [
    {
      id: 'rng',
      range: { line: 3, startCol: 6, endCol: 30 },
      match: 'np.random.default_rng(1)',
      kind: 'framework',
      title: 'np.random.default_rng(1)',
      what: "NumPy's seeded random generator.",
      why: 'Every random choice (data, weights, shuffles) comes from it, so a rerun prints the same numbers.',
    },
    {
      id: 'float',
      range: { line: 10, startCol: 23, endCol: 36 },
      match: 'astype(float)',
      kind: 'framework',
      title: '.astype(float)',
      what: 'Turns the 0/1 labels into floats, shape (150, 1).',
      why: 'The loss and gradient mix labels with probabilities.',
    },
    {
      id: 'init',
      range: { line: 13, startCol: 19, endCol: 34 },
      match: 'np.sqrt(2 / 10)',
      kind: 'math',
      title: 'Xavier standard deviation',
      what: '√(2 / (fan_in + fan_out)) = √(2 / (2 + 8)).',
      why: 'Keeps the tanh inputs in a range where tanh is not flat.',
    },
    {
      id: 'hidden',
      range: { line: 17, startCol: 8, endCol: 28 },
      match: 'np.tanh(X @ W1 + b1)',
      kind: 'math',
      title: 'tanh(X @ W1 + b1)',
      what: 'The hidden layer for a whole batch at once.',
      why: '(B, 2) @ (2, 8) gives (B, 8); b1 is broadcast over the rows.',
      output: 'H: (B, 8)',
    },
    {
      id: 'clip',
      range: { line: 22, startCol: 8, endCol: 34 },
      match: 'np.clip(P, 1e-7, 1 - 1e-7)',
      kind: 'framework',
      title: 'np.clip',
      what: 'Keeps probabilities away from exactly 0 and 1.',
      why: 'log(0) is −∞.',
    },
    {
      id: 'spe',
      range: { line: 27, startCol: 18, endCol: 46 },
      match: 'int(np.ceil(n / batch_size))',
      kind: 'math',
      title: 'ceil(N / B)',
      what: 'Iterations per epoch: ceil(100 / 10) = 10.',
      why: 'The same count as in the TypeScript loop.',
    },
    {
      id: 'perm',
      range: { line: 29, startCol: 12, endCol: 30 },
      match: 'rng.permutation(n)',
      kind: 'framework',
      title: 'rng.permutation(n)',
      what: 'A shuffled array of 0..n−1, new every epoch.',
      why: 'Shuffling each epoch varies the batches.',
    },
    {
      id: 'slice',
      range: { line: 31, startCol: 14, endCol: 62 },
      match: 'order[step * batch_size:(step + 1) * batch_size]',
      kind: 'syntax',
      title: 'A slice of the permutation',
      what: 'The indices of this mini-batch. Slicing past the end just stops, so the last batch may be shorter.',
      why: 'Each example is used once per epoch.',
    },
    {
      id: 'dz2',
      range: { line: 34, startCol: 14, endCol: 33 },
      match: '(P - yb) / len(idx)',
      kind: 'math',
      title: '(P − y) / B',
      what: 'The gradient of the mean BCE loss with respect to the output pre-activation.',
      why: 'Sigmoid and cross-entropy simplify to this, as in the backpropagation lesson. Dividing by len(idx), not batch_size, keeps a short last batch correctly averaged.',
      output: '(B, 1)',
    },
    {
      id: 'tanh-grad',
      range: { line: 35, startCol: 29, endCol: 41 },
      match: '(1 - H ** 2)',
      kind: 'math',
      title: "tanh'(z) = 1 − tanh(z)²",
      what: 'The slope of tanh, computed from its output H.',
      why: 'The chain rule through the hidden layer.',
    },
    {
      id: 'update',
      range: { line: 36, startCol: 14, endCol: 28 },
      match: 'lr * H.T @ dZ2',
      kind: 'math',
      title: 'η · Hᵀ dZ₂',
      what: 'The step for W2: (8, B) @ (B, 1) gives (8, 1), the shape of W2.',
      why: '-= updates W2 in place: plain SGD.',
    },
    {
      id: 'eval',
      range: { line: 39, startCol: 21, endCol: 54 },
      match: 'bce(forward(X_train)[1], y_train)',
      kind: 'function',
      title: 'Loss on the whole training set',
      what: 'One forward pass over all 100 training points after the epoch.',
      why: 'Mini-batch losses are noisy; the full-set loss is the smooth curve.',
    },
  ],
  expectedOutput: `epoch 10  train 0.2537  val 0.1730
epoch 20  train 0.2436  val 0.1616
epoch 30  train 0.2159  val 0.1399
epoch 40  train 0.1653  val 0.1004
epoch 50  train 0.1291  val 0.0780`,
};
