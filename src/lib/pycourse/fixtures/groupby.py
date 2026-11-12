"""Recorded runs for python/pandas/groupby-merge-reshape: split-apply-combine with different keys and
operations. Cards list each group's rows and what the operation produced for it."""
import pathlib, sys

import pandas as pd

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from _runner import run_fixture

TEMPLATE = '''import pandas as pd

sales = pd.DataFrame({
    "region": ["north", "south", "north", "east", "south", "north"],
    "rep": ["ana", "ben", "cy", "di", "ben", "ana"],
    "amount": [120, 80, 95, 60, 40, 30],
})
result = sales.groupby("{{key}}")["amount"].{{op}}
print(result)'''

OPS = [("sum", "sum()"), ("mean", "mean()"), ("size", "size()"), ("agg", 'agg(["min", "max"])'),
       ("transform", 'transform("sum")'), ("cumsum", "cumsum()")]
VARIANTS = [
    {"id": f"{k}-{oid}", "label": f'groupby("{k}") then .{op}', "slots": {"key": k, "op": op}}
    for k in ("region", "rep") for oid, op in OPS
]


def cards(ns, error, variant):
    sales, result = ns["sales"], ns["result"]
    key = variant["slots"]["key"]
    per_row = len(result) == len(sales) and result.index.equals(sales.index)
    out = []
    for name, rows in sales.groupby(key)["amount"]:
        labels = rows.index.tolist()
        if per_row:
            got = ", ".join(f"row {i}: {result.loc[i]}" for i in labels)
        elif isinstance(result, pd.DataFrame):
            got = ", ".join(f"{c} {result.loc[name, c]}" for c in result.columns)
        else:
            got = repr(result.loc[name].item())
        out.append({"label": f"{key} = {name}", "value": f"rows {labels}: amounts {rows.tolist()}", "note": f"→ {got}"})
    shape = "one value per row (same length as sales)" if per_row else f"one row per group, shape {result.shape}"
    out.append({"label": "combined result", "value": type(result).__name__, "note": shape})
    return out


run_fixture(__file__, TEMPLATE, VARIANTS, cards)
