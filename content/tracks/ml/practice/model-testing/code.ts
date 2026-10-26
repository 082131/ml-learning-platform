// Code for ml/practice/model-testing. Outputs were produced by running the programs with CPython 3.13.16
// (and pytest 9.1.1); src/lib/practice/modelTesting.test.ts checks the visual's TypeScript against them.
import { pyFloat } from '@/lib/practice/pyFormat';
import { testingExperiment, type TestingState } from '@/lib/practice/modelTesting';
import type { CodeExample } from '@/lib/types';

export const initial: TestingState = { dataFault: 'none', servingFault: 'none', maxMae: 2.5, maxSliceMae: 3 };

/** One state: the pipeline diagram, the check list, the code literals and the readout. */
export const experiment = testingExperiment('model-testing', initial);

const st = (s: unknown) => s as TestingState;

export const pipelineCode: CodeExample = {
  id: 'model-testing-pipeline',
  language: 'python',
  source: `import math

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

def inject_data_fault(rows, fault):
    if fault == "missing_km":
        for r in rows[10:60:10]:
            r["km"] = None
    elif fault == "km_in_meters":
        for r in rows[150:]:
            r["km"] = r["km"] * 1000
    elif fault == "leaked_label":
        for r in rows:
            r["logged_minutes"] = int(r["minutes"])
    return rows

def numeric_columns(rows):
    return [c for c in rows[0] if c not in ("order_id", "region", "minutes")]

def features(row, columns):
    return [1.0] + [float(row[c]) for c in columns] + [
        float(row["region"] == "suburb"), float(row["region"] == "rural")]

def solve(a, b):
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

def fit(rows, columns):
    xs = [features(r, columns) for r in rows]
    k = len(xs[0])
    xtx = [[0.0] * k for _ in range(k)]
    xty = [0.0] * k
    for x, r in zip(xs, rows):
        for i in range(k):
            xty[i] += x[i] * r["minutes"]
            for j in range(k):
                xtx[i][j] += x[i] * x[j]
    return solve(xtx, xty)

def serve(w, request, columns, fault):
    """The prediction code that runs in production."""
    request = dict(request)
    if fault == "stops_dropped":
        request["stops"] = 0
    if fault == "region_ignored":
        request["region"] = "city"
    total = 0.0
    for wi, xi in zip(w, features(request, columns)):
        total += wi * xi
    return total

def mean(values):
    total = 0.0
    for v in values:
        total += v
    return total / len(values)

def corr(xs, ys):
    mx, my = mean(xs), mean(ys)
    sxy = sxx = syy = 0.0
    for x, y in zip(xs, ys):
        sxy += (x - mx) * (y - my)
        sxx += (x - mx) * (x - mx)
        syy += (y - my) * (y - my)
    return sxy / math.sqrt(sxx * syy)

def schema_errors(rows):
    bad = []
    for r in rows:
        km = r["km"]
        if not isinstance(km, (int, float)) or not 0 < km <= 50:
            bad.append(f"order {r['order_id']}: km={km}")
        elif r["stops"] not in range(11) or r["rain"] not in (0, 1) or r["region"] not in REGIONS:
            bad.append(f"order {r['order_id']}: bad category")
    return bad

def bootstrap_mae(errors, resamples, seed):
    rng = LCG(seed)
    means = []
    for _ in range(resamples):
        sample = [errors[int(rng.random() * len(errors))] for _ in errors]
        means.append(mean(sample))
    means.sort()
    return means[int(0.025 * resamples)], means[int(0.975 * resamples) - 1]

DATA_FAULT = {{dataFault}}
SERVING_FAULT = {{servingFault}}
MAX_MAE = {{maxMae}}
MAX_SLICE_MAE = {{maxSliceMae}}

rows = inject_data_fault(make_deliveries(200, seed=7), DATA_FAULT)
order = list(range(len(rows)))
LCG(0).shuffle(order)
val = [rows[i] for i in order[:50]]
train = [rows[i] for i in order[50:]]
if DATA_FAULT == "train_on_all":
    train = train + val
columns = numeric_columns(rows)
results = []

def check(stage, name, passed, detail):
    results.append((stage, name, passed))
    print(f"{stage:<6} {name:<14} {'PASS' if passed else 'FAIL'}  {detail}")
    return passed

def run_pipeline():
    bad = schema_errors(rows)
    if not check("data", "schema", not bad, f"{len(bad)} bad rows" + (f", first {bad[0]}" if bad else "")):
        return
    y = [r["minutes"] for r in rows]
    top = max(columns, key=lambda c: abs(corr([r[c] for r in rows], y)))
    top_corr = abs(corr([r[top] for r in rows], y))
    if not check("data", "label leak", top_corr < 0.95, f"max |corr| {top_corr:.3f} ({top})"):
        return
    shared = {r["order_id"] for r in train} & {r["order_id"] for r in val}
    if not check("data", "split overlap", not shared, f"{len(shared)} orders in both train and val"):
        return
    w = fit(train, columns)
    preds = [serve(w, r, columns, SERVING_FAULT) for r in val]
    finite = sum(1 for p in preds if math.isfinite(p))
    check("train", "smoke", finite == len(val), f"{finite}/{len(val)} finite predictions")
    base = {"km": 5.0, "stops": 1, "rain": 0, "region": "city"}
    p0 = serve(w, base, columns, SERVING_FAULT)
    def effect(**change):
        return serve(w, {**base, **change}, columns, SERVING_FAULT) - p0
    d = effect(km=6.0)
    check("behav", "+1 km", 1 <= d <= 5, f"{d:+.2f} min (expect 1 to 5)")
    d = effect(stops=2)
    check("behav", "+1 stop", d > 0, f"{d:+.2f} min (expect > 0)")
    d = effect(rain=1)
    check("behav", "rain", d > 0, f"{d:+.2f} min (expect > 0)")
    d = effect(region="rural")
    check("behav", "rural vs city", d > 0, f"{d:+.2f} min (expect > 0)")
    errors = [abs(p - r["minutes"]) for p, r in zip(preds, val)]
    lo, hi = bootstrap_mae(errors, 1000, seed=1)
    m = mean(errors)
    check("gate", "val MAE", m <= MAX_MAE, f"{m:.2f}, 95% CI {lo:.2f} to {hi:.2f} (max {MAX_MAE})")
    for region in REGIONS:
        part = [e for e, r in zip(errors, val) if r["region"] == region]
        sm = mean(part)
        check("gate", f"slice {region}", sm <= MAX_SLICE_MAE, f"{sm:.2f} on {len(part)} (max {MAX_SLICE_MAE})")

run_pipeline()
failed = [f"{s} {n}" for s, n, ok in results if not ok]
if not failed:
    print("RELEASE: ship")
else:
    print(f"RELEASE: blocked by {', '.join(failed)}")`,
  slots: {
    dataFault: (s) => `"${st(s).dataFault}"`,
    servingFault: (s) => `"${st(s).servingFault}"`,
    maxMae: (s) => pyFloat(st(s).maxMae),
    maxSliceMae: (s) => pyFloat(st(s).maxSliceMae),
  },
  annotations: [
    {
      id: 'fault',
      range: {
        line: 33,
      },
      kind: 'function',
      title: 'Faults you can inject into the data',
      what: 'Five real failure modes: missing values, a batch in the wrong unit, a column that is the label in disguise, and (below) validation rows reused in training.',
      why: 'Tests are only convincing if you have seen them fail. Injecting known faults checks that each test catches what it claims to.',
    },
    {
      id: 'columns',
      range: {
        line: 45,
      },
      kind: 'function',
      title: 'Every numeric column becomes a feature',
      what: 'Takes all columns except the ID, the region (one-hot encoded separately) and the label.',
      why: 'Convenient and common, and exactly how a leaked column ends up in the model without anyone choosing it.',
    },
    {
      id: 'serve',
      range: {
        line: 82,
      },
      kind: 'function',
      title: 'The prediction code that runs in production',
      what: 'Builds the features from a request and applies the weights. The serving fault simulates a request that is missing a field.',
      why: 'Training and serving often build features in different code. When they disagree (training-serving skew), offline metrics look fine and production predictions are wrong.',
    },
    {
      id: 'corr',
      range: {
        line: 100,
      },
      kind: 'function',
      title: 'Pearson correlation',
      what: 'Covariance of x and y divided by the product of their standard deviations; between −1 and 1.',
      why: 'A feature that predicts the label almost perfectly (|corr| near 1) is usually the label itself, recorded after the fact.',
    },
    {
      id: 'schema',
      range: {
        line: 109,
      },
      kind: 'function',
      title: 'Schema and range check',
      what: 'Every row must have a numeric distance in (0, 50] km, a stop count from 0 to 10, rain 0 or 1, and a known region.',
      why: 'Cheap, fast and catches most broken data before it costs a training run.',
    },
    {
      id: 'bootstrap',
      range: {
        line: 119,
      },
      kind: 'function',
      title: 'Bootstrap interval for the MAE',
      what: 'Resamples the 50 validation errors with replacement 1000 times and takes the 2.5th and 97.5th percentiles of the resampled means.',
      why: 'A metric on 50 rows is uncertain. The interval shows how much, so a gate is not decided by luck.',
    },
    {
      id: 'dataFault',
      range: {
        line: 128,
      },
      kind: 'parameter',
      title: 'Data fault',
      what: 'Filled from the experiment.',
      why: 'Each fault should be stopped by one specific data check.',
    },
    {
      id: 'servingFault',
      range: {
        line: 129,
      },
      kind: 'parameter',
      title: 'Serving fault',
      what: 'Filled from the experiment.',
      why: 'These faults only show up in tests that call the serving code.',
    },
    {
      id: 'gates',
      range: {
        line: 130,
      },
      kind: 'parameter',
      title: 'Release thresholds',
      what: 'The largest acceptable validation MAE, overall and per region, in minutes.',
      why: 'Agreed before looking at the new model, so the gate is not moved to fit the result.',
    },
    {
      id: 'overlap',
      range: {
        line: 139,
      },
      kind: 'syntax',
      title: 'Training on the validation rows',
      what: 'The fault adds the validation rows to the training set.',
      why: 'Then the validation score measures memory, not generalization, and looks better than the model is.',
    },
    {
      id: 'stop',
      range: {
        line: 151,
      },
      kind: 'syntax',
      title: 'Stop at the first failed data check',
      what: 'Training and every later check are skipped.',
      why: 'Training on broken data wastes compute and produces numbers nobody should read.',
    },
    {
      id: 'leak',
      range: {
        line: 155,
      },
      kind: 'syntax',
      title: 'Leak check',
      what: 'Fails when any feature has |corr| ≥ 0.95 with the label.',
      why: 'The threshold is a judgment call: high enough that honest strong features (km has 0.869) pass.',
    },
    {
      id: 'direction',
      range: {
        line: 164,
      },
      kind: 'variable',
      title: 'Directional behavior tests',
      what: 'One reference request and four single changes. Each test checks the sign (and for distance, the size) of the change in prediction.',
      why: 'These encode domain knowledge the metric does not: a model can have a good MAE and still say rain makes deliveries faster.',
    },
    {
      id: 'slices',
      range: {
        line: 180,
      },
      kind: 'syntax',
      title: 'Slice gates',
      what: 'The same MAE gate, per region.',
      why: 'An average can pass while one group of customers gets much worse predictions.',
    },
  ],
};

