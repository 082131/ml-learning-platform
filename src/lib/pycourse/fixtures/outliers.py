"""Recorded runs for python/cleaning/text-categories-outliers: which values each outlier rule flags."""
import pathlib, sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from _runner import run_fixture

TEMPLATE = '''import pandas as pd

minutes = pd.Series([12, 14, 13, 15, 14, 13, 16, 15, 14, 95, 13, 120])
q1, q3 = minutes.quantile(0.25), minutes.quantile(0.75)
iqr = q3 - q1
z = (minutes - minutes.mean()) / minutes.std()
mad = (minutes - minutes.median()).abs().median()
robust_z = 0.6745 * (minutes - minutes.median()) / mad
flagged = {{rule}}
print(minutes[flagged].tolist())'''

RULES = [
    ("iqr15", "(minutes < q1 - 1.5 * iqr) | (minutes > q3 + 1.5 * iqr)", "IQR rule, k = 1.5"),
    ("iqr3", "(minutes < q1 - 3 * iqr) | (minutes > q3 + 3 * iqr)", "IQR rule, k = 3"),
    ("z3", "z.abs() > 3", "z-score above 3"),
    ("z2", "z.abs() > 2", "z-score above 2"),
    ("robust", "robust_z.abs() > 3.5", "robust z (median and MAD) above 3.5"),
]
VARIANTS = [{"id": i, "label": d, "slots": {"rule": r}} for i, r, d in RULES]


def cards(ns, error, variant):
    m, z, rz = ns["minutes"], ns["z"], ns["robust_z"]
    q1, q3, iqr = ns["q1"], ns["q3"], ns["iqr"]
    return [
        {"label": "flagged", "value": str(m[ns["flagged"]].tolist()), "note": f"{int(ns['flagged'].sum())} of {len(m)} values"},
        {"label": "IQR fences", "value": f"{q1 - 1.5 * iqr:g} to {q3 + 1.5 * iqr:g} (k = 1.5)",
         "note": f"Q1 = {q1:g}, Q3 = {q3:g}, IQR = {iqr:g}"},
        {"label": "z of 95 and 120", "value": f"{z.iloc[9]:.2f} and {z.iloc[11]:.2f}",
         "note": f"mean {m.mean():.2f} and std {m.std():.2f} are inflated by the outliers themselves"},
        {"label": "robust z of 95 and 120", "value": f"{rz.iloc[9]:.1f} and {rz.iloc[11]:.1f}",
         "note": f"median {m.median():g}, MAD {ns['mad']:g}"},
    ]


run_fixture(__file__, TEMPLATE, VARIANTS, cards)
