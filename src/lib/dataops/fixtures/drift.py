# Generates drift-python.json: what the lesson's Python prints for every setting the lesson offers.
# Run: python3 src/lib/dataops/fixtures/drift.py
import json, pathlib
from fill import run

SOURCE = """import math


class LCG:  # the same generator as the lesson's TypeScript
    def __init__(self, seed):
        self.state = seed % 2**32

    def random(self):
        self.state = (1664525 * self.state + 1013904223) % 2**32
        return self.state / 2**32


def sample(rng):  # bell-shaped: mean 2, standard deviation 0.577
    return rng.random() + rng.random() + rng.random() + rng.random()


SHIFT = {{shift}}  # how far the serving mean moved
WINDOW = {{window}}  # serving values compared with the baseline

rng = LCG(1)
base = [sample(rng) for _ in range(1000)]  # the training baseline
rng = LCG(2)
current = [sample(rng) + SHIFT for _ in range(WINDOW)]


def ks_statistic(a, b):  # the largest gap between the two empirical CDFs
    x, y, i, j, d = sorted(a), sorted(b), 0, 0, 0.0
    while i < len(x) and j < len(y):
        v = min(x[i], y[j])
        while i < len(x) and x[i] == v:
            i += 1
        while j < len(y) and y[j] == v:
            j += 1
        d = max(d, abs(i / len(x) - j / len(y)))
    return d


def ks_p_value(d, n, m):  # asymptotic Kolmogorov distribution
    en = math.sqrt(n * m / (n + m))
    lam = (en + 0.12 + 0.11 / en) * d
    if lam < 0.3:  # the series converges too slowly here, and the answer is 1 to 5 decimals
        return 1.0
    q, sign = 0.0, 1
    for k in range(1, 101):
        q += sign * 2 * math.exp(-2 * k * k * lam * lam)
        sign = -sign
    return min(1.0, max(0.0, q))


def psi(expected, actual, bins=10):
    edges = sorted(expected)
    cuts = [edges[len(edges) * i // bins] for i in range(1, bins)]  # equal-count bins of the baseline

    def shares(values):
        counts = [0] * bins
        for v in values:
            counts[sum(v >= c for c in cuts)] += 1
        return [max(c / len(values), 1e-4) for c in counts]

    e, a, total = shares(expected), shares(actual), 0.0
    for ei, ai in zip(e, a):
        total += (ai - ei) * math.log(ai / ei)
    return total


def mean(xs):
    total = 0.0
    for x in xs:
        total += x
    return total / len(xs)


d = ks_statistic(base, current)
p = ks_p_value(d, len(base), len(current))
score = psi(base, current)
print(f"baseline mean {mean(base):.3f}, window of {WINDOW}: mean {mean(current):.3f}")
print(f"KS D = {d:.4f}, p {'< 0.0001' if p < 0.0001 else f'= {p:.4f}'} -> {'drift alert' if p < 0.05 else 'no alert'}")
band = "stable" if score < 0.1 else "investigate" if score < 0.25 else "major shift"
print(f"PSI = {score:.3f} -> {band}")"""

out = {}
for shift in (0, 0.02, 0.05, 0.1, 0.25):
    for window in (200, 2000, 20000):
        out[f"{shift},{window}"] = run(SOURCE, {"shift": shift, "window": window})
pathlib.Path(__file__).with_name("drift-python.json").write_text(json.dumps(out, indent=1) + "\n")
