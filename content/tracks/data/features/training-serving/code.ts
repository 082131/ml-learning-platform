// Code for the feature pipelines and training-serving consistency lesson. features.py is pure Python; its
// output for every setting was produced with CPython 3.13.18 (pointInTime.test.ts checks the browser's version
// against it). psi.py runs in the browser and is checked under CPython. asof.py ran with pandas 3.0.5; its
// output is pasted below it. shared_features.py illustrates the pattern and is not run here.
import { POINT_SOURCE, pointExperiment, pointSlots, type PointState } from '@/lib/data/pointInTime';
import type { CodeExample } from '@/lib/types';

export const point = pointExperiment('point');

const st = (s: unknown) => s as PointState;

export const pointPython: CodeExample = {
  id: 'point-python',
  language: 'python',
  source: POINT_SOURCE,
  slots: {
    window: (s) => pointSlots(st(s)).window,
    join: (s) => pointSlots(st(s)).join,
  },
  annotations: [
    {
      id: 'window',
      range: { line: 2, startCol: 9, endCol: 19 },
      match: '{{window}}',
      kind: 'parameter',
      title: 'WINDOW',
      what: 'How many days of orders the feature counts, from the control.',
      why: 'A shorter window changes faster, so a snapshot taken a few hours too late is more likely to differ.',
    },
    {
      id: 'join',
      range: { line: 3, startCol: 8, endCol: 16 },
      match: '{{join}}',
      kind: 'parameter',
      title: 'JOIN',
      what: 'Which snapshot each training row is joined to, from the control.',
      why: 'This one choice decides whether training sees the past (as-of) or peeks at the future (same-day, latest).',
    },
    {
      id: 'snapshot',
      range: { line: 7 },
      kind: 'function',
      title: 'snapshot(customer, day)',
      what: 'The value the daily feature job wrote at the end of a day: orders in the WINDOW days up to and including it.',
      why: 'A feature table keeps one row per entity per run, so you can look up what any value was on any past day.',
    },
    {
      id: 'label',
      range: { line: 14 },
      kind: 'math',
      title: 'The label',
      what: '1 if the customer orders during the 7 days starting at the prediction day.',
      why: 'Labels come from the future by design. Features must not, or the model learns from information it will never have.',
    },
    {
      id: 'snap',
      range: { line: 15 },
      kind: 'variable',
      title: 'snap',
      what: 'The day whose snapshot the join picks: the day before, the same day, or the latest run.',
      why: 'A prediction made at the start of day 14 can only use snapshots written by the end of day 13.',
    },
    {
      id: 'correct',
      range: { line: 16 },
      kind: 'variable',
      title: 'correct',
      what: 'The value production would have served at prediction time.',
      why: 'Comparing it with the joined value counts the rows where training and serving disagree.',
    },
  ],
};

export const psiRunner: CodeExample = {
  id: 'psi-runner',
  language: 'python',
  run: 'pyodide',
  source: `import math
import random

rng = random.Random(42)
# avg_basket_eur for 1,000 customers, as the training pipeline computed it
train = [round(20 + 60 * rng.random() ** 2, 2) for _ in range(1000)]
# the same feature at serving time, from two versions of the online code
serve_same_code = [round(20 + 60 * rng.random() ** 2, 2) for _ in range(1000)]
serve_with_refunds = [round(x - 20 * (rng.random() < 0.4), 2) for x in serve_same_code]  # refunds not excluded
serve_in_cents = [round(x * 100) for x in serve_same_code]  # a unit bug


def psi(expected, actual, bins=5):
    edges = sorted(expected)
    cuts = [edges[len(edges) * i // bins] for i in range(1, bins)]  # equal-count bins on the training data

    def shares(values):
        counts = [0] * bins
        for v in values:
            counts[sum(v >= c for c in cuts)] += 1
        return [max(c / len(values), 1e-4) for c in counts]

    e, a = shares(expected), shares(actual)
    return sum((ai - ei) * math.log(ai / ei) for ei, ai in zip(e, a))


for name, serve in [("same code", serve_same_code), ("refunds not excluded", serve_with_refunds),
                    ("amount in cents", serve_in_cents)]:
    score = psi(train, serve)
    verdict = "stable" if score < 0.1 else "investigate" if score < 0.25 else "major shift"
    print(f"{name:<21} PSI = {score:.3f}  {verdict}")`,
  annotations: [],
  expectedOutput: `same code             PSI = 0.006  stable
refunds not excluded  PSI = 0.191  investigate
amount in cents       PSI = 7.365  major shift`,
};

export const asofPandas: CodeExample = {
  id: 'asof-pandas',
  language: 'python',
  source: `import pandas as pd

ORDERS = {"A": [2, 5, 9, 12, 13, 20], "B": [1, 15, 16, 17, 18], "C": [3, 4, 22]}
# the feature table: one row per customer per day, written at the end of that day
snapshots = pd.DataFrame(
    [(c, day, sum(day - 7 < d <= day for d in days)) for c, days in ORDERS.items() for day in range(1, 26)],
    columns=["customer", "snapshot_day", "orders_7d"],
)
examples = pd.DataFrame(
    {"customer": ["A", "A", "B", "B", "C", "C"], "day": [10, 14, 15, 19, 5, 21]}
)

# point-in-time correct: the latest snapshot strictly before the prediction day
train = pd.merge_asof(
    examples.sort_values("day"),
    snapshots.sort_values("snapshot_day"),
    left_on="day",
    right_on="snapshot_day",
    by="customer",
    allow_exact_matches=False,
)
print(train.sort_values(["customer", "day"]).to_string(index=False))

# leaky: each customer's current value, joined onto every past example
latest = snapshots[snapshots.snapshot_day == snapshots.snapshot_day.max()]
leaky = examples.merge(latest, on="customer")
print(leaky.to_string(index=False))

# Output (pandas 3.0.5):
# customer  day  snapshot_day  orders_7d
#        A   10             9          2
#        A   14            13          3
#        B   15            14          0
#        B   19            18          4
#        C    5             4          2
#        C   21            20          0
# customer  day  snapshot_day  orders_7d
#        A   10            25          1
#        A   14            25          1
#        B   15            25          0
#        B   19            25          0
#        C    5            25          1
#        C   21            25          1`,
  annotations: [],
};

export const sharedFeatures: CodeExample = {
  id: 'shared-features',
  language: 'python',
  source: `# features.py: one definition, imported by the training pipeline and by the prediction service
def orders_7d(order_days, as_of_day):
    """Orders in the 7 days before as_of_day (that day itself excluded)."""
    return sum(as_of_day - 7 <= d < as_of_day for d in order_days)


# training_pipeline.py (batch, nightly)
from features import orders_7d

rows = [{"customer": c, "day": day, "orders_7d": orders_7d(history[c], day), "label": label}
        for c, day, label in examples]

# serve.py (online, per request)
from features import orders_7d

def predict(customer, today):
    x = orders_7d(recent_orders(customer), today)  # same function, same definition of "the last 7 days"
    return model.predict_proba([[x]])[0][1]`,
  annotations: [],
};
