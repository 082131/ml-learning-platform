# Reference output for eda.test.ts: run with ~/pyenv/bin/python (CPython 3.13) from the repository root.
# Runs the lesson's pure-Python Pearson loop on the 6 Chinstrap penguins of the every-12th-row subset,
# for every (x, y) pair, and prints what it prints (plus pandas' round(corr, 3) on the same rows).
import contextlib
import io
import itertools
import json
import pandas as pd

LOOP = open("src/lib/classical/fixtures/pearson_loop.py").read()
df = pd.read_csv("src/lib/classical/data/penguins.csv")
hand = df.iloc[::12]
hand = hand[hand["species"] == "Chinstrap"]
cols = ["bill_length_mm", "bill_depth_mm", "flipper_length_mm", "body_mass_g"]
lit = lambda s: "[" + ", ".join(str(int(v)) if s.name in ("flipper_length_mm", "body_mass_g") else repr(float(v)) for v in s) + "]"
out = {}
for x, y in itertools.product(cols, cols):
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        exec(LOOP.replace("{{xs}}", lit(hand[x])).replace("{{ys}}", lit(hand[y])), {})
    out[f"{x}/{y}"] = [buf.getvalue().strip(), str(round(hand[x].corr(hand[y]), 3))]
print(json.dumps(out, indent=1))
