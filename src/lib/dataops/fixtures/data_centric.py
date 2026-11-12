# Generates data-centric-python.json: what the lesson's Python prints for every setting the lesson offers.
# Run: python3 src/lib/dataops/fixtures/data_centric.py
import json, pathlib
from fill import run

SOURCE = """class LCG:  # the same generator as the lesson's TypeScript, so both print identical numbers
    def __init__(self, seed):
        self.state = seed % 2**32

    def random(self):
        self.state = (1664525 * self.state + 1013904223) % 2**32
        return self.state / 2**32


def make_points(count, seed):
    rng = LCG(seed)
    points = []
    for _ in range(count):
        x, y = rng.random(), rng.random()
        label = int((x - 0.5) ** 2 + (y - 0.5) ** 2 < 0.09)  # class 1 inside a circle of radius 0.3
        points.append((x, y, label, rng.random()))  # the last number decides if an annotator flips it
    return points


N_TRAIN = {{n}}  # training examples
NOISE = {{noise}}  # share of training labels the annotators got wrong
K = {{k}}  # neighbours that vote

train = [(x, y, 1 - lab if u < NOISE else lab) for x, y, lab, u in make_points(N_TRAIN, seed=7)]
flipped = sum(1 for _, _, _, u in make_points(N_TRAIN, seed=7) if u < NOISE)
test = [(x, y, lab) for x, y, lab, _ in make_points(400, seed=99)]  # clean labels


def predict(x, y):
    nearest = sorted(train, key=lambda p: (p[0] - x) ** 2 + (p[1] - y) ** 2)[:K]
    return int(2 * sum(p[2] for p in nearest) > K)  # majority vote


correct = sum(predict(x, y) == lab for x, y, lab in test)
print(f"training examples: {N_TRAIN}, labels flipped: {flipped} ({flipped / N_TRAIN:.0%})")
print(f"test accuracy with k={K}: {correct / len(test):.3f}")"""

out = {}
for n in (100, 200, 400, 800, 1600):
    for noise in (0, 0.1, 0.2, 0.3, 0.4):
        for k in (1, 15):
            out[f"{n},{noise},{k}"] = run(SOURCE, {"n": n, "noise": noise, "k": k})
pathlib.Path(__file__).with_name("data-centric-python.json").write_text(json.dumps(out, indent=1) + "\n")
