import type { ScreenDef } from '@/lib/interview/types';

const NOT_DONE = 'raise NotImplementedError';

// Data-centric ML screens: implement the statistic, then handle the degenerate inputs real data produces.
export const dataopsScreen: ScreenDef = {
  id: 'dataops',
  role: 'dataops',
  title: 'ML data operations coding screen',
  summary:
    'Three data-quality measurements written from their definitions: annotator agreement, distribution drift and a leak-free split.',
  minutes: 50,
  passPercent: 70,
  tasks: [
    {
      id: 'scr-dops-kappa',
      title: "Cohen's kappa",
      domain: 'dataops',
      brief: `Write \`cohen_kappa(a, b)\` for two annotators' labels over the same items (equal-length sequences of hashable labels).

Kappa is \`(po - pe) / (1 - pe)\`, where \`po\` is the fraction of items they agree on and \`pe\` is the agreement expected by chance: the sum over labels of the product of each annotator's rate for that label.

If \`pe\` is 1 (both always give one identical label) return 1.0. Raise \`ValueError\` for empty input or different lengths.`,
      starter: `def cohen_kappa(a, b):
    ${NOT_DONE}
`,
      solution: `from collections import Counter

def cohen_kappa(a, b):
    if len(a) != len(b) or len(a) == 0:
        raise ValueError("need two non-empty label lists of equal length")
    n = len(a)
    po = sum(x == y for x, y in zip(a, b)) / n
    ca, cb = Counter(a), Counter(b)
    pe = sum(ca[label] * cb[label] for label in ca) / (n * n)
    if pe == 1:
        return 1.0
    return (po - pe) / (1 - pe)
`,
      checks: [
        {
          name: 'Matches hand-worked values',
          points: 13,
          tests: `_a = ["y"] * 20 + ["y"] * 5 + ["n"] * 10 + ["n"] * 15
_b = ["y"] * 20 + ["n"] * 5 + ["y"] * 10 + ["n"] * 15
assert abs(cohen_kappa(_a, _b) - 0.4) < 1e-12, f"po=0.7, pe=0.5 gives 0.4, got {cohen_kappa(_a, _b)}"
assert abs(cohen_kappa([0, 1, 0, 1], [0, 1, 0, 1]) - 1.0) < 1e-12
assert abs(cohen_kappa([0, 1, 0, 1], [1, 0, 1, 0]) + 1.0) < 1e-12, "systematic disagreement is -1"
assert abs(cohen_kappa(["a", "b", "c", "a"], ["a", "b", "c", "b"]) - (0.75 - 0.3125) / (1 - 0.3125)) < 1e-12
`,
        },
        {
          name: 'High raw agreement can be chance',
          points: 10,
          tests: `_a = [0] * 90 + [1] * 5 + [0] * 5
_b = [0] * 90 + [0] * 5 + [1] * 5
_k = cohen_kappa(_a, _b)
assert abs(_k - (0.9 - 0.905) / (1 - 0.905)) < 1e-9, f"got {_k}"
assert _k < 0, "90% agreement here is slightly worse than chance"
`,
        },
        {
          name: 'Degenerate and invalid input',
          points: 10,
          tests: `assert cohen_kappa(["x", "x"], ["x", "x"]) == 1.0, "pe = 1 returns 1.0 rather than dividing by zero"
for _args in (([], []), ([1, 2], [1])):
    try:
        cohen_kappa(*_args)
    except ValueError:
        pass
    else:
        raise AssertionError(f"{_args} should raise ValueError")
assert abs(cohen_kappa((1, 2, 2), (1, 2, 1)) - 0.4) < 1e-12, "tuples work too"
`,
        },
      ],
    },
    {
      id: 'scr-dops-psi',
      title: 'Population stability index',
      domain: 'dataops',
      brief: `Write \`psi(baseline, current, bins=10, eps=1e-4)\` for two 1-D numeric arrays.

Bin edges are the quantiles of \`baseline\` at \`0, 1/bins, ..., 1\` (\`np.quantile\`), with the first edge replaced by \`-inf\` and the last by \`+inf\` so that every current value lands in a bin. A value equal to an inner edge belongs to the bin on its right.

Compute each sample's fraction per bin, replace fractions below \`eps\` with \`eps\`, and return \`sum((cur - base) * ln(cur / base))\` as a float.`,
      starter: `import numpy as np

def psi(baseline, current, bins=10, eps=1e-4):
    ${NOT_DONE}
`,
      solution: `import numpy as np

def psi(baseline, current, bins=10, eps=1e-4):
    base = np.asarray(baseline, dtype=float)
    cur = np.asarray(current, dtype=float)
    inner = np.quantile(base, np.linspace(0, 1, bins + 1))[1:-1]
    b = np.bincount(np.searchsorted(inner, base, side="right"), minlength=bins) / len(base)
    c = np.bincount(np.searchsorted(inner, cur, side="right"), minlength=bins) / len(cur)
    b = np.maximum(b, eps)
    c = np.maximum(c, eps)
    return float(np.sum((c - b) * np.log(c / b)))
`,
      checks: [
        {
          name: 'Zero for the same data, small for the same distribution',
          points: 10,
          tests: `import numpy as np
_rng = np.random.default_rng(0)
_x = _rng.normal(0, 1, 20_000)
assert abs(psi(_x, _x)) < 1e-12, "identical samples have PSI 0"
_v = psi(_x, _rng.normal(0, 1, 20_000))
assert 0 <= _v < 0.01, f"two samples of one distribution should be near 0, got {_v}"
assert type(_v) is float
`,
        },
        {
          name: 'Matches a hand-worked case',
          points: 13,
          tests: `import numpy as np
_base = np.arange(100.0)
_cur = np.concatenate([np.arange(0.0, 25.0), np.arange(0.0, 25.0), np.arange(50.0, 75.0), np.arange(50.0, 75.0)])
_v = psi(_base, _cur, bins=4)
_want = 2 * (0.5 - 0.25) * np.log(0.5 / 0.25) + 2 * (1e-4 - 0.25) * np.log(1e-4 / 0.25)
assert abs(_v - _want) < 1e-9, f"expected {_want:.6f}, got {_v:.6f}"
_v2 = psi(_base, _cur, bins=4, eps=1e-2)
assert abs(_v2 - (2 * 0.25 * np.log(2) + 2 * (1e-2 - 0.25) * np.log(1e-2 / 0.25))) < 1e-9, "eps is a parameter"
`,
        },
        {
          name: 'Out-of-range values and growing shift',
          points: 11,
          tests: `import numpy as np
_rng = np.random.default_rng(1)
_x = _rng.normal(0, 1, 10_000)
_far = psi(_x, np.full(500, 99.0))
assert np.isfinite(_far) and _far > 5, f"values beyond the baseline range fall in the last bin, got {_far}"
_s = [psi(_x, _rng.normal(m, 1, 10_000)) for m in (0.1, 0.5, 1.0)]
assert _s[0] < _s[1] < _s[2], f"PSI should grow with the shift, got {_s}"
assert _s[0] < 0.1 and _s[2] > 0.25, "a 1-sigma shift is above the usual 0.25 alarm level"
`,
        },
      ],
    },
    {
      id: 'scr-dops-split',
      title: 'Group-aware train/test split',
      domain: 'dataops',
      brief: `Rows from the same patient must not sit on both sides of a split, or the test score is inflated.

Write \`group_split(groups, test_frac, seed=0)\`. \`groups\` gives each row's group id. Shuffle the distinct group ids (sorted first, then shuffled with \`random.Random(seed)\`), then move whole groups into the test set, in that order, until the test set holds at least \`test_frac\` of all rows. At least one group stays in training whenever there are two or more groups.

Return \`(train_idx, test_idx)\`: two sorted lists of row indices.`,
      starter: `import random

def group_split(groups, test_frac, seed=0):
    ${NOT_DONE}
`,
      solution: `import random

def group_split(groups, test_frac, seed=0):
    ids = sorted(set(groups))
    random.Random(seed).shuffle(ids)
    counts = {}
    for g in groups:
        counts[g] = counts.get(g, 0) + 1
    target = test_frac * len(groups)
    test_groups = set()
    n_test = 0
    for g in ids:
        if n_test >= target or len(test_groups) >= len(ids) - 1:
            break
        test_groups.add(g)
        n_test += counts[g]
    train = [i for i, g in enumerate(groups) if g not in test_groups]
    test = [i for i, g in enumerate(groups) if g in test_groups]
    return train, test
`,
      checks: [
        {
          name: 'No group on both sides; every row used once',
          points: 14,
          tests: `import random
_r = random.Random(1)
_g = [f"p{_r.randrange(40)}" for _ in range(1000)]
_tr, _te = group_split(_g, 0.2, seed=3)
assert sorted(_tr + _te) == list(range(1000)), "every row appears exactly once"
assert _tr == sorted(_tr) and _te == sorted(_te), "return sorted indices"
assert not ({_g[i] for i in _tr} & {_g[i] for i in _te}), "a group is on both sides"
assert 200 <= len(_te) < 200 + max(_g.count(x) for x in set(_g)), f"test size {len(_te)} should just reach 20%"
`,
        },
        {
          name: 'Deterministic for a seed, different across seeds',
          points: 9,
          tests: `_g = [i // 5 for i in range(500)]
assert group_split(_g, 0.3, seed=7) == group_split(_g, 0.3, seed=7)
assert group_split(_g, 0.3, seed=7) != group_split(_g, 0.3, seed=8)
assert group_split(list(reversed(_g)), 0.3, seed=7)[1] == sorted(499 - i for i in group_split(_g, 0.3, seed=7)[1]), "the choice of groups must not depend on row order"
`,
        },
        {
          name: 'Edge cases',
          points: 10,
          tests: `_tr, _te = group_split(["a"] * 3 + ["b"] * 3, 1.0)
assert len(_tr) == 3 and len(_te) == 3, "one group always stays in training"
_tr, _te = group_split(["a", "b", "c"], 0.0)
assert _te == [] and _tr == [0, 1, 2], "test_frac 0 gives an empty test set"
_tr, _te = group_split(["only"] * 4, 0.5)
assert _tr == [0, 1, 2, 3] and _te == [], "a single group cannot be split"
assert group_split([], 0.5) == ([], [])
`,
        },
      ],
    },
  ],
};
