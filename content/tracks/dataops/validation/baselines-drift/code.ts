// Code for the baselines and drift lesson. drift.py is pure Python; its output for every setting was produced with
// CPython 3.13 (drift.test.ts checks the browser's version against it). validate.py runs in the browser and is
// checked under CPython by content/tracks/dataops/python-outputs.test.ts. The SciPy and monitoring-tool snippets
// illustrate library APIs and are not run here.
import { DRIFT_SOURCE, driftExperiment, driftSlots, type DriftState } from '@/lib/dataops/drift';
import type { CodeExample } from '@/lib/types';

export const dr = driftExperiment('drift');

const st = (s: unknown) => s as DriftState;

export const driftPython: CodeExample = {
  id: 'drift-python',
  language: 'python',
  source: DRIFT_SOURCE,
  slots: {
    shift: (s) => driftSlots(st(s)).shift,
    window: (s) => driftSlots(st(s)).window,
  },
  annotations: [
    {
      id: 'shift',
      range: { line: 17, startCol: 8, endCol: 17 },
      match: '{{shift}}',
      kind: 'parameter',
      title: 'SHIFT',
      what: 'How far the mean of the serving data moved, in the feature’s own units. The standard deviation is 0.577.',
      why: 'A real shift of this size might come from a new customer segment, a seasonal change, or an upstream unit bug.',
    },
    {
      id: 'window',
      range: { line: 18, startCol: 9, endCol: 19 },
      match: '{{window}}',
      kind: 'parameter',
      title: 'WINDOW',
      what: 'How many serving values are compared with the baseline, for example one hour or one day of traffic.',
      why: 'A larger window makes the KS test more sensitive and both statistics less noisy.',
    },
    {
      id: 'base',
      range: { line: 21 },
      kind: 'variable',
      title: 'base',
      what: 'The baseline: 1,000 values of the feature from the training data.',
      why: 'Every check compares serving data with this fixed reference, stored with the model version.',
    },
    {
      id: 'ksd',
      range: { line: 34 },
      kind: 'math',
      title: 'D',
      what: 'After each distinct value, the share of each sample at or below it; D is the largest difference between the two shares.',
      why: 'D is an effect size between 0 and 1. It does not depend on the window size, but its p-value does.',
    },
    {
      id: 'lam',
      range: { line: 40 },
      kind: 'math',
      title: 'lam',
      what: 'D scaled by the effective sample size √(nm/(n+m)), with a small-sample correction.',
      why: 'The same D gives a larger λ, and so a smaller p-value, when both samples are larger.',
    },
    {
      id: 'cuts',
      range: { line: 52 },
      kind: 'variable',
      title: 'cuts',
      what: 'The 9 cut points that split the baseline into 10 bins of 100 values each.',
      why: 'Equal-count bins put resolution where the training data is dense.',
    },
    {
      id: 'psi-term',
      range: { line: 62 },
      kind: 'math',
      title: 'PSI term',
      what: '(serving share − baseline share) × ln(serving share / baseline share) for one bin; always ≥ 0.',
      why: 'PSI is an effect size: it grows with how much the distribution moved, and only noise depends on the window size.',
    },
  ],
};

export const validateRunner: CodeExample = {
  id: 'validate-runner',
  language: 'python',
  run: 'pyodide',
  source: `# Infer a baseline from training rows, then validate a new batch against it (what TFDV, Great Expectations or
# SageMaker Model Monitor do at scale).
train = [
    {"country": "DE", "age": 34, "basket": 52.0}, {"country": "FR", "age": 41, "basket": 18.5},
    {"country": "DE", "age": 29, "basket": 77.0}, {"country": "NL", "age": 55, "basket": 31.0},
    {"country": "FR", "age": 23, "basket": 64.5}, {"country": "DE", "age": 47, "basket": 12.0},
    {"country": "NL", "age": 38, "basket": 45.5}, {"country": "FR", "age": 62, "basket": 23.0},
]
batch = [
    {"country": "DE", "age": 31, "basket": 49.0}, {"country": "BE", "age": 44, "basket": 3150.0},
    {"country": "FR", "age": None, "basket": 27.5}, {"country": "DE", "age": "39", "basket": 61.0},
    {"country": "NL", "age": 52, "basket": 22.0}, {"country": "FR", "age": None, "basket": 35.0},
]


def infer_schema(rows):
    schema = {}
    for col in rows[0]:
        values = [r[col] for r in rows]
        kind = type(values[0]).__name__
        spec = {"type": kind, "max_missing": 0.0}
        if kind == "str":
            spec["domain"] = sorted(set(values))
        else:
            spec["min"], spec["max"] = min(values), max(values)
        schema[col] = spec
    return schema


def validate(rows, schema, range_slack=0.5):
    anomalies = []
    for col, spec in schema.items():
        values = [r.get(col) for r in rows]
        missing = sum(v is None for v in values) / len(values)
        if missing > spec["max_missing"]:
            anomalies.append(f"{col}: {missing:.0%} missing (baseline allows {spec['max_missing']:.0%})")
        present = [v for v in values if v is not None]
        wrong_type = [v for v in present if type(v).__name__ != spec["type"]]
        if wrong_type:
            anomalies.append(f"{col}: {len(wrong_type)} value(s) of the wrong type, e.g. {wrong_type[0]!r}")
        ok = [v for v in present if type(v).__name__ == spec["type"]]
        if "domain" in spec:
            new = sorted(set(ok) - set(spec["domain"]))
            if new:
                anomalies.append(f"{col}: values outside the domain {spec['domain']}: {new}")
        else:
            span = spec["max"] - spec["min"]
            lo, hi = spec["min"] - range_slack * span, spec["max"] + range_slack * span
            out = [v for v in ok if not lo <= v <= hi]
            if out:
                anomalies.append(f"{col}: {len(out)} value(s) outside [{lo:g}, {hi:g}], e.g. {out[0]}")
    return anomalies


schema = infer_schema(train)
for col, spec in schema.items():
    print(f"baseline {col:<8} {spec}")
for a in validate(batch, schema):
    print("ANOMALY", a)`,
  annotations: [],
  expectedOutput: `baseline country  {'type': 'str', 'max_missing': 0.0, 'domain': ['DE', 'FR', 'NL']}
baseline age      {'type': 'int', 'max_missing': 0.0, 'min': 23, 'max': 62}
baseline basket   {'type': 'float', 'max_missing': 0.0, 'min': 12.0, 'max': 77.0}
ANOMALY country: values outside the domain ['DE', 'FR', 'NL']: ['BE']
ANOMALY age: 33% missing (baseline allows 0%)
ANOMALY age: 1 value(s) of the wrong type, e.g. '39'
ANOMALY basket: 1 value(s) outside [-20.5, 109.5], e.g. 3150.0`,
};

export const scipySketch: CodeExample = {
  id: 'scipy-drift-sketch',
  language: 'python',
  source: `# The same tests with SciPy (not run here; SciPy's p-value uses an exact method for small samples)
import pandas as pd
from scipy.stats import chi2_contingency, ks_2samp

result = ks_2samp(train_df["basket"], serving_df["basket"])
print(result.statistic, result.pvalue)  # D and its p-value

# For a categorical feature, compare counts per category with a chi-squared test
both = pd.concat([train_df.assign(source="train"), serving_df.assign(source="serving")])
chi2, p, dof, _ = chi2_contingency(pd.crosstab(both["source"], both["country"]))  # rows: source, columns: country

# Alert on the effect size, and use the test only to ignore noise:
alert = result.statistic > 0.1 and result.pvalue < 0.01`,
  annotations: [],
};
