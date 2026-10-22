"""Trains the small digits classifier whose weights the precision lesson quantizes.

Run from this folder with scikit-learn 1.9 and NumPy 2.5 (versions used for the committed file):
    python3 generate_weights.py
It writes digits_mlp.json: the two weight matrices and biases (rounded to float32 and written as the shortest round-tripping decimal, stored as
(out, in) like torch.nn.Linear), the 360 held-out test images (8x8 pixels, 0-16) and their labels,
and the test accuracy of the float model, computed below with plain Python loops.

Data: the UCI "Optical Recognition of Handwritten Digits" set as bundled with scikit-learn
(load_digits), licensed CC BY 4.0: https://archive.ics.uci.edu/dataset/80
"""
import json

import numpy as np
import sklearn
from sklearn.datasets import load_digits
from sklearn.model_selection import train_test_split
from sklearn.neural_network import MLPClassifier

HIDDEN = 16
TEST_SIZE = 360
SEED = 0

X, y = load_digits(return_X_y=True)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=TEST_SIZE, random_state=SEED, stratify=y)
clf = MLPClassifier(hidden_layer_sizes=(HIDDEN,), max_iter=2000, random_state=SEED)
clf.fit(X_train / 16, y_train)


def f32(a):
    """Rounds to float32, written as the shortest decimal that converts back to the same float32."""
    return [float(str(v)) for v in np.asarray(a, dtype=np.float32).ravel()] if np.ndim(a) == 1 else [f32(r) for r in a]


model = {
    "W1": f32(clf.coefs_[0].T),  # (16, 64)
    "b1": f32(clf.intercepts_[0]),
    "W2": f32(clf.coefs_[1].T),  # (10, 16)
    "b2": f32(clf.intercepts_[1]),
}


def predict(m, images):
    """The forward pass with Python loops, summing in index order (as the TypeScript does)."""
    out = []
    for img in images:
        x = [p / 16 for p in img]
        h = [max(0.0, sum(w * xi for w, xi in zip(row, x)) + b) for row, b in zip(m["W1"], m["b1"])]
        logits = [sum(w * hi for w, hi in zip(row, h)) + b for row, b in zip(m["W2"], m["b2"])]
        out.append(max(range(len(logits)), key=lambda k: logits[k]))
    return out


test = {"X": X_test.astype(int).tolist(), "y": y_test.astype(int).tolist()}
correct = sum(p == t for p, t in zip(predict(model, test["X"]), test["y"]))
model["test"] = test
model["floatCorrect"] = correct
model["source"] = (
    f"MLPClassifier(hidden_layer_sizes=({HIDDEN},), max_iter=2000, random_state={SEED}) trained on the "
    f"scikit-learn digits training split (test_size={TEST_SIZE}, random_state={SEED}, stratified); "
    f"scikit-learn {sklearn.__version__}, NumPy {np.__version__}"
)
with open("digits_mlp.json", "w") as f:
    json.dump(model, f, separators=(",", ":"))
print(f"float32 weights: {correct}/{TEST_SIZE} test images correct")
