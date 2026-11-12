import type { HandsOnTask } from '@/lib/exam/types';

// Hands-on part of the ML Data Operations exam: 5 tasks, 100 points. Standard-library Python only, so every task
// runs in the browser. Every solution passes all its checks and every starter fails them
// (content/exams/exams-python.test.ts).

const NOT_DONE = 'raise NotImplementedError';

export const tasks: HandsOnTask[] = [
  {
    id: 'dataops-h1',
    title: 'Annotator agreement: weighted kappa and Fleiss',
    domain: 'label',
    brief: `Write two agreement functions without libraries.

\`cohen_kappa(a, b, weights=None)\` takes two equal-length, non-empty label lists (raise \`ValueError\` otherwise). The categories are the sorted union of both lists, at positions \`0..k-1\`. With \`weights=None\` a disagreement costs 1 and an agreement 0. With \`'linear'\` the cost of categories \`i\` and \`j\` is \`|i - j| / (k - 1)\`; with \`'quadratic'\` it is that value squared. Return \`1 - observed_cost / expected_cost\`, where the expected cost uses the product of the two annotators' marginal shares. If only one category occurs, return \`1.0\`.

\`fleiss_kappa(counts)\` takes one row per item with the number of raters who chose each category. Every row must have the same total of at least 2 (raise \`ValueError\` otherwise). Return Fleiss' kappa: \`(P̄ - Pe) / (1 - Pe)\`, where \`P̄\` is the mean per-item agreement \`(Σ c² - n) / (n (n - 1))\` and \`Pe\` is the sum of squared overall category shares.`,
    starter: `def cohen_kappa(a, b, weights=None):
    ${NOT_DONE}

def fleiss_kappa(counts):
    ${NOT_DONE}
`,
    solution: `def cohen_kappa(a, b, weights=None):
    if len(a) != len(b) or not a:
        raise ValueError('need two equal-length, non-empty label lists')
    cats = sorted(set(a) | set(b))
    k = len(cats)
    if k == 1:
        return 1.0
    idx = {c: i for i, c in enumerate(cats)}
    n = len(a)
    obs = [[0.0] * k for _ in range(k)]
    for x, y in zip(a, b):
        obs[idx[x]][idx[y]] += 1 / n
    ra = [sum(r) for r in obs]
    rb = [sum(obs[i][j] for i in range(k)) for j in range(k)]
    def w(i, j):
        if weights is None:
            return 0.0 if i == j else 1.0
        d = abs(i - j) / (k - 1)
        return d if weights == 'linear' else d * d
    do = sum(w(i, j) * obs[i][j] for i in range(k) for j in range(k))
    de = sum(w(i, j) * ra[i] * rb[j] for i in range(k) for j in range(k))
    return 1.0 - do / de

def fleiss_kappa(counts):
    n = sum(counts[0])
    if n < 2 or any(sum(r) != n for r in counts):
        raise ValueError('every item needs the same number of ratings (at least 2)')
    N = len(counts)
    k = len(counts[0])
    p = [sum(r[j] for r in counts) / (N * n) for j in range(k)]
    P = [(sum(c * c for c in r) - n) / (n * (n - 1)) for r in counts]
    pbar = sum(P) / N
    pe = sum(x * x for x in p)
    return (pbar - pe) / (1 - pe)
`,
    checks: [
      {
        name: 'Unweighted kappa corrects for chance',
        points: 7,
        tests: `_a = ['y'] * 50 + ['n'] * 50
_b = ['y'] * 40 + ['n'] * 10 + ['y'] * 10 + ['n'] * 40
assert abs(cohen_kappa(_a, _b) - 0.6) < 1e-9, cohen_kappa(_a, _b)
assert abs(cohen_kappa([1, 2, 3, 4, 5, 1, 2, 3], [1, 3, 3, 5, 4, 2, 2, 1]) - 0.2) < 1e-9
assert cohen_kappa(['x', 'x'], ['x', 'x']) == 1.0, "a single category means perfect agreement"
try:
    cohen_kappa([1, 2], [1])
    assert False, "unequal lengths must raise ValueError"
except ValueError:
    pass
`,
      },
      {
        name: 'Linear and quadratic weights credit near misses',
        points: 6,
        tests: `_a = [1, 2, 3, 4, 5, 1, 2, 3]
_b = [1, 3, 3, 5, 4, 2, 2, 1]
_lin = cohen_kappa(_a, _b, 'linear')
_quad = cohen_kappa(_a, _b, 'quadratic')
assert abs(_lin - 0.4893617) < 1e-6, _lin
assert abs(_quad - 0.7117117) < 1e-6, _quad
`,
      },
      {
        name: "Fleiss' kappa for many raters",
        points: 7,
        tests: `_k = fleiss_kappa([[3, 0, 0], [0, 3, 0], [1, 1, 1], [2, 1, 0], [0, 0, 3]])
assert abs(_k - 0.4932432) < 1e-6, _k
assert abs(fleiss_kappa([[2, 0], [0, 2], [2, 0], [1, 1]]) - 0.4666667) < 1e-6
try:
    fleiss_kappa([[3, 0], [1, 1]])
    assert False, "rows with different rater counts must raise ValueError"
except ValueError:
    pass
`,
      },
    ],
  },
  {
    id: 'dataops-h2',
    title: 'Weak supervision: labeling-function stats and votes',
    domain: 'label',
    brief: `\`L\` is a label matrix: one row per item, one column per labeling function, \`-1\` meaning abstain.

\`lf_summary(L)\` returns one dict per labeling function with three shares of all items: \`coverage\` (the function votes), \`overlap\` (it votes and at least one other function votes), and \`conflict\` (it votes and at least one other function votes a different label).

\`majority_vote(L)\` returns one label per item: the most common non-abstain vote, or \`-1\` when every function abstains or the top count is tied.

\`weighted_vote(L, accuracies, n_classes)\` works like a majority vote, but each function's vote counts \`ln(acc · (n_classes - 1) / (1 - acc))\`. Return the class with the highest total, or \`-1\` for no votes or a tie within \`1e-12\`.`,
    starter: `import math

def lf_summary(L):
    ${NOT_DONE}

def majority_vote(L):
    ${NOT_DONE}

def weighted_vote(L, accuracies, n_classes):
    ${NOT_DONE}
`,
    solution: `import math

def lf_summary(L):
    n = len(L)
    m = len(L[0]) if L else 0
    out = []
    for j in range(m):
        cov = ovl = con = 0
        for row in L:
            v = row[j]
            if v == -1:
                continue
            cov += 1
            others = [row[i] for i in range(m) if i != j and row[i] != -1]
            if others:
                ovl += 1
                if any(o != v for o in others):
                    con += 1
        out.append({'coverage': cov / n, 'overlap': ovl / n, 'conflict': con / n})
    return out

def majority_vote(L):
    out = []
    for row in L:
        votes = {}
        for v in row:
            if v != -1:
                votes[v] = votes.get(v, 0) + 1
        if not votes:
            out.append(-1)
            continue
        best = max(votes.values())
        top = [c for c, n in votes.items() if n == best]
        out.append(top[0] if len(top) == 1 else -1)
    return out

def weighted_vote(L, accuracies, n_classes):
    w = [math.log(a * (n_classes - 1) / (1 - a)) for a in accuracies]
    out = []
    for row in L:
        score = {}
        for j, v in enumerate(row):
            if v != -1:
                score[v] = score.get(v, 0.0) + w[j]
        if not score:
            out.append(-1)
            continue
        best = max(score.values())
        top = [c for c, s in score.items() if abs(s - best) < 1e-12]
        out.append(top[0] if len(top) == 1 else -1)
    return out
`,
    checks: [
      {
        name: 'Coverage, overlap and conflict per function',
        points: 8,
        tests: `_s = lf_summary([[1, 1, -1], [0, -1, -1], [-1, -1, -1], [1, 0, 1]])
_want = [(0.75, 0.5, 0.25), (0.5, 0.5, 0.25), (0.25, 0.25, 0.25)]
for _d, (_c, _o, _x) in zip(_s, _want):
    assert abs(_d['coverage'] - _c) < 1e-9 and abs(_d['overlap'] - _o) < 1e-9 and abs(_d['conflict'] - _x) < 1e-9, _s
`,
      },
      {
        name: 'Majority vote abstains on ties and empty rows',
        points: 7,
        tests: `assert majority_vote([[1, 1, -1], [0, -1, -1], [-1, -1, -1], [1, 0, 1]]) == [1, 0, -1, 1]
_m = majority_vote([[1, 0, -1], [2, 2, 0], [0, -1, 0]])
assert _m == [-1, 2, 0], _m
`,
      },
      {
        name: 'Accuracy-weighted vote overrules weak functions',
        points: 5,
        tests: `_w = weighted_vote([[1, 0, 0], [1, 0, -1], [-1, 1, 0], [-1, -1, -1]], [0.95, 0.6, 0.6], 2)
assert _w == [1, 1, -1, -1], _w
assert weighted_vote([[2, 1, 0]], [0.5, 0.7, 0.6], 3) == [1]
`,
      },
    ],
  },
  {
    id: 'dataops-h3',
    title: 'Confident learning: find likely label errors',
    domain: 'quality',
    brief: `\`labels\` holds the given class index of each example and \`probs\` its out-of-sample predicted probabilities (one list per example).

\`per_class_thresholds(labels, probs)\`: for each class \`j\`, the mean of \`probs[i][j]\` over examples labeled \`j\`. Raise \`ValueError\` if a class has no labeled examples.

An example's confident class is, among classes \`j\` with \`probs[i][j] >= threshold[j]\`, the one with the highest probability (lowest index on ties). If no class qualifies, the example has none.

\`confident_joint(labels, probs)\` returns a \`k × k\` count matrix \`C[given][confident]\`, skipping examples without a confident class.

\`find_label_issues(labels, probs)\` returns the indices of examples whose confident class exists and differs from the given label, ordered by self-confidence \`probs[i][labels[i]]\` ascending, then by index.`,
    starter: `def per_class_thresholds(labels, probs):
    ${NOT_DONE}

def confident_joint(labels, probs):
    ${NOT_DONE}

def find_label_issues(labels, probs):
    ${NOT_DONE}
`,
    solution: `def per_class_thresholds(labels, probs):
    k = len(probs[0])
    out = []
    for j in range(k):
        own = [p[j] for y, p in zip(labels, probs) if y == j]
        if not own:
            raise ValueError(f'class {j} has no labeled examples')
        out.append(sum(own) / len(own))
    return out

def _confident_class(p, t):
    cands = [j for j in range(len(p)) if p[j] >= t[j]]
    if not cands:
        return None
    return max(cands, key=lambda j: (p[j], -j))

def confident_joint(labels, probs):
    t = per_class_thresholds(labels, probs)
    k = len(t)
    C = [[0] * k for _ in range(k)]
    for y, p in zip(labels, probs):
        j = _confident_class(p, t)
        if j is not None:
            C[y][j] += 1
    return C

def find_label_issues(labels, probs):
    t = per_class_thresholds(labels, probs)
    issues = []
    for i, (y, p) in enumerate(zip(labels, probs)):
        j = _confident_class(p, t)
        if j is not None and j != y:
            issues.append(i)
    return sorted(issues, key=lambda i: (probs[i][labels[i]], i))
`,
    checks: [
      {
        name: 'Per-class thresholds are mean self-confidence',
        points: 6,
        tests: `_y = [0, 0, 0, 1, 1, 1, 2, 2]
_p = [[0.9, 0.05, 0.05], [0.6, 0.3, 0.1], [0.1, 0.8, 0.1], [0.2, 0.7, 0.1],
      [0.1, 0.5, 0.4], [0.05, 0.15, 0.8], [0.1, 0.1, 0.8], [0.3, 0.3, 0.4]]
_t = per_class_thresholds(_y, _p)
assert all(abs(x - w) < 1e-9 for x, w in zip(_t, [1.6 / 3, 1.35 / 3, 0.6])), _t
try:
    per_class_thresholds([0, 0], [[0.9, 0.1], [0.8, 0.2]])
    assert False, "a class with no labeled examples must raise ValueError"
except ValueError:
    pass
`,
      },
      {
        name: 'Confident joint counts given versus confident class',
        points: 7,
        tests: `_y = [0, 0, 0, 1, 1, 1, 2, 2]
_p = [[0.9, 0.05, 0.05], [0.6, 0.3, 0.1], [0.1, 0.8, 0.1], [0.2, 0.7, 0.1],
      [0.1, 0.5, 0.4], [0.05, 0.15, 0.8], [0.1, 0.1, 0.8], [0.3, 0.3, 0.4]]
_c = confident_joint(_y, _p)
assert _c == [[2, 1, 0], [0, 2, 1], [0, 0, 1]], _c
`,
      },
      {
        name: 'Label issues ranked by self-confidence',
        points: 7,
        tests: `_y = [0, 0, 0, 1, 1, 1, 2, 2]
_p = [[0.9, 0.05, 0.05], [0.6, 0.3, 0.1], [0.1, 0.8, 0.1], [0.2, 0.7, 0.1],
      [0.1, 0.5, 0.4], [0.05, 0.15, 0.8], [0.1, 0.1, 0.8], [0.3, 0.3, 0.4]]
_i = find_label_issues(_y, _p)
assert _i == [2, 5], _i
_y2 = [0, 0, 1, 1]
_p2 = [[0.2, 0.8], [0.9, 0.1], [0.7, 0.3], [0.1, 0.9]]
assert find_label_issues(_y2, _p2) == [0, 2], find_label_issues(_y2, _p2)
`,
      },
    ],
  },
  {
    id: 'dataops-h4',
    title: 'Content-addressed snapshots and stable splits',
    domain: 'version',
    brief: `Use \`hashlib.sha256\` throughout.

\`manifest(files)\` maps each path in \`files\` (path → bytes) to the hex digest of its content.

\`snapshot_id(man)\` returns the first 16 hex characters of the SHA-256 of the lines \`path<TAB>digest<NEWLINE>\`, sorted by path and concatenated, encoded as UTF-8. It must not depend on dict order.

\`diff(old, new)\` compares two manifests and returns \`{'added': [...], 'removed': [...], 'modified': [...]}\`, each a sorted list of paths.

\`assign_split(key, salt, test_percent)\` returns \`'test'\` when \`int(sha256(f'{salt}:{key}').hexdigest(), 16) % 100 < test_percent\`, else \`'train'\`.

\`split_rows(rows, key_field, salt, test_percent)\` splits a list of dicts by \`row[key_field]\` and returns \`{'train': [...], 'test': [...]}\` with rows in their original order. Splitting by a user key keeps all of a user's rows on one side.`,
    starter: `import hashlib

def manifest(files):
    ${NOT_DONE}

def snapshot_id(man):
    ${NOT_DONE}

def diff(old, new):
    ${NOT_DONE}

def assign_split(key, salt, test_percent):
    ${NOT_DONE}

def split_rows(rows, key_field, salt, test_percent):
    ${NOT_DONE}
`,
    solution: `import hashlib

def manifest(files):
    return {path: hashlib.sha256(data).hexdigest() for path, data in files.items()}

def snapshot_id(man):
    lines = ''.join(f'{p}\\t{h}\\n' for p, h in sorted(man.items()))
    return hashlib.sha256(lines.encode()).hexdigest()[:16]

def diff(old, new):
    return {
        'added': sorted(p for p in new if p not in old),
        'removed': sorted(p for p in old if p not in new),
        'modified': sorted(p for p in new if p in old and new[p] != old[p]),
    }

def assign_split(key, salt, test_percent):
    h = int(hashlib.sha256(f'{salt}:{key}'.encode()).hexdigest(), 16)
    return 'test' if h % 100 < test_percent else 'train'

def split_rows(rows, key_field, salt, test_percent):
    out = {'train': [], 'test': []}
    for r in rows:
        out[assign_split(r[key_field], salt, test_percent)].append(r)
    return out
`,
    checks: [
      {
        name: 'Manifest and snapshot ID are content-addressed',
        points: 6,
        tests: `_m = manifest({'b.csv': b'x,y\\n1,2\\n', 'a.csv': b'hello'})
assert _m['a.csv'] == '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824', _m
assert snapshot_id(_m) == '521d433cb67938d0', snapshot_id(_m)
assert snapshot_id(dict(reversed(list(_m.items())))) == '521d433cb67938d0', "the ID must not depend on dict order"
`,
      },
      {
        name: 'Diff reports added, removed and modified paths',
        points: 7,
        tests: `_old = {'a': '1', 'b': '2', 'c': '3'}
_new = {'a': '1', 'b': '9', 'd': '4', 'e': '5'}
assert diff(_old, _new) == {'added': ['d', 'e'], 'removed': ['c'], 'modified': ['b']}, diff(_old, _new)
assert diff(_old, dict(_old)) == {'added': [], 'removed': [], 'modified': []}
`,
      },
      {
        name: 'Hash split is stable and keeps users together',
        points: 7,
        tests: `_keys = ['u%d' % i for i in range(1, 11)]
_got = [assign_split(k, 'v1', 20) for k in _keys]
assert _got == ['train', 'test', 'train', 'train', 'train', 'train', 'test', 'train', 'train', 'train'], _got
_share = sum(assign_split(str(i), 's', 20) == 'test' for i in range(2000)) / 2000
assert 0.16 < _share < 0.24, _share
_rows = [{'user': u, 'n': i} for i, u in enumerate(['u2', 'u1', 'u2', 'u7', 'u1'])]
_s = split_rows(_rows, 'user', 'v1', 20)
assert [r['n'] for r in _s['test']] == [0, 2, 3], _s
assert [r['n'] for r in _s['train']] == [1, 4], _s
`,
      },
    ],
  },
  {
    id: 'dataops-h5',
    title: 'Drift-triggered retraining with hysteresis',
    domain: 'pipeline',
    brief: `\`psi(expected, actual, eps=1e-4)\` takes two lists of bin shares. Clip each share to at least \`eps\`, then return \`Σ (a - e) · ln(a / e)\`.

\`RetrainPolicy(on, off, cooldown_days, min_rows)\` decides when a drift metric should trigger retraining. \`observe(day, value, rows)\` is called once per day in order and returns \`True\` on days that trigger a retrain.

- Days with \`rows < min_rows\` are ignored entirely: return \`False\` and change nothing.
- The policy enters the alerting state when \`value >= on\` and leaves it only when \`value < off\` (hysteresis). Entering the state creates a pending retrain; leaving it cancels a pending one.
- A pending retrain fires on the first eligible day: no retrain has happened yet, or \`day - last_retrain_day >= cooldown_days\`.
- Staying in the alerting state does not create a new pending retrain.`,
    starter: `import math

def psi(expected, actual, eps=1e-4):
    ${NOT_DONE}

class RetrainPolicy:
    def __init__(self, on, off, cooldown_days, min_rows):
        ${NOT_DONE}

    def observe(self, day, value, rows):
        ${NOT_DONE}
`,
    solution: `import math

def psi(expected, actual, eps=1e-4):
    total = 0.0
    for e, a in zip(expected, actual):
        e = max(e, eps)
        a = max(a, eps)
        total += (a - e) * math.log(a / e)
    return total

class RetrainPolicy:
    def __init__(self, on, off, cooldown_days, min_rows):
        self.on, self.off = on, off
        self.cooldown, self.min_rows = cooldown_days, min_rows
        self.alerting = False
        self.pending = False
        self.last = None

    def observe(self, day, value, rows):
        if rows < self.min_rows:
            return False
        if not self.alerting and value >= self.on:
            self.alerting = True
            self.pending = True
        elif self.alerting and value < self.off:
            self.alerting = False
            self.pending = False
        if self.pending and (self.last is None or day - self.last >= self.cooldown):
            self.pending = False
            self.last = day
            return True
        return False
`,
    checks: [
      {
        name: 'PSI with epsilon smoothing',
        points: 6,
        tests: `assert abs(psi([0.5, 0.5], [0.7, 0.3]) - 0.16946) < 1e-4, psi([0.5, 0.5], [0.7, 0.3])
assert abs(psi([0.5, 0.5, 0.0], [0.5, 0.4, 0.1]) - 0.71236) < 1e-4, "an empty baseline bin must be clipped, not crash"
assert psi([0.2, 0.8], [0.2, 0.8]) == 0.0
`,
      },
      {
        name: 'Hysteresis: one retrain per drift episode',
        points: 7,
        tests: `_p = RetrainPolicy(0.25, 0.1, cooldown_days=0, min_rows=0)
_got = [_p.observe(d, v, 1000) for d, v in enumerate([0.05, 0.3, 0.2, 0.28, 0.12, 0.09, 0.26])]
assert _got == [False, True, False, False, False, False, True], _got
`,
      },
      {
        name: 'Cooldown defers retrains; small days are ignored',
        points: 7,
        tests: `_p = RetrainPolicy(0.25, 0.1, cooldown_days=7, min_rows=500)
_seq = [(0, 0.3, 1000), (1, 0.05, 1000), (2, 0.4, 1000), (3, 0.4, 100), (5, 0.3, 1000),
        (9, 0.3, 1000), (10, 0.02, 1000), (12, 0.5, 200), (13, 0.5, 900)]
_got = [_p.observe(*s) for s in _seq]
assert _got == [True, False, False, False, False, True, False, False, False], _got
`,
      },
    ],
  },
];
