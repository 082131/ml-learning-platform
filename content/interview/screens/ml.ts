import type { ScreenDef } from '@/lib/interview/types';

const NOT_DONE = 'raise NotImplementedError';

// "Implement it from scratch" is the most common ML coding round: a classic algorithm in NumPy, no scikit-learn.
export const mlScreen: ScreenDef = {
  id: 'ml',
  role: 'ml',
  title: 'ML coding screen',
  summary:
    'Three implement-from-scratch tasks in NumPy, the staple of ML coding rounds: a clustering loop, a gradient-descent classifier and a ranking metric.',
  minutes: 60,
  passPercent: 70,
  tasks: [
    {
      id: 'scr-ml-kmeans',
      title: 'K-means from scratch',
      domain: 'ml',
      brief: `Write \`kmeans(X, init, max_iter=100)\`. \`X\` is an (n, d) array and \`init\` a (k, d) array of starting centroids.

Repeat: assign each point to its nearest centroid by Euclidean distance (lowest index wins a tie), then move each centroid to the mean of its points. A centroid with no points stays where it is. Stop when the assignments do not change or after \`max_iter\` rounds.

Return \`(centroids, labels)\`: a float (k, d) array and an integer (n,) array. Do not modify \`init\`.`,
      starter: `import numpy as np

def kmeans(X, init, max_iter=100):
    ${NOT_DONE}
`,
      solution: `import numpy as np

def kmeans(X, init, max_iter=100):
    X = np.asarray(X, dtype=float)
    centroids = np.array(init, dtype=float)
    labels = None
    for _ in range(max_iter):
        dist = ((X[:, None, :] - centroids[None, :, :]) ** 2).sum(axis=2)
        new = dist.argmin(axis=1)
        if labels is not None and np.array_equal(new, labels):
            break
        labels = new
        for j in range(len(centroids)):
            mask = labels == j
            if mask.any():
                centroids[j] = X[mask].mean(axis=0)
    return centroids, labels
`,
      checks: [
        {
          name: 'Separates two obvious clusters',
          points: 12,
          tests: `import numpy as np
_X = np.array([[0.0, 0.0], [0.0, 1.0], [1.0, 0.0], [10.0, 10.0], [10.0, 11.0], [11.0, 10.0]])
_init = np.array([[0.0, 0.0], [1.0, 0.0]])
_c, _l = kmeans(_X, _init)
assert list(_l) == [0, 0, 0, 1, 1, 1], f"labels were {list(_l)}"
assert np.allclose(_c, [[1/3, 1/3], [31/3, 31/3]]), f"centroids were {_c.tolist()}"
assert np.array_equal(_init, [[0.0, 0.0], [1.0, 0.0]]), "init must not be modified"
`,
        },
        {
          name: 'An empty cluster keeps its centroid',
          points: 10,
          tests: `import numpy as np
_X = np.array([[0.0], [1.0], [2.0]])
_c, _l = kmeans(_X, np.array([[1.0], [100.0]]))
assert list(_l) == [0, 0, 0], f"labels were {list(_l)}"
assert np.allclose(_c, [[1.0], [100.0]]), f"centroids were {_c.tolist()}"
`,
        },
        {
          name: 'Respects max_iter and matches a reference run',
          points: 11,
          tests: `import numpy as np
_rng = np.random.default_rng(3)
_X = np.vstack([_rng.normal(m, 1.0, (40, 2)) for m in (0.0, 4.0, 8.0)])
_init = _X[[0, 1, 2]].copy()
_c1, _l1 = kmeans(_X, _init, max_iter=1)
_d = ((_X[:, None, :] - _init[None, :, :]) ** 2).sum(axis=2)
assert np.array_equal(_l1, _d.argmin(axis=1)), "after one round the labels are the nearest starting centroids"
_c, _l = kmeans(_X, _init)
_d = ((_X[:, None, :] - _c[None, :, :]) ** 2).sum(axis=2)
assert np.array_equal(_l, _d.argmin(axis=1)), "at convergence every point is with its nearest centroid"
for _j in range(3):
    assert np.allclose(_c[_j], _X[_l == _j].mean(axis=0)), "each centroid is the mean of its points"
`,
        },
      ],
    },
    {
      id: 'scr-ml-logreg',
      title: 'Logistic regression by gradient descent',
      domain: 'ml',
      brief: `Write \`fit_logreg(X, y, lr=0.1, steps=1000, l2=0.0)\` for binary labels 0/1. Start from zero weights and zero bias and run full-batch gradient descent on the mean log loss plus \`(l2 / 2) * sum(w ** 2)\` (the bias is not penalized). Return \`(w, b)\`.

Also write \`predict_proba(X, w, b)\` returning the probability of class 1 for each row. It must not overflow or return NaN for large inputs such as a logit of 1000 or -1000.`,
      starter: `import numpy as np

def predict_proba(X, w, b):
    ${NOT_DONE}

def fit_logreg(X, y, lr=0.1, steps=1000, l2=0.0):
    ${NOT_DONE}
`,
      solution: `import numpy as np

def _sigmoid(z):
    out = np.empty_like(z, dtype=float)
    pos = z >= 0
    out[pos] = 1.0 / (1.0 + np.exp(-z[pos]))
    ez = np.exp(z[~pos])
    out[~pos] = ez / (1.0 + ez)
    return out

def predict_proba(X, w, b):
    return _sigmoid(np.asarray(X, dtype=float) @ np.asarray(w, dtype=float) + b)

def fit_logreg(X, y, lr=0.1, steps=1000, l2=0.0):
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    n, d = X.shape
    w = np.zeros(d)
    b = 0.0
    for _ in range(steps):
        err = predict_proba(X, w, b) - y
        w = w - lr * (X.T @ err / n + l2 * w)
        b = b - lr * err.mean()
    return w, b
`,
      checks: [
        {
          name: 'predict_proba is correct and numerically stable',
          points: 10,
          tests: `import numpy as np, warnings
warnings.simplefilter("error")
_p = predict_proba(np.array([[0.0], [1000.0], [-1000.0], [2.0]]), np.array([1.0]), 0.0)
assert np.all(np.isfinite(_p)), "probabilities must be finite"
assert np.allclose(_p, [0.5, 1.0, 0.0, 1 / (1 + np.exp(-2.0))]), f"got {_p.tolist()}"
`,
        },
        {
          name: 'One step matches the gradient by hand',
          points: 12,
          tests: `import numpy as np
_X = np.array([[1.0, 2.0], [3.0, -1.0], [0.0, 1.0], [-2.0, 0.5]])
_y = np.array([1, 0, 1, 0])
_w, _b = fit_logreg(_X, _y, lr=0.5, steps=1)
_g = _X.T @ (0.5 - _y) / 4
assert np.allclose(_w, -0.5 * _g), f"after one step w should be {(-0.5 * _g).tolist()}, got {np.asarray(_w).tolist()}"
assert abs(_b - 0.0) < 1e-12, f"bias after one step should be 0, got {_b}"
`,
        },
        {
          name: 'Learns a separable problem; L2 shrinks the weights',
          points: 12,
          tests: `import numpy as np
_rng = np.random.default_rng(0)
_X = _rng.normal(0, 1, (300, 2))
_y = (_X[:, 0] + 0.5 * _X[:, 1] > 0.2).astype(int)
_w, _b = fit_logreg(_X, _y, lr=0.5, steps=2000)
_acc = ((predict_proba(_X, _w, _b) > 0.5) == _y).mean()
assert _acc > 0.97, f"training accuracy {_acc:.3f} is too low"
_w2, _ = fit_logreg(_X, _y, lr=0.5, steps=2000, l2=0.5)
assert np.linalg.norm(_w2) < 0.5 * np.linalg.norm(_w), "l2 should shrink the weights"
_w3, _b3 = fit_logreg(_X, _y, lr=0.5, steps=3, l2=0.1)
_wr, _br = np.zeros(2), 0.0
for _ in range(3):
    _e = 1 / (1 + np.exp(-(_X @ _wr + _br))) - _y
    _wr, _br = _wr - 0.5 * (_X.T @ _e / 300 + 0.1 * _wr), _br - 0.5 * _e.mean()
assert np.allclose(_w3, _wr) and abs(_b3 - _br) < 1e-9, "three steps with l2 do not match the reference update"
`,
        },
      ],
    },
    {
      id: 'scr-ml-auc',
      title: 'ROC AUC with ties',
      domain: 'ml',
      brief: `Write \`roc_auc(y_true, scores)\` without scikit-learn. AUC is the probability that a randomly chosen positive is scored above a randomly chosen negative, counting a tie as one half.

Labels are 0/1. Raise \`ValueError\` if only one class is present. It must run in O(n log n): the tests include 50,000 rows, so comparing every pair is too slow.`,
      starter: `import numpy as np

def roc_auc(y_true, scores):
    ${NOT_DONE}
`,
      solution: `import numpy as np

def roc_auc(y_true, scores):
    y = np.asarray(y_true).astype(int)
    s = np.asarray(scores, dtype=float)
    n_pos = int(y.sum())
    n_neg = len(y) - n_pos
    if n_pos == 0 or n_neg == 0:
        raise ValueError("both classes are required")
    _, inverse, counts = np.unique(s, return_inverse=True, return_counts=True)
    last = np.cumsum(counts)
    ranks = (last - (counts - 1) / 2)[inverse]
    return float((ranks[y == 1].sum() - n_pos * (n_pos + 1) / 2) / (n_pos * n_neg))
`,
      checks: [
        {
          name: 'Small cases, including ties',
          points: 12,
          tests: `assert abs(roc_auc([0, 0, 1, 1], [0.1, 0.4, 0.35, 0.8]) - 0.75) < 1e-12, "the classic four-point example is 0.75"
assert abs(roc_auc([0, 1], [0.2, 0.9]) - 1.0) < 1e-12
assert abs(roc_auc([1, 0], [0.2, 0.9]) - 0.0) < 1e-12
assert abs(roc_auc([0, 1, 0, 1], [0.5, 0.5, 0.5, 0.5]) - 0.5) < 1e-12, "all scores tied should give 0.5"
assert abs(roc_auc([0, 0, 1, 1], [0.1, 0.5, 0.5, 0.9]) - 0.875) < 1e-12, "one tied pair counts one half"
`,
        },
        {
          name: 'Rejects a single class',
          points: 6,
          tests: `for _y in ([1, 1, 1], [0, 0]):
    try:
        roc_auc(_y, [0.1] * len(_y))
    except ValueError:
        pass
    else:
        raise AssertionError("expected ValueError when only one class is present")
`,
        },
        {
          name: 'Fast and correct on 50,000 rows',
          points: 15,
          tests: `import numpy as np, time
_rng = np.random.default_rng(1)
_y = _rng.integers(0, 2, 50_000)
_s = np.round(_rng.normal(_y * 0.8, 1.0), 2)
_t = time.perf_counter()
_a = roc_auc(_y, _s)
_el = time.perf_counter() - _t
_pos = np.sort(_s[_y == 1]); _neg = np.sort(_s[_y == 0])
_lt = np.searchsorted(_neg, _pos, side="left"); _le = np.searchsorted(_neg, _pos, side="right")
_ref = (_lt.sum() + 0.5 * (_le - _lt).sum()) / (len(_pos) * len(_neg))
assert abs(_a - _ref) < 1e-9, f"expected {_ref:.6f}, got {_a:.6f}"
assert _el < 20, f"took {_el:.1f}s; an O(n log n) solution finishes in well under a second"
`,
        },
      ],
    },
  ],
};
