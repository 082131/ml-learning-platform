// Code for ml/deep/project-neural-net. starter.py was run with CPython 3.13.16, NumPy 2.5.4, scikit-learn 1.9.1
// and PyTorch 2.14.1 (CPU); the output shown is from that run. The figures quoted from our reference solution
// (validation and test results) come from a complete solution run with the same versions and seed.
import type { CodeExample, ProjectBrief } from '@/lib/types';

export const setupCode: CodeExample = {
  id: 'project-nn-setup',
  language: 'bash',
  source: `python3 -m venv .venv
source .venv/bin/activate            # Windows: .venv\\Scripts\\activate
pip install numpy==2.5.4 scikit-learn==1.9.1 torch==2.14.1 matplotlib==3.10.8
python starter.py`,
  annotations: [],
};

export const starterCode: CodeExample = {
  id: 'project-nn-starter',
  language: 'python',
  source: `import numpy as np
from sklearn.datasets import load_breast_cancer
from sklearn.model_selection import train_test_split

SEED = 0
X, y = load_breast_cancer(return_X_y=True)   # 569 tumours, 30 features; y: 0 = malignant, 1 = benign
y = y.reshape(-1, 1).astype(float)

# 60% train, 20% validation, 20% test, each with the same class balance.
X_train, X_rest, y_train, y_rest = train_test_split(
    X, y, test_size=0.4, stratify=y, random_state=SEED)
X_val, X_test, y_val, y_test = train_test_split(
    X_rest, y_rest, test_size=0.5, stratify=y_rest, random_state=SEED)

# Standardize with the training set's statistics only.
mean, std = X_train.mean(axis=0), X_train.std(axis=0)
X_train, X_val, X_test = [(A - mean) / std for A in (X_train, X_val, X_test)]


def init_params(hidden, rng):
    """W1 (30, hidden), b1 (hidden,), W2 (hidden, 1), b2 (1,), Xavier-initialized."""
    return [
        rng.normal(0, np.sqrt(2 / (30 + hidden)), (30, hidden)), np.zeros(hidden),
        rng.normal(0, np.sqrt(2 / (hidden + 1)), (hidden, 1)), np.zeros(1),
    ]


def loss_and_grads(X, y, W1, b1, W2, b2):
    """Mean binary cross-entropy of the 30-hidden-1 tanh network, and the four gradients."""
    raise NotImplementedError("milestone 2: forward pass, loss and backward pass")


if __name__ == "__main__":
    for name, A, t in [("train", X_train, y_train), ("val", X_val, y_val), ("test", X_test, y_test)]:
        print(f"{name:5s} X {A.shape}  benign {int(t.sum())}  malignant {int(len(t) - t.sum())}")
    print("train features centred and scaled:",
          np.allclose(X_train.mean(axis=0), 0), np.allclose(X_train.std(axis=0), 1))`,
  annotations: [
    {
      id: 'load',
      range: { line: 6, startCol: 7, endCol: 42 },
      match: 'load_breast_cancer(return_X_y=True)',
      kind: 'framework',
      title: 'load_breast_cancer',
      what: 'The Wisconsin diagnostic breast cancer data bundled with scikit-learn: 569 rows, 30 measurements of cell nuclei per row.',
      why: 'Real, small, and needs no download. Labels: 0 = malignant (212 rows), 1 = benign (357 rows).',
      output: 'X: (569, 30), y: (569,)',
    },
    {
      id: 'stratify',
      range: { line: 11, startCol: 25, endCol: 35 },
      match: 'stratify=y',
      kind: 'parameter',
      title: 'stratify=y',
      what: 'Keeps the malignant/benign ratio the same in every split.',
      why: 'With 114 test rows, an unlucky split could shift the class balance and the accuracy with it.',
    },
    {
      id: 'seed',
      range: { line: 11, startCol: 37, endCol: 54 },
      match: 'random_state=SEED',
      kind: 'parameter',
      title: 'random_state=SEED',
      what: 'Fixes which rows land in which split.',
      why: 'Every run, yours and ours, uses the same 341 / 114 / 114 rows, so results are comparable.',
    },
    {
      id: 'half',
      range: { line: 13, startCol: 20, endCol: 33 },
      match: 'test_size=0.5',
      kind: 'parameter',
      title: 'test_size=0.5',
      what: 'Splits the remaining 40% in half: 20% validation, 20% test.',
      why: 'Validation is for choosing settings; test is touched once at the end.',
    },
    {
      id: 'mean',
      range: { line: 16, startCol: 12, endCol: 32 },
      match: 'X_train.mean(axis=0)',
      kind: 'math',
      title: 'Training statistics only',
      what: 'The mean of each of the 30 features over the training rows.',
      why: 'Using validation or test rows here would leak information about them into training.',
    },
    {
      id: 'init',
      range: { line: 23, startCol: 22, endCol: 48 },
      match: 'np.sqrt(2 / (30 + hidden))',
      kind: 'math',
      title: 'Xavier initialization',
      what: 'Standard deviation √(2 / (fan_in + fan_out)).',
      why: 'Keeps tanh inputs in its responsive range at the start.',
    },
    {
      id: 'stub',
      range: { line: 30, startCol: 4, endCol: 29 },
      match: 'raise NotImplementedError',
      kind: 'function',
      title: 'Your milestone 2',
      what: 'Forward pass, mean binary cross-entropy and the gradients of W1, b1, W2 and b2.',
      why: 'The training-loop lesson’s NumPy code is the pattern; here there are 30 inputs and 16 hidden units.',
    },
  ],
  expectedOutput: `train X (341, 30)  benign 214  malignant 127
val   X (114, 30)  benign 72  malignant 42
test  X (114, 30)  benign 71  malignant 43
train features centred and scaled: True True`,
};

