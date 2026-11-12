"""Recorded runs for python/analysis/eda-visualization: the same summary statistics on five shapes of data."""
import pathlib, sys

import numpy as np

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from _runner import run_fixture

TEMPLATE = '''import numpy as np

rng = np.random.default_rng(0)
values = {{dist}}
q1, q3 = np.percentile(values, [25, 75])
print(f"mean {values.mean():.1f}, median {np.median(values):.1f}")
print(f"std {values.std(ddof=1):.1f}, IQR {q3 - q1:.1f}")'''

DISTS = [
    ("normal", "rng.normal(50, 10, size=500)", "symmetric (normal)"),
    ("skewed", "rng.lognormal(3.8, 0.6, size=500)", "right-skewed (lognormal)"),
    ("outlier", "np.append(rng.normal(50, 10, size=499), 400)", "normal plus one outlier"),
    ("bimodal", "np.concatenate([rng.normal(35, 5, size=250), rng.normal(65, 5, size=250)])", "two groups (bimodal)"),
    ("uniform", "rng.uniform(0, 100, size=500)", "flat (uniform)"),
]
VARIANTS = [{"id": i, "label": label, "slots": {"dist": d}} for i, d, label in DISTS]


def cards(ns, error, variant):
    v = ns["values"]
    counts, edges = np.histogram(v, bins=20)
    mean, median = float(v.mean()), float(np.median(v))
    skew = float(((v - mean) ** 3).mean() / v.std() ** 3)
    return {
        "hist": {
            "edges": [round(float(e), 4) for e in edges],
            "counts": [int(c) for c in counts],
            "xLabel": "value",
            "markers": [{"label": "mean", "value": round(mean, 2)}, {"label": "median", "value": round(median, 2)}],
        },
        "cards": [
            {"label": "mean − median", "value": f"{mean - median:.2f}", "note": "far from 0 when the shape is lopsided or has extremes"},
            {"label": "skewness", "value": f"{skew:.2f}", "note": "0 for symmetric data; positive for a long right tail"},
            {"label": "min and max", "value": f"{v.min():.1f} and {v.max():.1f}", "note": f"{len(v)} values"},
        ],
    }


run_fixture(__file__, TEMPLATE, VARIANTS, cards)
