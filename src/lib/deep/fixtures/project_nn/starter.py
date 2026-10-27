import numpy as np
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
          np.allclose(X_train.mean(axis=0), 0), np.allclose(X_train.std(axis=0), 1))
