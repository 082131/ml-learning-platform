"""Recorded runs for python/numpy/dtypes-random: what each dtype does with the same arithmetic."""
import pathlib, sys

import numpy as np

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from _runner import run_fixture

TEMPLATE = '''import numpy as np

x = np.array([100, 120], dtype=np.{{dtype}})
y = x + {{add}}
print(y, y.dtype)'''

CASES = [
    ("int8-10", "int8", "10"),
    ("int16-10", "int16", "10"),
    ("uint8-200", "uint8", "200"),
    ("int8-300", "int8", "300"),
    ("int8-float", "int8", "0.5"),
    ("float16-small", "float16", "0.001"),
    ("float32-small", "float32", "0.001"),
    ("float64-small", "float64", "0.001"),
]
VARIANTS = [{"id": i, "label": f"{d} + {a}", "slots": {"dtype": d, "add": a}} for i, d, a in CASES]

RANGES = {k: np.iinfo(k) for k in ("int8", "int16", "uint8")}


def cards(ns, error, variant):
    d = variant["slots"]["dtype"]
    if d in RANGES:
        info = RANGES[d]
        rng = f"integers from {info.min} to {info.max}"
    else:
        f = np.finfo(d)
        rng = f"about {f.precision} significant decimal digits"
    out = [{"label": "dtype of x", "value": d, "note": rng}]
    if not error:
        y = ns["y"]
        out.append({"label": "y", "value": str(y), "note": f"dtype {y.dtype}"})
    return out


run_fixture(__file__, TEMPLATE, VARIANTS, cards)
