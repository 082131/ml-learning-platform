"""Recorded runs for python/cleaning/missing-duplicates-types: how each way of handling missing income
changes the table and its statistics."""
import pathlib, sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from _runner import run_fixture

TEMPLATE = '''import pandas as pd

raw = pd.DataFrame({
    "id": [1, 2, 2, 3, 4, 5, 6, 7],
    "age": ["34", "29", "29", "n/a", "41", "", "230", "38"],
    "income": [52000, None, None, 61000, None, 1200000, 48000, 55000],
})
df = raw.drop_duplicates().copy()
df["age"] = pd.to_numeric(df["age"], errors="coerce")
df["age"] = df["age"].where(df["age"].between(0, 120))
{{strategy}}
print(len(df), df["income"].isna().sum())
print(round(df["income"].mean()), df["income"].median())'''

STRATS = [
    ("drop", 'df = df.dropna(subset=["income"])', "drop rows with missing income"),
    ("zero", 'df["income"] = df["income"].fillna(0)', "fill with 0"),
    ("mean", 'df["income"] = df["income"].fillna(df["income"].mean())', "fill with the mean"),
    ("median", 'df["income"] = df["income"].fillna(df["income"].median())', "fill with the median"),
    ("flag", 'df["income_missing"] = df["income"].isna(); df["income"] = df["income"].fillna(df["income"].median())',
     "median plus a missingness flag"),
    ("none", "pass", "leave the gaps"),
]
VARIANTS = [{"id": i, "label": d, "slots": {"strategy": s}} for i, s, d in STRATS]


def cards(ns, error, variant):
    df = ns["df"]
    return [
        {"label": "rows", "value": str(len(df)), "note": "8 raw rows, 1 exact duplicate removed first"},
        {"label": "income values", "value": ", ".join("NaN" if v != v else f"{v:,.0f}" for v in df["income"]),
         "note": "filled values sit where the gaps were"},
        {"label": "age after coercion", "value": ", ".join("NaN" if v != v else f"{v:.0f}" for v in df["age"]),
         "note": "n/a and empty could not be parsed; 230 is impossible"},
        {"label": "columns", "value": ", ".join(df.columns), "note": "a flag column keeps the fact a value was missing"},
    ]


run_fixture(__file__, TEMPLATE, VARIANTS, cards)
