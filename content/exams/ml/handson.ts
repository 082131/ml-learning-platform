import type { HandsOnTask } from '@/lib/exam/types';

// Hands-on part of the ML Engineer exam: 5 tasks, 100 points. Each check runs hidden asserts after your code.
// Every solution passes all its checks and every starter fails them (content/exams/exams-python.test.ts).

const NOT_DONE = 'raise NotImplementedError';

export const tasks: HandsOnTask[] = [
  {
    id: 'ml-h1',
    title: 'Leak-free target encoding',
    domain: 'data',
    brief: `A high-cardinality column must be target encoded for a boosted model without leaking each row's own label.

Write \`oof_target_encode(cats, y, k=5, smoothing=10.0)\`. Row \`i\` belongs to fold \`i % k\`. Encode every row using only the rows of the other folds: \`(sum of y for the category + smoothing * prior) / (count of the category + smoothing)\`, where \`prior\` is the mean of \`y\` over those other folds. A category that never appears outside the row's fold gets the prior.

Also write \`fit_transform_test(train_cats, y, test_cats, smoothing=10.0)\`, which encodes test rows from all training rows with the same formula (the prior is the mean of all of \`y\`). Return NumPy arrays.`,
    starter: `import numpy as np

def oof_target_encode(cats, y, k=5, smoothing=10.0):
    ${NOT_DONE}

def fit_transform_test(train_cats, y, test_cats, smoothing=10.0):
    ${NOT_DONE}
`,
    solution: `import numpy as np

def oof_target_encode(cats, y, k=5, smoothing=10.0):
    cats = np.asarray(cats)
    y = np.asarray(y, dtype=float)
    folds = np.arange(len(y)) % k
    out = np.empty(len(y))
    for f in range(k):
        train = folds != f
        prior = y[train].mean()
        sums, counts = {}, {}
        for c, t in zip(cats[train], y[train]):
            sums[c] = sums.get(c, 0.0) + t
            counts[c] = counts.get(c, 0) + 1
        for i in np.where(~train)[0]:
            c = cats[i]
            out[i] = (sums.get(c, 0.0) + smoothing * prior) / (counts.get(c, 0) + smoothing)
    return out

def fit_transform_test(train_cats, y, test_cats, smoothing=10.0):
    train_cats = np.asarray(train_cats)
    y = np.asarray(y, dtype=float)
    prior = y.mean()
    out = []
    for c in test_cats:
        m = train_cats == c
        out.append((y[m].sum() + smoothing * prior) / (m.sum() + smoothing))
    return np.array(out)
`,
    checks: [
      {
        name: 'Encodes a row from the other folds only',
        points: 6,
        tests: `import numpy as np
_c = np.array(['a', 'b', 'a', 'c', 'b', 'a', 'c', 'a', 'b', 'a'])
_y = np.array([1, 0, 1, 0, 1, 0, 1, 1, 0, 1])
_e = oof_target_encode(_c, _y, k=5, smoothing=2.0)
assert np.shape(_e) == (10,), "return one value per row"
_tr = np.array([i for i in range(10) if i % 5 != 0])
_prior = _y[_tr].mean()
_m = _c[_tr] == 'a'
_want = (_y[_tr][_m].sum() + 2.0 * _prior) / (_m.sum() + 2.0)
assert abs(_e[0] - _want) < 1e-9, f"row 0: expected {_want:.4f}, got {_e[0]:.4f}"
`,
      },
      {
        name: 'A unique category never sees its own label',
        points: 5,
        tests: `import numpy as np
_c = np.array(['x', 'u'] + ['x'] * 8)
_y = np.array([0, 1] + [0] * 8)
_e = oof_target_encode(_c, _y, k=5, smoothing=1.0)
assert _e[1] < 0.5, "row 1 (the only 'u') leaked its own positive label"
_tr = np.array([i for i in range(10) if i % 5 != 1])
assert abs(_e[1] - _y[_tr].mean()) < 1e-9, "a category unseen in the other folds should get the fold prior"
`,
      },
      {
        name: 'Smoothing shrinks toward the fold prior',
        points: 5,
        tests: `import numpy as np
_rng = np.random.default_rng(0)
_c = _rng.integers(0, 50, 2000).astype(str)
_y = _rng.integers(0, 2, 2000)
_hi = oof_target_encode(_c, _y, k=5, smoothing=1e6)
_folds = np.arange(2000) % 5
for _f in range(5):
    assert np.allclose(_hi[_folds == _f], _y[_folds != _f].mean(), atol=1e-4), "huge smoothing should give the fold prior"
_lo = oof_target_encode(_c, _y, k=5, smoothing=0.0)
assert np.all((_lo >= 0) & (_lo <= 1)), "with no smoothing, values are category means in [0, 1]"
`,
      },
      {
        name: 'Test rows use all training rows',
        points: 4,
        tests: `import numpy as np
_t = fit_transform_test(['a', 'a', 'b'], [1, 0, 1], ['a', 'b', 'zzz'], smoothing=1.0)
_p = 2 / 3
assert np.allclose(_t, [(1 + _p) / 3, (1 + _p) / 2, _p]), f"test encoding is wrong: {_t}"
`,
      },
    ],
  },
  {
    id: 'ml-h2',
    title: 'Regularized logistic regression with a gradient check',
    domain: 'model',
    brief: `Implement L2-regularized logistic regression with NumPy only.

\`loss(w, b, X, y, lam)\` returns the mean binary cross-entropy plus \`lam / 2 * sum(w ** 2)\`. The bias \`b\` is not regularized. It must stay finite for logits as large as ±1000, so compute it from logits in a numerically stable way.

\`grad(w, b, X, y, lam)\` returns \`(dw, db)\`, the exact gradient of \`loss\`.

\`fit(X, y, lam=0.0, lr=0.1, steps=500)\` runs full-batch gradient descent from zeros and returns \`(w, b)\`.`,
    starter: `import numpy as np

def loss(w, b, X, y, lam):
    ${NOT_DONE}

def grad(w, b, X, y, lam):
    ${NOT_DONE}

def fit(X, y, lam=0.0, lr=0.1, steps=500):
    ${NOT_DONE}
`,
    solution: `import numpy as np

def loss(w, b, X, y, lam):
    z = X @ w + b
    # log(1 + e^z) - y*z, written so large |z| never overflows
    per_row = np.logaddexp(0.0, z) - y * z
    return per_row.mean() + lam / 2 * np.sum(w ** 2)

def grad(w, b, X, y, lam):
    z = X @ w + b
    p = 0.5 * (1 + np.tanh(z / 2))
    err = p - y
    return X.T @ err / len(y) + lam * w, err.mean()

def fit(X, y, lam=0.0, lr=0.1, steps=500):
    w = np.zeros(X.shape[1])
    b = 0.0
    for _ in range(steps):
        dw, db = grad(w, b, X, y, lam)
        w -= lr * dw
        b -= lr * db
    return w, b
`,
    checks: [
      {
        name: 'Loss value matches the definition',
        points: 4,
        tests: `import numpy as np
_X = np.array([[1.0, 2.0], [-1.0, 0.5], [0.3, -0.7]])
_y = np.array([1.0, 0.0, 1.0])
_w = np.array([0.4, -0.2]); _b = 0.1
_z = _X @ _w + _b
_p = 1 / (1 + np.exp(-_z))
_want = -np.mean(_y * np.log(_p) + (1 - _y) * np.log(1 - _p)) + 0.3 / 2 * np.sum(_w ** 2)
assert abs(loss(_w, _b, _X, _y, 0.3) - _want) < 1e-9, "loss does not match mean BCE + lam/2 * ||w||^2"
`,
      },
      {
        name: 'Loss is stable for huge logits',
        points: 4,
        tests: `import numpy as np
_X = np.array([[1000.0], [-1000.0]])
_y = np.array([0.0, 1.0])
_v = loss(np.array([1.0]), 0.0, _X, _y, 0.0)
assert np.isfinite(_v), "loss overflowed for logits of +-1000"
assert abs(_v - 1000.0) < 1e-6, f"expected 1000.0 (each row is confidently wrong), got {_v}"
`,
      },
      {
        name: 'Gradient matches finite differences',
        points: 6,
        tests: `import numpy as np
_r = np.random.default_rng(1)
_X = _r.normal(size=(40, 3)); _y = (_r.random(40) > 0.5).astype(float)
_w = _r.normal(size=3); _b = 0.2; _lam = 0.5; _h = 1e-6
_dw, _db = grad(_w, _b, _X, _y, _lam)
for _j in range(3):
    _e = np.zeros(3); _e[_j] = _h
    _num = (loss(_w + _e, _b, _X, _y, _lam) - loss(_w - _e, _b, _X, _y, _lam)) / (2 * _h)
    assert abs(_dw[_j] - _num) < 1e-5, f"dw[{_j}] = {_dw[_j]:.6f}, numerical {_num:.6f}"
_numb = (loss(_w, _b + _h, _X, _y, _lam) - loss(_w, _b - _h, _X, _y, _lam)) / (2 * _h)
assert abs(_db - _numb) < 1e-5, "db is wrong (is the bias being regularized?)"
`,
      },
      {
        name: 'Training fits and L2 shrinks the weights',
        points: 6,
        tests: `import numpy as np
_r = np.random.default_rng(2)
_X = _r.normal(size=(300, 2))
_y = (_X[:, 0] - 2 * _X[:, 1] + 0.3 > 0).astype(float)
_w0, _b0 = fit(_X, _y, lam=0.0, lr=0.5, steps=800)
_acc = np.mean(((_X @ _w0 + _b0) > 0) == _y)
assert _acc > 0.95, f"training accuracy {_acc:.3f} should exceed 0.95 on separable data"
_w1, _b1 = fit(_X, _y, lam=0.5, lr=0.5, steps=800)
assert np.linalg.norm(_w1) < 0.5 * np.linalg.norm(_w0), "lam=0.5 should shrink ||w|| strongly"
`,
      },
    ],
  },
  {
    id: 'ml-h3',
    title: 'Metrics for a rare-event classifier',
    domain: 'eval',
    brief: `Write three evaluation functions with NumPy only (no scikit-learn). Scores in the tests have no ties.

\`average_precision(y, scores)\`: sort by score, descending, and return the sum over positives of the precision at that rank, divided by the number of positives (the step-wise area under the precision-recall curve).

\`cost_optimal_threshold(y, p, c_fp, c_fn)\`: among the candidate thresholds \`[0.0] + sorted(set(p))\`, flagging \`p >= t\`, return the threshold with the lowest total cost \`c_fp * FP + c_fn * FN\`. On ties, return the smallest threshold.

\`expected_calibration_error(y, p, bins=10)\`: split [0, 1] into equal-width bins (a probability of exactly 1.0 goes in the last bin), and return the sum over non-empty bins of \`(bin size / n) * |mean(y) - mean(p)|\`.`,
    starter: `import numpy as np

def average_precision(y, scores):
    ${NOT_DONE}

def cost_optimal_threshold(y, p, c_fp, c_fn):
    ${NOT_DONE}

def expected_calibration_error(y, p, bins=10):
    ${NOT_DONE}
`,
    solution: `import numpy as np

def average_precision(y, scores):
    y = np.asarray(y)[np.argsort(-np.asarray(scores))]
    hits = np.cumsum(y)
    ranks = np.arange(1, len(y) + 1)
    return float(np.sum((hits / ranks)[y == 1]) / y.sum())

def cost_optimal_threshold(y, p, c_fp, c_fn):
    y = np.asarray(y); p = np.asarray(p)
    best_t, best_cost = None, None
    for t in [0.0] + sorted(set(p.tolist())):
        flag = p >= t
        cost = c_fp * np.sum(flag & (y == 0)) + c_fn * np.sum(~flag & (y == 1))
        if best_cost is None or cost < best_cost:
            best_t, best_cost = t, cost
    return best_t

def expected_calibration_error(y, p, bins=10):
    y = np.asarray(y, dtype=float); p = np.asarray(p, dtype=float)
    idx = np.minimum((p * bins).astype(int), bins - 1)
    total = 0.0
    for b in range(bins):
        m = idx == b
        if m.any():
            total += m.mean() * abs(y[m].mean() - p[m].mean())
    return float(total)
`,
    checks: [
      {
        name: 'Average precision on a small ranking',
        points: 7,
        tests: `_ap = average_precision([1, 0, 1, 0, 0, 1], [0.9, 0.8, 0.7, 0.6, 0.5, 0.4])
assert abs(_ap - (1 + 2 / 3 + 3 / 6) / 3) < 1e-9, f"got {_ap}"
assert abs(average_precision([0, 1], [0.9, 0.1]) - 0.5) < 1e-9, "positive at rank 2 should give AP 0.5"
`,
      },
      {
        name: 'Average precision on random data',
        points: 3,
        tests: `import numpy as np
_r = np.random.default_rng(3)
_y = (_r.random(500) < 0.05).astype(int); _s = _r.random(500)
_o = np.argsort(-_s); _ys = _y[_o]; _tp = 0; _acc = 0.0
for _k, _v in enumerate(_ys, 1):
    if _v:
        _tp += 1; _acc += _tp / _k
assert abs(average_precision(_y, _s) - _acc / _y.sum()) < 1e-9
`,
      },
      {
        name: 'Threshold minimizes asymmetric cost',
        points: 6,
        tests: `import numpy as np
_y = np.array([0, 0, 1, 0, 1, 1, 0, 1])
_p = np.array([0.05, 0.2, 0.3, 0.35, 0.6, 0.7, 0.8, 0.9])
assert cost_optimal_threshold(_y, _p, 1, 1) == 0.3, "with equal costs 0.3 and 0.6 tie at cost 2: return the smaller"
assert cost_optimal_threshold(_y, _p, 1, 100) == 0.3, "when misses cost 100x, flag from 0.3"
assert cost_optimal_threshold(_y, _p, 100, 1) == 0.9, "when false alarms cost 100x, flag only 0.9"
`,
      },
      {
        name: 'Expected calibration error',
        points: 4,
        tests: `import numpy as np
assert expected_calibration_error([1, 0], [1.0, 0.0]) < 1e-12, "a perfect forecaster has ECE 0"
_e = expected_calibration_error([1, 1, 0, 0], [0.9, 0.9, 0.1, 0.3])
assert abs(_e - (0.5 * 0.1 + 0.25 * 0.1 + 0.25 * 0.3)) < 1e-9, f"got {_e}"
`,
      },
    ],
  },
  {
    id: 'ml-h4',
    title: 'Drift detection: PSI and KS',
    domain: 'monitor',
    brief: `Build the two statistics a monitoring job computes for a numeric feature.

\`psi(expected, actual, bins=10, eps=1e-4)\`: bin edges are the quantiles of \`expected\` at \`np.linspace(0, 1, bins + 1)\`, with the first edge set to \`-inf\` and the last to \`+inf\`. Count each sample into bins with \`np.histogram\`, turn counts into proportions, replace proportions below \`eps\` with \`eps\`, and return \`sum((a - e) * ln(a / e))\`.

\`ks_statistic(a, b)\`: the two-sample Kolmogorov-Smirnov statistic, the largest absolute gap between the two empirical CDFs, evaluated at every observed value.

\`drift_report(expected, actual)\`: return \`"stable"\` when PSI < 0.1, \`"moderate"\` when PSI < 0.25 and \`"major"\` otherwise.`,
    starter: `import numpy as np

def psi(expected, actual, bins=10, eps=1e-4):
    ${NOT_DONE}

def ks_statistic(a, b):
    ${NOT_DONE}

def drift_report(expected, actual):
    ${NOT_DONE}
`,
    solution: `import numpy as np

def psi(expected, actual, bins=10, eps=1e-4):
    expected = np.asarray(expected, dtype=float); actual = np.asarray(actual, dtype=float)
    edges = np.quantile(expected, np.linspace(0, 1, bins + 1))
    edges[0], edges[-1] = -np.inf, np.inf
    e = np.histogram(expected, edges)[0] / len(expected)
    a = np.histogram(actual, edges)[0] / len(actual)
    e = np.maximum(e, eps); a = np.maximum(a, eps)
    return float(np.sum((a - e) * np.log(a / e)))

def ks_statistic(a, b):
    a = np.sort(np.asarray(a, dtype=float)); b = np.sort(np.asarray(b, dtype=float))
    xs = np.concatenate([a, b])
    fa = np.searchsorted(a, xs, side='right') / len(a)
    fb = np.searchsorted(b, xs, side='right') / len(b)
    return float(np.max(np.abs(fa - fb)))

def drift_report(expected, actual):
    v = psi(expected, actual)
    return 'stable' if v < 0.1 else 'moderate' if v < 0.25 else 'major'
`,
    checks: [
      {
        name: 'PSI is zero for identical data and positive under shift',
        points: 5,
        tests: `import numpy as np
_r = np.random.default_rng(4); _x = _r.normal(size=5000)
assert abs(psi(_x, _x)) < 1e-12, "PSI of a sample with itself must be 0"
assert psi(_x, _x + 1.0) > 0.5, "a one-sigma shift should give a large PSI"
`,
      },
      {
        name: 'PSI matches a hand computation',
        points: 6,
        tests: `import numpy as np
_e = np.arange(100, dtype=float)
_a = np.concatenate([np.arange(0, 50, dtype=float), np.full(50, 99.0)])
_v = psi(_e, _a, bins=4)
_pe = np.array([.25, .25, .25, .25]); _pa = np.array([.25, .25, 0.0001, .5])
_want = np.sum((_pa - _pe) * np.log(_pa / _pe))
assert abs(_v - _want) < 1e-6, f"expected {_want:.5f}, got {_v:.5f}"
`,
      },
      {
        name: 'KS statistic is exact',
        points: 5,
        tests: `import numpy as np
assert abs(ks_statistic([1, 2, 3], [1, 2, 3])) < 1e-12
assert abs(ks_statistic([1, 2, 3, 4], [3, 4, 5, 6]) - 0.5) < 1e-12, "the CDF gap peaks at 0.5"
assert abs(ks_statistic([0.0], [1.0, 2.0]) - 1.0) < 1e-12
`,
      },
      {
        name: 'Report bands follow the PSI rule of thumb',
        points: 4,
        tests: `import numpy as np
_r = np.random.default_rng(5); _x = _r.normal(size=20000)
assert drift_report(_x, _r.normal(size=20000)) == 'stable'
assert drift_report(_x, _r.normal(0.4, 1, 20000)) == 'moderate'
assert drift_report(_x, _r.normal(1.0, 1, 20000)) == 'major'
`,
      },
    ],
  },
  {
    id: 'ml-h5',
    title: 'Validation splits that do not leak',
    domain: 'eval',
    brief: `Write two splitters that return lists of \`(train_idx, test_idx)\` pairs of sorted Python lists of row indexes.

\`walk_forward(n, n_splits, test_size, gap)\`: rows are in time order. Split \`s\` (0-based) tests on the \`test_size\` rows ending \`(n_splits - 1 - s) * test_size\` rows before the end, so the last split tests on the final rows. Training uses every row before the test block except the \`gap\` rows right before it. Return the splits from earliest to latest.

\`group_kfold(groups, k)\`: assign whole groups to folds so no group appears in both train and test. Sort the distinct groups by size (largest first; ties by the group value ascending) and give each one to the fold that currently has the fewest rows (ties: lowest fold number). Fold \`f\`'s test set is its rows; train is everything else. Return folds 0 to k-1.`,
    starter: `def walk_forward(n, n_splits, test_size, gap):
    ${NOT_DONE}

def group_kfold(groups, k):
    ${NOT_DONE}
`,
    solution: `def walk_forward(n, n_splits, test_size, gap):
    out = []
    for s in range(n_splits):
        end = n - (n_splits - 1 - s) * test_size
        start = end - test_size
        out.append((list(range(0, max(0, start - gap))), list(range(start, end))))
    return out

def group_kfold(groups, k):
    sizes = {}
    for g in groups:
        sizes[g] = sizes.get(g, 0) + 1
    order = sorted(sizes, key=lambda g: (-sizes[g], g))
    load = [0] * k
    fold_of = {}
    for g in order:
        f = min(range(k), key=lambda i: (load[i], i))
        fold_of[g] = f
        load[f] += sizes[g]
    out = []
    for f in range(k):
        test = [i for i, g in enumerate(groups) if fold_of[g] == f]
        train = [i for i, g in enumerate(groups) if fold_of[g] != f]
        out.append((train, test))
    return out
`,
    checks: [
      {
        name: 'Walk-forward blocks are in the right place',
        points: 6,
        tests: `_s = walk_forward(20, 3, 4, 0)
assert len(_s) == 3
assert _s[-1][1] == [16, 17, 18, 19], "the last split must test on the final rows"
assert _s[0][1] == [8, 9, 10, 11] and _s[0][0] == list(range(8)), f"first split is wrong: {_s[0]}"
`,
      },
      {
        name: 'The gap is respected and the future never trains',
        points: 6,
        tests: `_s = walk_forward(100, 4, 10, 5)
for _tr, _te in _s:
    assert max(_tr) < min(_te) - 5, "training rows must end more than gap rows before the test block"
    assert max(_tr) == min(_te) - 6, "training should use everything up to the gap"
`,
      },
      {
        name: 'Group k-fold keeps groups together and balances folds',
        points: 8,
        tests: `_g = ['a'] * 5 + ['b'] * 3 + ['c'] * 3 + ['d'] * 2 + ['e']
_f = group_kfold(_g, 3)
assert len(_f) == 3
for _tr, _te in _f:
    assert not ({_g[i] for i in _tr} & {_g[i] for i in _te}), "a group appears in both train and test"
    assert sorted(_tr + _te) == list(range(len(_g)))
assert [len(t) for _, t in _f] == [5, 5, 4], f"fold sizes should be [5, 5, 4], got {[len(t) for _, t in _f]}"
assert _f[1][1] == [5, 6, 7, 11, 12], "fold 1 should hold groups b and d"
`,
      },
    ],
  },
];
