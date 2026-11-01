"""Checks the canary test by simulation: how often does it raise the alarm when the new version is worse
(power, should be about 80%) and when it is not (false alarms, should be about 5%)?

Run with NumPy 2.5:  python3 canary_sim.py
src/lib/inference/canary.test.ts runs it and checks the lesson's numbers against its output.
"""
import math

import numpy as np

rng = np.random.default_rng(0)
TRIALS = 200_000


def plan(p0, p1):
    z = 1.6449 * math.sqrt(p0 * (1 - p0)) + 0.8416 * math.sqrt(p1 * (1 - p1))
    n = math.ceil((z / (p1 - p0)) ** 2)
    return n, n * p0 + 1.6449 * math.sqrt(n * p0 * (1 - p0))


for p0, p1 in [(0.005, 0.010), (0.005, 0.020), (0.01, 0.015)]:
    n, threshold = plan(p0, p1)
    worse = rng.binomial(n, p1, TRIALS) > threshold     # canary really is worse
    same = rng.binomial(n, p0, TRIALS) > threshold      # canary is as good as before
    print(f"p0 {p0:.3f} p1 {p1:.3f}: n {n:6,}  alarm when worse {worse.mean():.1%}  false alarms {same.mean():.1%}")
