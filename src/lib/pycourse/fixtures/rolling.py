"""Recorded runs for python/pandas/time-series: windows and shifts over a week of daily sales, and which
ones use future values."""
import pathlib, sys

import pandas as pd

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from _runner import run_fixture

TEMPLATE = '''import pandas as pd

sales = pd.Series(
    [10, 12, 9, 30, 11, 13, 12],
    index=pd.date_range("2026-03-02", periods=7, freq="D"),
)
feature = sales.{{op}}
print(feature.round(2).tolist())'''

OPS = [
    ("shift1", "shift(1)", "yesterday’s value"),
    ("diff1", "diff(1)", "change since yesterday"),
    ("roll3", "rolling(3).mean()", "trailing 3-day mean"),
    ("roll3min", "rolling(3, min_periods=1).mean()", "trailing mean, partial windows"),
    ("roll3c", "rolling(3, center=True).mean()", "centered 3-day mean"),
    ("shiftroll", "shift(1).rolling(3).mean()", "mean of the previous 3 days"),
    ("expand", "expanding().max()", "running maximum"),
    ("shiftneg", "shift(-1)", "tomorrow’s value"),
]
VARIANTS = [{"id": i, "label": f".{op}  ({d})", "slots": {"op": op}} for i, op, d in OPS]
FUTURE = {"roll3c", "shiftneg"}
INCLUDES_TODAY = {"diff1", "roll3", "roll3min", "expand"}


def cards(ns, error, variant):
    f = ns["feature"]
    day = pd.Timestamp("2026-03-05")  # the spike, 30
    if variant["id"] in FUTURE:
        note = "uses values after the row’s own date: leaks the future into a feature"
    elif variant["id"] in INCLUDES_TODAY:
        note = "uses the row’s own value: fine for analysis; as a feature it must be known at prediction time"
    else:
        note = "uses only earlier days: safe as a forecasting feature"
    v = f.loc[day]
    return [
        {"label": "value on 2026-03-05", "value": "NaN" if pd.isna(v) else str(round(float(v), 2)),
         "note": "the day with the spike of 30"},
        {"label": "missing values", "value": str(int(f.isna().sum())), "note": "rows where the window is not full"},
        {"label": "time direction", "value": "future" if variant["id"] in FUTURE else "past",
         "note": note},
    ]


run_fixture(__file__, TEMPLATE, VARIANTS, cards)