export const brief: ProjectBrief = {
  goal: 'Train a small neural network to classify breast tumour measurements as malignant or benign, first with NumPy alone and then with PyTorch. Choose the learning rate, batch size and number of epochs with a validation set, evaluate once on a held-out test set, and report the results and the mistakes the model makes.',
  dataset:
    'The Wisconsin diagnostic breast cancer data bundled with scikit-learn (`load_breast_cancer`): 569 tumours, 30 numeric features each (radius, texture, smoothness and so on), 212 malignant and 357 benign. No download is needed. The starter splits it 60 / 20 / 20 into train, validation and test, stratified, with seed 0, and standardizes it with the training statistics.',
  milestones: [
    'Set up the pinned environment and run starter.py: the split sizes and class counts match the expected output',
    'Write loss_and_grads for a 30-16-1 network (tanh hidden layer, sigmoid output, mean binary cross-entropy) and check it with central finite differences: relative error below 1e-6',
    'Write the mini-batch training loop (shuffle every epoch, ceil(N / B) steps per epoch) and plot training and validation loss per epoch',
    'Tune: try learning rates 0.01, 0.03, 0.1 and 0.3 with batch sizes 16 and 64 for 100 epochs, keep the weights from the epoch with the lowest validation loss, and pick the best setting by validation loss only',
    'Rebuild the chosen model in PyTorch (nn.Sequential or an nn.Module, nn.BCEWithLogitsLoss, torch.optim.SGD, a DataLoader with shuffle=True) and compare its validation loss with your NumPy version',
    'Evaluate the chosen model once on the test set: accuracy, the confusion matrix, and how many malignant tumours were called benign',
    'Look at the misclassified test rows: their predicted probabilities and a few feature values, and write what they have in common',
    'Write a one-page report: data and split, architecture with every shape, the tuning table, test results, failure cases and what you would try next',
  ],
  rubric: [
    {
      criterion: 'No leakage',
      detail:
        'Scaling statistics come from the training rows only, settings are chosen on validation only, and the test set is used once, after all choices are made.',
    },
    {
      criterion: 'Correct gradients',
      detail:
        'A finite-difference check on every parameter array passes (relative error below 1e-6) and the report says how it was run.',
    },
    {
      criterion: 'A working training loop',
      detail:
        'Shuffles every epoch, handles the short last batch (341 rows do not divide into 16 or 64), and logs both losses per epoch.',
    },
    {
      criterion: 'Tuning is reported honestly',
      detail:
        'A table of every setting tried with its best validation loss and epoch; the choice follows from the table.',
    },
    {
      criterion: 'Both implementations',
      detail:
        'The PyTorch version uses the same architecture and setting, and the report compares the two validation losses and explains why they differ (initialization, shuffling, float32).',
    },
    {
      criterion: 'Evaluation beyond accuracy',
      detail:
        'Confusion matrix, the count of malignant tumours missed, and a look at the misclassified rows.',
    },
    {
      criterion: 'Reproducible',
      detail:
        'Pinned versions, fixed seeds, and one command that reruns everything and prints the reported numbers.',
    },
  ],
  hints: [
    'The backward pass is the one from the training-loop lesson: `dZ2 = (P - y) / len(X)`, `dZ1 = (dZ2 @ W2.T) * (1 - H ** 2)`, then `X.T @ dZ1`, `dZ1.sum(0)`, `H.T @ dZ2`, `dZ2.sum(0)`.',
    'For the gradient check use 20 rows in float64, nudge the first and last entry of each array by ±1e-6, and compare with `abs(a - b) / (abs(a) + abs(b))`. Our reference solution gets about 1e-9.',
    'Keep a copy of the parameters whenever the validation loss reaches a new minimum (`[p.copy() for p in params]`): early stopping without stopping the loop.',
    'In PyTorch, `nn.BCEWithLogitsLoss` takes the output before the sigmoid. Apply `torch.sigmoid` yourself when you need probabilities, and evaluate under `torch.no_grad()` after `model.eval()`.',
    'Convert the arrays with `torch.tensor(X_train, dtype=torch.float32)`; y must have shape (N, 1), like the model output.',
    'For comparison, our reference solution chose learning rate 0.3 with batch size 16 (best validation loss 0.109, at epoch 14) and reached 0.982 test accuracy: 1 malignant tumour called benign and 1 benign tumour called malignant. Its PyTorch version reached the same test accuracy. Your numbers can differ a little; a test accuracy well below 0.95 points to a bug.',
  ],
};
