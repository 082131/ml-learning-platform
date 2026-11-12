"""Recorded runs for python/analysis/statistical-inference: a permutation test and a bootstrap interval for
the difference in means, at three sample sizes and three true effects."""
import pathlib, sys

import numpy as np

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from _runner import run_fixture

TEMPLATE = '''import numpy as np

rng = np.random.default_rng(1)
n = {{n}}
a = rng.normal(10.0, 3.0, size=n)             # control: minutes per visit
b = rng.normal(10.0 + {{effect}}, 3.0, size=n)  # variant
observed = b.mean() - a.mean()

pooled = np.concatenate([a, b])
diffs = np.empty(2000)
for i in range(2000):
    rng.shuffle(pooled)                       # labels no longer matter
    diffs[i] = pooled[n:].mean() - pooled[:n].mean()
p = np.mean(np.abs(diffs) >= abs(observed))

boot = np.empty(2000)
for i in range(2000):
    boot[i] = rng.choice(b, n).mean() - rng.choice(a, n).mean()
lo, hi = np.percentile(boot, [2.5, 97.5])
print(f"observed {observed:.2f}, p = {p:.3f}")
print(f"95% CI [{lo:.2f}, {hi:.2f}]")'''

VARIANTS = [
    {"id": f"n{n}-e{e.replace('.', '')}", "label": f"n = {n} per group, true effect {e} min", "slots": {"n": str(n), "effect": e}}
    for e in ("0.0", "0.5", "1.0") for n in (20, 100, 500)
]


def cards(ns, error, variant):
    diffs, obs, p = ns["diffs"], float(ns["observed"]), float(ns["p"])
    counts, edges = np.histogram(diffs, bins=30)
    lo, hi = float(ns["lo"]), float(ns["hi"])
    effect = float(variant["slots"]["effect"])
    covered = lo <= effect <= hi
    return {
        "hist": {
            "edges": [round(float(e), 4) for e in edges],
            "counts": [int(c) for c in counts],
            "xLabel": "difference in means under shuffling (minutes)",
            "markers": [{"label": "observed", "value": round(obs, 3)}, {"label": "−observed", "value": round(-obs, 3)}],
        },
        "cards": [
            {"label": "observed difference", "value": f"{obs:.2f} min", "note": f"the true effect is {effect} min"},
            {"label": "p-value", "value": f"{p:.3f}",
             "note": "share of shuffles at least as extreme as observed" + (" (below 0.05)" if p < 0.05 else "")},
            {"label": "95% bootstrap CI", "value": f"[{lo:.2f}, {hi:.2f}]",
             "note": ("contains" if covered else "misses") + f" the true effect; width {hi - lo:.2f}"},
        ],
    }


run_fixture(__file__, TEMPLATE, VARIANTS, cards)
