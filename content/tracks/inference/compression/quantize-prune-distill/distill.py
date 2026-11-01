"""Distills the digits classifier (64 -> 16 -> 10, from the precision lesson) into a student half its width.

Run from this folder with NumPy 2.5 and scikit-learn 1.9 (the versions used for the numbers in code.ts):
    python3 distill.py
It trains each student with 5 seeds and prints how many of the 360 held-out test images each gets right.
The split is the same as in ../../precision/precision-quantization/generate_weights.py, so the teacher never
saw the test images.

Data: the UCI "Optical Recognition of Handwritten Digits" set as bundled with scikit-learn (load_digits),
licensed CC BY 4.0: https://archive.ics.uci.edu/dataset/80
"""
import json

import numpy as np
from sklearn.datasets import load_digits
from sklearn.model_selection import train_test_split

X, y = load_digits(return_X_y=True)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=360, random_state=0, stratify=y)
X_train, X_test = X_train / 16, X_test / 16

teacher = json.load(open("../../precision/precision-quantization/digits_mlp.json"))
tW1, tb1 = np.array(teacher["W1"]).T, np.array(teacher["b1"])
tW2, tb2 = np.array(teacher["W2"]).T, np.array(teacher["b2"])


def logits_of(x, W1, b1, W2, b2):
    return np.maximum(x @ W1 + b1, 0) @ W2 + b2


def softmax(z):
    e = np.exp(z - z.max(axis=1, keepdims=True))
    return e / e.sum(axis=1, keepdims=True)


def train_student(X_fit, targets, T, seed, hidden=8, steps=4400, lr=0.1, batch=64):
    """Minimizes T^2 * cross-entropy(targets, softmax(logits / T)) with plain SGD. T = 1 with one-hot
    targets is ordinary training on labels; T > 1 with the teacher's softened outputs is distillation."""
    rng = np.random.default_rng(seed)
    W1, b1 = rng.normal(0, 0.3, (64, hidden)), np.zeros(hidden)
    W2, b2 = rng.normal(0, 0.3, (hidden, 10)), np.zeros(10)
    for _ in range(steps):
        idx = rng.integers(0, len(X_fit), batch)
        x = X_fit[idx]
        z = x @ W1 + b1
        h = np.maximum(z, 0)
        g = T * (softmax((h @ W2 + b2) / T) - targets[idx]) / batch   # gradient of the loss w.r.t. logits
        dW2, db2 = h.T @ g, g.sum(axis=0)
        dz = (g @ W2.T) * (z > 0)
        dW1, db1 = x.T @ dz, dz.sum(axis=0)
        for p, d in [(W1, dW1), (b1, db1), (W2, dW2), (b2, db2)]:
            p -= lr * d
    return int((logits_of(X_test, W1, b1, W2, b2).argmax(axis=1) == y_test).sum())


T = 4
hard = np.eye(10)[y_train]
soft = softmax(logits_of(X_train, tW1, tb1, tW2, tb2) / T)
teacher_correct = int((logits_of(X_test, tW1, tb1, tW2, tb2).argmax(axis=1) == y_test).sum())
print(f"teacher, 64 -> 16 -> 10 (1,210 parameters): {teacher_correct} of 360")

runs = {
    "all 1,437 labels": lambda s: train_student(X_train, hard, 1, s),
    "distilled on all 1,437 images, T = 4": lambda s: train_student(X_train, soft, T, s),
    "only the first 100 labels": lambda s: train_student(X_train[:100], hard[:100], 1, s),
}
print("students, 64 -> 8 -> 10 (610 parameters), seeds 0-4:")
for name, run in runs.items():
    scores = [run(s) for s in range(5)]
    print(f"  {name:38s} {scores}  mean {np.mean(scores):.1f}")
