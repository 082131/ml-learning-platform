// Code for ml/projects/capstone-neural-net. starter.py was run with CPython 3.13.16, NumPy 2.5.4,
// scikit-learn 1.9.1 and PyTorch 2.14.1 (CPU); the outputs shown are from those runs. The figures quoted for the
// reference solution come from our own complete solution, run with the same versions.
import type { CodeExample, ProjectBrief } from '@/lib/types';

export const setupCode: CodeExample = {
  id: 'capstone-nn-setup',
  language: 'bash',
  source: `python3 -m venv .venv
source .venv/bin/activate            # Windows: .venv\\Scripts\\activate
pip install numpy==2.5.4 scikit-learn==1.9.1 torch==2.14.1 pytest==9.1.1
python starter.py`,
  annotations: [],
};

export const starterCode: CodeExample = {
  id: 'capstone-nn-starter',
  language: 'python',
  source: `import numpy as np
from sklearn.datasets import load_digits
from sklearn.model_selection import train_test_split

SEED, HIDDEN, LR, EPOCHS, BATCH = 0, 64, 0.1, 30, 32

X, y = load_digits(return_X_y=True)  # 1797 images of 8x8 pixels, values 0..16
X = X / 16.0
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, stratify=y, random_state=SEED)

rng = np.random.default_rng(SEED)
params = [
    rng.normal(0, np.sqrt(2 / 64), (64, HIDDEN)),      # W1 (He initialization)
    np.zeros(HIDDEN),                                  # b1
    rng.normal(0, np.sqrt(2 / HIDDEN), (HIDDEN, 10)),  # W2
    np.zeros(10),                                      # b2
]

def loss_and_grads(X, y, W1, b1, W2, b2):
    """Mean softmax cross-entropy of the 64-HIDDEN-10 ReLU network, and its four gradients."""
    raise NotImplementedError("milestone 1: forward pass, loss and backward pass")

def gradient_check(f, params, eps=1e-6):
    """Largest relative difference between f's gradients and central finite differences."""
    loss, grads = f(*params)
    worst = 0.0
    for P, G in zip(params, grads):
        for idx in [(0,) * P.ndim, tuple(s - 1 for s in P.shape)]:
            old = P[idx]
            P[idx] = old + eps
            plus = f(*params)[0]
            P[idx] = old - eps
            minus = f(*params)[0]
            P[idx] = old
            numeric = (plus - minus) / (2 * eps)
            worst = max(worst, abs(numeric - G[idx]) / max(1e-12, abs(numeric) + abs(G[idx])))
    return worst

if __name__ == "__main__":
    print(f"train {X_train.shape}, test {X_test.shape}")
    try:
        err = gradient_check(lambda *p: loss_and_grads(X_train[:5], y_train[:5], *p), params)
        print(f"gradient check: max relative error {err:.1e} (aim for below 1e-6)")
    except NotImplementedError as e:
        print(f"next step: {e}")`,
  annotations: [
    {
      id: 'scale',
      range: { line: 8 },
      kind: 'syntax',
      title: 'Scale the pixels to [0, 1]',
      what: 'The digits’ pixel values run from 0 to 16.',
      why: 'Inputs of order 1 keep the first layer’s pre-activations in a range where the initialization below works as intended.',
    },
    {
      id: 'he',
      range: { line: 14 },
      kind: 'math',
      title: 'He initialization',
      what: 'Weights drawn from a normal distribution with variance 2 / fan-in.',
      why: 'Keeps the variance of ReLU activations roughly constant from layer to layer. Save these exact arrays: milestone 4 copies them into PyTorch.',
    },
    {
      id: 'stub',
      range: { line: 20 },
      kind: 'function',
      title: 'Your first milestone',
      what: 'Forward pass (two linear layers with a ReLU between), mean softmax cross-entropy, and the gradients of all four parameter arrays.',
      why: 'Everything else, training, evaluation and the PyTorch comparison, builds on this function being right.',
    },
    {
      id: 'gradcheck',
      range: { line: 24 },
      kind: 'function',
      title: 'Gradient check with central differences',
      what: 'Nudges a few parameters by ±eps and compares (L(p + eps) − L(p − eps)) / 2eps with your analytic gradient.',
      why: 'The relative error is about 1e-9 for a correct backward pass in float64 and around 1e-2 or worse for a typical bug.',
    },
  ],
};