export const pipelineRunner: CodeExample = {
  id: 'model-testing-runner',
  language: 'python',
  run: 'pyodide',
  source: `import math

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

def inject_data_fault(rows, fault):
    if fault == "missing_km":
        for r in rows[10:60:10]:
            r["km"] = None
    elif fault == "km_in_meters":
        for r in rows[150:]:
            r["km"] = r["km"] * 1000
    elif fault == "leaked_label":
        for r in rows:
            r["logged_minutes"] = int(r["minutes"])
    return rows

def numeric_columns(rows):
    return [c for c in rows[0] if c not in ("order_id", "region", "minutes")]

def features(row, columns):
    return [1.0] + [float(row[c]) for c in columns] + [
        float(row["region"] == "suburb"), float(row["region"] == "rural")]

def solve(a, b):
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

def fit(rows, columns):
    xs = [features(r, columns) for r in rows]
    k = len(xs[0])
    xtx = [[0.0] * k for _ in range(k)]
    xty = [0.0] * k
    for x, r in zip(xs, rows):
        for i in range(k):
            xty[i] += x[i] * r["minutes"]
            for j in range(k):
                xtx[i][j] += x[i] * x[j]
    return solve(xtx, xty)

def serve(w, request, columns, fault):
    """The prediction code that runs in production."""
    request = dict(request)
    if fault == "stops_dropped":
        request["stops"] = 0
    if fault == "region_ignored":
        request["region"] = "city"
    total = 0.0
    for wi, xi in zip(w, features(request, columns)):
        total += wi * xi
    return total

def mean(values):
    total = 0.0
    for v in values:
        total += v
    return total / len(values)

def corr(xs, ys):
    mx, my = mean(xs), mean(ys)
    sxy = sxx = syy = 0.0
    for x, y in zip(xs, ys):
        sxy += (x - mx) * (y - my)
        sxx += (x - mx) * (x - mx)
        syy += (y - my) * (y - my)
    return sxy / math.sqrt(sxx * syy)

def schema_errors(rows):
    bad = []
    for r in rows:
        km = r["km"]
        if not isinstance(km, (int, float)) or not 0 < km <= 50:
            bad.append(f"order {r['order_id']}: km={km}")
        elif r["stops"] not in range(11) or r["rain"] not in (0, 1) or r["region"] not in REGIONS:
            bad.append(f"order {r['order_id']}: bad category")
    return bad

def bootstrap_mae(errors, resamples, seed):
    rng = LCG(seed)
    means = []
    for _ in range(resamples):
        sample = [errors[int(rng.random() * len(errors))] for _ in errors]
        means.append(mean(sample))
    means.sort()
    return means[int(0.025 * resamples)], means[int(0.975 * resamples) - 1]

DATA_FAULT = "none"
SERVING_FAULT = "none"
MAX_MAE = 2.5
MAX_SLICE_MAE = 3.0

rows = inject_data_fault(make_deliveries(200, seed=7), DATA_FAULT)
order = list(range(len(rows)))
LCG(0).shuffle(order)
val = [rows[i] for i in order[:50]]
train = [rows[i] for i in order[50:]]
if DATA_FAULT == "train_on_all":
    train = train + val
columns = numeric_columns(rows)
results = []

def check(stage, name, passed, detail):
    results.append((stage, name, passed))
    print(f"{stage:<6} {name:<14} {'PASS' if passed else 'FAIL'}  {detail}")
    return passed

def run_pipeline():
    bad = schema_errors(rows)
    if not check("data", "schema", not bad, f"{len(bad)} bad rows" + (f", first {bad[0]}" if bad else "")):
        return
    y = [r["minutes"] for r in rows]
    top = max(columns, key=lambda c: abs(corr([r[c] for r in rows], y)))
    top_corr = abs(corr([r[top] for r in rows], y))
    if not check("data", "label leak", top_corr < 0.95, f"max |corr| {top_corr:.3f} ({top})"):
        return
    shared = {r["order_id"] for r in train} & {r["order_id"] for r in val}
    if not check("data", "split overlap", not shared, f"{len(shared)} orders in both train and val"):
        return
    w = fit(train, columns)
    preds = [serve(w, r, columns, SERVING_FAULT) for r in val]
    finite = sum(1 for p in preds if math.isfinite(p))
    check("train", "smoke", finite == len(val), f"{finite}/{len(val)} finite predictions")
    base = {"km": 5.0, "stops": 1, "rain": 0, "region": "city"}
    p0 = serve(w, base, columns, SERVING_FAULT)
    def effect(**change):
        return serve(w, {**base, **change}, columns, SERVING_FAULT) - p0
    d = effect(km=6.0)
    check("behav", "+1 km", 1 <= d <= 5, f"{d:+.2f} min (expect 1 to 5)")
    d = effect(stops=2)
    check("behav", "+1 stop", d > 0, f"{d:+.2f} min (expect > 0)")
    d = effect(rain=1)
    check("behav", "rain", d > 0, f"{d:+.2f} min (expect > 0)")
    d = effect(region="rural")
    check("behav", "rural vs city", d > 0, f"{d:+.2f} min (expect > 0)")
    errors = [abs(p - r["minutes"]) for p, r in zip(preds, val)]
    lo, hi = bootstrap_mae(errors, 1000, seed=1)
    m = mean(errors)
    check("gate", "val MAE", m <= MAX_MAE, f"{m:.2f}, 95% CI {lo:.2f} to {hi:.2f} (max {MAX_MAE})")
    for region in REGIONS:
        part = [e for e, r in zip(errors, val) if r["region"] == region]
        sm = mean(part)
        check("gate", f"slice {region}", sm <= MAX_SLICE_MAE, f"{sm:.2f} on {len(part)} (max {MAX_SLICE_MAE})")

run_pipeline()
failed = [f"{s} {n}" for s, n, ok in results if not ok]
if not failed:
    print("RELEASE: ship")
else:
    print(f"RELEASE: blocked by {', '.join(failed)}")`,
  annotations: [],
  expectedOutput: `data   schema         PASS  0 bad rows
data   label leak     PASS  max |corr| 0.869 (km)
data   split overlap  PASS  0 orders in both train and val
train  smoke          PASS  50/50 finite predictions
behav  +1 km          PASS  +2.60 min (expect 1 to 5)
behav  +1 stop        PASS  +3.06 min (expect > 0)
behav  rain           PASS  +7.19 min (expect > 0)
behav  rural vs city  PASS  +7.81 min (expect > 0)
gate   val MAE        PASS  2.11, 95% CI 1.77 to 2.46 (max 2.5)
gate   slice city     PASS  2.32 on 14 (max 3.0)
gate   slice suburb   PASS  2.07 on 17 (max 3.0)
gate   slice rural    PASS  1.98 on 19 (max 3.0)
RELEASE: ship`,
};

