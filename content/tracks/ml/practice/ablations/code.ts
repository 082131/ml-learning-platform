// Code for ml/practice/ablations. Outputs were produced by running the program with CPython 3.13.16;
// src/lib/practice/ablation.test.ts checks the visual's TypeScript against them.
import { ablationExperiment, COMPONENTS, usedList, type AblationState } from '@/lib/practice/ablation';
import type { CodeExample } from '@/lib/types';

export const initial: AblationState = {
  used: Object.fromEntries(COMPONENTS.map((c) => [c, true])) as AblationState['used'],
  seeds: 5,
};

/** One state: the ablation bars, the slice bars, the code literals and the printed table. */
export const experiment = ablationExperiment('ablation', initial);

const st = (s: unknown) => s as AblationState;

export const ablationCode: CodeExample = {
  id: 'ablation-study',
  language: 'python',
  source: `import statistics

class LCG:
    def __init__(self, seed):
        self.state = seed % 2**32

    def random(self):
        self.state = (1664525 * self.state + 1013904223) % 2**32
        return self.state / 2**32

    def shuffle(self, items):
        for i in range(len(items) - 1, 0, -1):
            j = int(self.random() * (i + 1))
            items[i], items[j] = items[j], items[i]

REGIONS = ["city", "suburb", "rural"]
REGION_EFFECT = {"city": 0, "suburb": 2, "rural": 8}

def make_deliveries(n, seed):
    """Synthetic deliveries; the true rule is known so the ablation can be checked."""
    rng = LCG(seed)
    rows = []
    for order_id in range(n):
        km = 0.5 + 14.5 * rng.random()
        stops = int(rng.random() * 4)
        rain = 1 if rng.random() < 0.3 else 0
        region = REGIONS[int(rng.random() * 3)]
        noise = 8 * rng.random() - 4
        minutes = 6 + 2.5 * km + 3 * stops + 7 * rain + REGION_EFFECT[region] + noise
        rows.append({"order_id": order_id, "km": km, "stops": stops, "rain": rain,
                     "region": region, "minutes": minutes})
    return rows

COMPONENTS = {
    "distance": lambda r: [r["km"]],
    "stops": lambda r: [r["stops"]],
    "rain": lambda r: [r["rain"]],
    "region": lambda r: [r["region"] == "suburb", r["region"] == "rural"],
    "order_id": lambda r: [r["order_id"] / 100],
}

def features(row, used):
    x = [1.0]
    for name in used:
        x += [float(v) for v in COMPONENTS[name](row)]
    return x

def solve(a, b):
    """Gaussian elimination with partial pivoting: returns w with a @ w = b."""
    n = len(b)
    m = [row[:] + [b[i]] for i, row in enumerate(a)]
    for col in range(n):
        pivot = max(range(col, n), key=lambda r: abs(m[r][col]))
        m[col], m[pivot] = m[pivot], m[col]
        for r in range(col + 1, n):
            f = m[r][col] / m[col][col]
            for c in range(col, n + 1):
                m[r][c] -= f * m[col][c]
    w = [0.0] * n
    for r in range(n - 1, -1, -1):
        s = m[r][n]
        for c in range(r + 1, n):
            s -= m[r][c] * w[c]
        w[r] = s / m[r][r]
    return w

def fit(rows, used):
    xs = [features(r, used) for r in rows]
    k = len(xs[0])
    xtx = [[0.0] * k for _ in range(k)]
    xty = [0.0] * k
    for x, r in zip(xs, rows):
        for i in range(k):
            xty[i] += x[i] * r["minutes"]
            for j in range(k):
                xtx[i][j] += x[i] * x[j]
    return solve(xtx, xty)

def predict(w, row, used):
    total = 0.0
    for wi, xi in zip(w, features(row, used)):
        total += wi * xi
    return total

def val_errors(rows, used, seed):
    rng = LCG(seed)
    order = list(range(len(rows)))
    rng.shuffle(order)
    n_val = len(rows) // 4
    val = [rows[i] for i in order[:n_val]]
    train = [rows[i] for i in order[n_val:]]
    w = fit(train, used)
    return [(r, abs(predict(w, r, used) - r["minutes"])) for r in val]

def mae(errors):
    total = 0.0
    for _, e in errors:
        total += e
    return total / len(errors)

rows = make_deliveries(200, seed=7)
baseline = {{baseline}}
seeds = range({{seeds}})

print(f"{'model':<14} val MAE over {len(seeds)} seeds")
for removed in [None] + baseline:
    used = [c for c in baseline if c != removed]
    scores = [mae(val_errors(rows, used, s)) for s in seeds]
    name = "baseline" if removed is None else f"- {removed}"
    spread = statistics.stdev(scores) if len(scores) > 1 else 0.0
    print(f"{name:<14} {statistics.mean(scores):.3f} ± {spread:.3f}")

errors = val_errors(rows, baseline, seed=0)
for region in REGIONS:
    part = [e for r, e in errors if r["region"] == region]
    print(f"{region:<6} MAE {sum(part) / len(part):.3f} on {len(part)} deliveries (seed 0)")`,
  slots: {
    baseline: (s) =>
      `[${usedList(st(s))
        .map((c) => `"${c}"`)
        .join(', ')}]`,
    seeds: (s) => String(st(s).seeds),
  },
  annotations: [
    {
      id: 'truth',
      range: { line: 29 },
      kind: 'math',
      title: 'The true rule (known only because the data is synthetic)',
      what: 'Minutes grow with distance, stops, rain and region; order_id plays no part.',
      why: 'With real data you never see this line. Here it lets you check what the ablation says against the truth.',
    },
    {
      id: 'components',
      range: { line: 34 },
      kind: 'variable',
      title: 'Components: the parts you can switch off',
      what: 'Each name maps to the feature columns it adds. region is one-hot encoded (suburb, rural; city is the reference).',
      why: 'An ablation removes one whole component at a time, so each component must be one switch.',
    },
    {
      id: 'order-id',
      range: { line: 39 },
      kind: 'variable',
      title: 'A feature that should not help',
      what: 'The order number, scaled. It carries no information about delivery time.',
      why: 'Real feature sets contain such columns. The ablation should find that removing it changes nothing beyond noise.',
    },
    {
      id: 'solve',
      range: { line: 48 },
      kind: 'function',
      title: 'Least squares by Gaussian elimination',
      what: 'Solves the normal equations (XᵀX) w = Xᵀy for the weights w.',
      why: 'A deterministic fit: differences between ablation rows come from the components and the split, not from training noise.',
    },
    {
      id: 'split',
      range: { line: 85 },
      kind: 'function',
      title: 'One seeded split per evaluation',
      what: 'Holds out a quarter of the rows (chosen by the seed), fits on the rest, returns each validation row with its absolute error.',
      why: 'Every model in the table is scored on the same seeds, so each comparison is paired.',
    },
    {
      id: 'baseline',
      range: { line: 102 },
      kind: 'parameter',
      title: 'The baseline model',
      what: 'The components included in the reference model, filled from the experiment’s selects.',
      why: 'Every ablation row is this baseline minus one component.',
    },
    {
      id: 'seeds',
      range: { line: 103 },
      kind: 'parameter',
      title: 'How many splits per model',
      what: 'Each model is trained and scored once per seed.',
      why: 'The spread over seeds is the noise floor: a removal that changes the MAE by less than that is not a finding.',
    },
    {
      id: 'leave-one-out',
      range: { line: 107 },
      kind: 'syntax',
      title: 'Remove exactly one component',
      what: 'The baseline without `removed` (or the full baseline when removed is None).',
      why: 'Changing one thing at a time is what lets you attribute the difference to that thing.',
    },
    {
      id: 'spread',
      range: { line: 110 },
      kind: 'function',
      title: 'Sample standard deviation over seeds',
      what: 'statistics.stdev of the per-seed scores (0 when there is only one seed).',
      why: 'Reported next to the mean so a reader can tell a real effect from noise.',
    },
    {
      id: 'slices',
      range: { line: 115 },
      kind: 'syntax',
      title: 'Error analysis: group errors by a slice',
      what: 'Keeps the validation errors of one region.',
      why: 'An average hides where a model fails. A slice with a much larger error points at a missing feature or a data problem there.',
    },
  ],
};

