# Generates label-errors-python.json: what the lesson's Python prints for every setting the lesson offers.
# Run: python3 src/lib/dataops/fixtures/label_errors.py
import json, pathlib
from fill import run

SOURCE = """# (given label, out-of-fold P(dog), label after expert review); 0 = cat, 1 = dog
ITEMS = [(0, 0.15, 0), (0, 0.10, 0), (0, 0.20, 0), (0, 0.15, 0), (0, 0.22, 0), (0, 0.12, 0),
         (0, 0.30, 0), (0, 0.18, 0), (0, 0.17, 0), (0, 0.38, 0), (0, 0.25, 0), (0, 0.33, 0),
         (0, 0.21, 0), (0, 0.52, 1), (0, 0.50, 1), (0, 0.71, 1), (1, 0.66, 1), (1, 0.48, 1),
         (1, 0.55, 1), (1, 0.74, 1), (1, 0.45, 1), (1, 0.61, 1), (1, 0.18, 0), (1, 0.32, 0)]
METHOD = "{{method}}"  # "per-class", or a fixed cut-off on the given label's probability
NAME = ["cat", "dog"]

flagged = []
if METHOD == "per-class":
    # t_c: the model's average probability of class c over the items labeled c
    t = [sum(1 - p for g, p, _ in ITEMS if g == 0) / sum(g == 0 for g, _, _ in ITEMS),
         sum(p for g, p, _ in ITEMS if g == 1) / sum(g == 1 for g, _, _ in ITEMS)]
    print(f"thresholds: cat {t[0]:.3f}, dog {t[1]:.3f}")
    for i, (given, p, _) in enumerate(ITEMS):
        probs = [1 - p, p]
        confident = [c for c in (0, 1) if probs[c] >= t[c]]  # classes the item reaches the threshold of
        if confident and max(confident, key=lambda c: probs[c]) != given:
            flagged.append(i)
else:
    cutoff = float(METHOD)
    flagged = [i for i, (given, p, _) in enumerate(ITEMS) if (p if given else 1 - p) < cutoff]

# review order: the lowest probability for the given label first
flagged.sort(key=lambda i: ITEMS[i][1] if ITEMS[i][0] else 1 - ITEMS[i][1])
for i in flagged:
    given, p, truth = ITEMS[i]
    print(f"item {i:2}: labeled {NAME[given]}, P(dog)={p:.2f} -> {'really wrong' if given != truth else 'label was right'}")

errors = sum(g != t for g, _, t in ITEMS)
hits = sum(ITEMS[i][0] != ITEMS[i][2] for i in flagged)
precision = hits / len(flagged) if flagged else 0
print(f"flagged {len(flagged)}, really wrong {hits}: precision {precision:.2f}, recall {hits / errors:.2f} of {errors} known errors")"""

out = {}
for method in ("per-class", "0.5", "0.4", "0.3"):
    out[method] = run(SOURCE, {"method": method})
pathlib.Path(__file__).with_name("label-errors-python.json").write_text(json.dumps(out, indent=1) + "\n")