export const pytestCode: CodeExample = {
  id: 'model-testing-pytest',
  language: 'python',
  source: `import math
import pytest
from delivery_model import (LCG, REGIONS, fit, make_deliveries, mean,
                            numeric_columns, schema_errors, serve)

SERVING_FAULT = "none"  # set to "region_ignored" to see the tests catch it

@pytest.fixture(scope="module")
def split():
    rows = make_deliveries(200, seed=7)
    order = list(range(len(rows)))
    LCG(0).shuffle(order)
    return rows, [rows[i] for i in order[50:]], [rows[i] for i in order[:50]]

@pytest.fixture(scope="module")
def model(split):
    rows, train, _ = split
    columns = numeric_columns(rows)
    w = fit(train, columns)
    return lambda request: serve(w, request, columns, SERVING_FAULT)

BASE = {"km": 5.0, "stops": 1, "rain": 0, "region": "city"}

def test_schema(split):
    assert schema_errors(split[0]) == []

def test_predictions_are_finite(split, model):
    assert all(math.isfinite(model(r)) for r in split[2])

@pytest.mark.parametrize("change, low, high", [
    ({"km": 6.0}, 1, 5),
    ({"stops": 2}, 0, math.inf),
    ({"rain": 1}, 0, math.inf),
    ({"region": "rural"}, 0, math.inf),
], ids=["km", "stops", "rain", "rural"])
def test_direction(model, change, low, high):
    effect = model({**BASE, **change}) - model(BASE)
    assert low < effect <= high

@pytest.mark.parametrize("region", REGIONS)
def test_slice_mae(split, model, region):
    val = [r for r in split[2] if r["region"] == region]
    assert mean([abs(model(r) - r["minutes"]) for r in val]) <= 3.0`,
  annotations: [],
};

export const pytestRun: CodeExample = {
  id: 'model-testing-pytest-run',
  language: 'bash',
  source: `pip install pytest==9.1.1
pytest -q                     # SERVING_FAULT = "none"
# .........                                                                [100%]
# 9 passed in 0.02s

pytest -q                     # SERVING_FAULT = "region_ignored"
# FAILED test_delivery_model.py::test_direction[rural] - assert 0 < 0.0
# FAILED test_delivery_model.py::test_slice_mae[rural] - assert 7.8668319623092...
# 2 failed, 7 passed in 0.03s`,
  annotations: [],
};