export const ablationRunner: CodeExample = {
  id: 'ablation-runner',
  language: 'python',
  run: 'pyodide',
  source: `import statistics

class LCG:
    def __init__(self, seed):
        self.state = seed % 2**32

    def random(self):
        self.state = (1664525 * self.state + 1013904223) % 2**32
        return self.state / 2**32

    def shuffle(self, items):
        for i in range(len(items) - 1, 0, -1):
            j = int(self.random() * (i + 1))
            items[i], items[j] = items[j], items[i]

REGIONS = ["city", "suburb", "rural"]
REGION_EFFECT = {"city": 0, "suburb": 2, "rural": 8}

def make_deliveries(n, seed):
    """Synthetic deliveries; the true rule is known so the ablation can be checked."""
    rng = LCG(seed)
    rows = []
    for order_id in range(n):
        km = 0.5 + 14.5 * rng.random()
        stops = int(rng.random() * 4)
        rain = 1 if rng.random() < 0.3 else 0
        region = REGIONS[int(rng.random() * 3)]
        noise = 8 * rng.random() - 4
        minutes = 6 + 2.5 * km + 3 * stops + 7 * rain + REGION_EFFECT[region] + noise
        rows.append({"order_id": order_id, "km": km, "stops": stops, "rain": rain,
                     "region": region, "minutes": minutes})
    return rows

COMPONENTS = {
    "distance": lambda r: [r["km"]],
    "stops": lambda r: [r["stops"]],
    "rain": lambda r: [r["rain"]],
    "region": lambda r: [r["region"] == "suburb", r["region"] == "rural"],
    "order_id": lambda r: [r["order_id"] / 100],
}

def features(row, used):
    x = [1.0]
    for name in used:
        x += [float(v) for v in COMPONENTS[name](row)]
    return x

def solve(a, b):
    """Gaussian elimination with partial pivoting: returns w with a @ w = b."""
    n = len(b)
    m = [row[:] + [b[i]] for i, row in enumerate(a)]
    for col in range(n):
        pivot = max(range(col, n), key=lambda r: abs(m[r][col]))
        m[col], m[pivot] = m[pivot], m[col]
        for r in range(col + 1, n):
            f = m[r][col] / m[col][col]
            for c in range(col, n + 1):
                m[r][c] -= f * m[col][c]
    w = [0.0] * n
    for r in range(n - 1, -1, -1):
        s = m[r][n]
        for c in range(r + 1, n):
            s -= m[r][c] * w[c]
        w[r] = s / m[r][r]
    return w

def fit(rows, used):
    xs = [features(r, used) for r in rows]
    k = len(xs[0])
    xtx = [[0.0] * k for _ in range(k)]
    xty = [0.0] * k
    for x, r in zip(xs, rows):
        for i in range(k):
            xty[i] += x[i] * r["minutes"]
            for j in range(k):
                xtx[i][j] += x[i] * x[j]
    return solve(xtx, xty)

def predict(w, row, used):
    total = 0.0
    for wi, xi in zip(w, features(row, used)):
        total += wi * xi
    return total

def val_errors(rows, used, seed):
    rng = LCG(seed)
    order = list(range(len(rows)))
    rng.shuffle(order)
    n_val = len(rows) // 4
    val = [rows[i] for i in order[:n_val]]
    train = [rows[i] for i in order[n_val:]]
    w = fit(train, used)
    return [(r, abs(predict(w, r, used) - r["minutes"])) for r in val]

def mae(errors):
    total = 0.0
    for _, e in errors:
        total += e
    return total / len(errors)

rows = make_deliveries(200, seed=7)
baseline = ["distance", "stops", "rain", "region", "order_id"]
seeds = range(5)

print(f"{'model':<14} val MAE over {len(seeds)} seeds")
for removed in [None] + baseline:
    used = [c for c in baseline if c != removed]
    scores = [mae(val_errors(rows, used, s)) for s in seeds]
    name = "baseline" if removed is None else f"- {removed}"
    spread = statistics.stdev(scores) if len(scores) > 1 else 0.0
    print(f"{name:<14} {statistics.mean(scores):.3f} ± {spread:.3f}")

errors = val_errors(rows, baseline, seed=0)
for region in REGIONS:
    part = [e for r, e in errors if r["region"] == region]
    print(f"{region:<6} MAE {sum(part) / len(part):.3f} on {len(part)} deliveries (seed 0)")`,
  annotations: [],
  expectedOutput: `model          val MAE over 5 seeds
baseline       2.094 ± 0.182
- distance     9.679 ± 0.977
- stops        3.602 ± 0.396
- rain         3.259 ± 0.391
- region       3.617 ± 0.358
- order_id     2.086 ± 0.165
city   MAE 2.303 on 14 deliveries (seed 0)
suburb MAE 2.062 on 17 deliveries (seed 0)
rural  MAE 1.982 on 19 deliveries (seed 0)`,
};
