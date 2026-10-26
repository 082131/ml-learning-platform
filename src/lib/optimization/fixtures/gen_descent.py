"""Runs the lesson's gradient descent code (content/tracks/ml/math/loss-optimization/code.ts) for a
sample of slider settings and records what it prints. CPython 3.13."""
import json, random, sys

xs = [0, 1, 2, 3]
ys = [1, 2, 5, 6]

def run(w, b, lr, steps):
    for step in range(steps):
        errs = [w * x + b - y for x, y in zip(xs, ys)]
        dw = 2 * sum(e * x for e, x in zip(errs, xs)) / len(xs)
        db = 2 * sum(errs) / len(xs)
        w, b = w - lr * dw, b - lr * db
    loss = sum((w * x + b - y) * (w * x + b - y) for x, y in zip(xs, ys)) / len(xs)
    return f"{round(w, 4)} {round(b, 4)} {round(loss, 4)}", repr(w), repr(b), repr(loss)

rng = random.Random(0)
cases = [(-1.0, 5.0, 0.1, 30), (-1.0, 5.0, 0.23, 100), (-1.0, 5.0, 0.3, 100), (4.5, -3.0, 0.01, 1)]
for _ in range(1500):
    cases.append((rng.randrange(-4, 11) / 2, rng.randrange(-6, 15) / 2, rng.randrange(1, 31) / 100, rng.randrange(1, 101)))
out = []
for w, b, lr, steps in cases:
    printed, rw, rb, rl = run(w, b, lr, steps)
    out.append({"w0": w, "b0": b, "lr": lr, "steps": steps, "printed": printed, "w": rw, "b": rb, "loss": rl})
json.dump({"python": sys.version.split()[0], "cases": out}, open(sys.argv[1], "w"), indent=0)
