"""Recorded runs for python/numpy/indexing-views: which indexing results share memory with the array."""
import pathlib, sys

import numpy as np

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from _runner import run_fixture

TEMPLATE = '''import numpy as np

a = np.arange(12).reshape(3, 4)
sub = {{expr}}
sub[...] = -1          # write into every element of sub
print(a)
print(np.shares_memory(a, sub))'''

EXPRS = [
    ("row", "a[1]", "a basic index: one row"),
    ("column", "a[:, 1]", "a slice and an index: one column"),
    ("step", "a[1:, ::2]", "slices with a step"),
    ("fancy", "a[[0, 2]]", "fancy indexing with a list"),
    ("mask", "a[a > 8]", "a boolean mask"),
    ("reshape", "a.reshape(4, 3)", "reshape"),
    ("transpose", "a.T", "transpose"),
    ("ravel", "a.ravel()", "ravel"),
    ("flatten", "a.flatten()", "flatten"),
    ("copy", "a[1].copy()", "an explicit copy"),
]
VARIANTS = [{"id": i, "label": f"{e}  ({d})", "slots": {"expr": e}} for i, e, d in EXPRS]


def cards(ns, error, variant):
    a0 = np.arange(12).reshape(3, 4)
    sub = eval(variant["slots"]["expr"], {"a": a0, "np": np})
    view = np.shares_memory(a0, sub)
    return [
        {"label": "sub before the write", "value": str(sub), "note": f"shape {sub.shape}"},
        {"label": "view or copy", "value": "view" if view else "copy",
         "note": "writes reach a" if view else "a is untouched by writes to sub"},
        {"label": "a after the write", "value": str(ns["a"]), "note": "-1 marks elements changed through sub"},
    ]


run_fixture(__file__, TEMPLATE, VARIANTS, cards)
