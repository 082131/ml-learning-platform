# Reference output for eda.test.ts: run with ~/pyenv/bin/python (CPython 3.13, pandas 3.0.2) from the
# repository root. For every (x, y) pair it prints what the lesson's correlation code prints.
import itertools
import json
import pandas as pd

df = pd.read_csv("src/lib/classical/data/penguins.csv")
cols = ["bill_length_mm", "bill_depth_mm", "flipper_length_mm", "body_mass_g"]
out = {}
for x, y in itertools.product(cols, cols):
    sub = df.dropna(subset=[x, y])
    lines = [" ".join(map(str, ["all", len(sub), round(sub[x].corr(sub[y]), 3)]))]
    for species, g in sub.groupby("species"):
        lines.append(" ".join(map(str, [species, len(g), round(g[x].corr(g[y]), 3)])))
    out[f"{x}/{y}"] = "\n".join(lines)
print(json.dumps(out, indent=1))