export const starterOutput: CodeExample = {
  id: 'capstone-nn-output',
  language: 'bash',
  source: `python starter.py
# train (1437, 64), test (360, 64)
# next step: milestone 1: forward pass, loss and backward pass

python starter.py   # after milestone 1, with our reference loss_and_grads
# train (1437, 64), test (360, 64)
# gradient check: max relative error 2.0e-09 (aim for below 1e-6)`,
  annotations: [],
};

export const brief: ProjectBrief = {
  goal: 'Implement a two-layer neural network for handwritten digits with only NumPy, train it, then rebuild it in PyTorch so that both versions start from the same weights, see the same batches and reach the same loss, and explain every remaining difference.',
  dataset:
    'The handwritten digits bundled with scikit-learn (`load_digits`): 1,797 grayscale images of 8×8 pixels, values 0 to 16, 10 classes of about 180 images each. No download is needed.',
  milestones: [
    'Set up the pinned environment and run starter.py',
    'Write loss_and_grads (forward pass, mean softmax cross-entropy, backward pass) and pass the gradient check below 1e-6',
    'Train with mini-batch SGD (batch 32, learning rate 0.1, 30 epochs, a seeded shuffle per epoch) and plot training and test loss per epoch',
    'Rebuild the network with torch.nn.Linear and ReLU in float64, copy in your initial weights (note the transposed weight shape), and train on the same batch order',
    'Show that the final training losses agree to at least 1e-8, and add a pytest test that checks it',
    'Switch PyTorch to float32 and to its own default initialization, one at a time, and explain how each changes the results',
    'Write a short report: architecture, the two implementations side by side, results, and what you learned from the differences',
  ],
  rubric: [
    {
      criterion: 'Correct gradients',
      detail:
        'The gradient check passes for all four parameter arrays, and the report says how it was run (eps, which entries, relative error).',
    },
    {
      criterion: 'Numerically safe',
      detail:
        'Softmax subtracts the row maximum before exponentiating; no NaN or overflow at any point of training.',
    },
    {
      criterion: 'Training',
      detail:
        'Loss curves for training and test data; a test accuracy that a reader can reproduce from the seed (our reference solution reaches 0.964).',
    },
    {
      criterion: 'Equivalence',
      detail:
        'NumPy and PyTorch versions start from identical weights and batches, and their losses match to a stated tolerance, checked by a test.',
    },
    {
      criterion: 'Explaining differences',
      detail:
        'Each difference (dtype, initialization, batch order) is changed alone and its effect measured, not guessed.',
    },
    {
      criterion: 'Code quality',
      detail:
        'Small functions with docstrings, shapes noted in comments, no copied code between the two versions except the data loading.',
    },
  ],
  hints: [
    'Shapes first: X is (n, 64), W1 (64, 64), W2 (64, 10). Write the shape of every intermediate next to it.',
    'The gradient of mean cross-entropy with respect to the logits is (softmax(logits) − one_hot(y)) / n.',
    'The ReLU gradient passes through only where the pre-activation was positive: multiply by (h_pre > 0).',
    'torch.nn.Linear stores its weight as (out_features, in_features) and computes x @ W.T + b, so copy W1.T into it.',
    'Make the batch order shared, not re-drawn: create the permutation for each epoch once with NumPy and use it in both versions.',
    'In our reference solution the float64 losses agreed exactly after 30 epochs, and float32 PyTorch differed by about 2e-9.',
  ],
};
