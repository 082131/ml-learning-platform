# Generates agreement-python.json: what the lesson's Python prints for every setting the lesson offers.
# Run: python3 src/lib/dataops/fixtures/agreement.py
import json, pathlib
from fill import run

SOURCE = """A = {{a}}  # annotator A: 1 = toxic, 0 = not toxic
B = {{b}}  # annotator B, same comments in the same order
n = len(A)

both_toxic = sum(a == 1 and b == 1 for a, b in zip(A, B))
both_fine = sum(a == 0 and b == 0 for a, b in zip(A, B))
p_o = (both_toxic + both_fine) / n  # observed agreement

p_a, p_b = sum(A) / n, sum(B) / n  # how often each annotator says "toxic"
p_e = p_a * p_b + (1 - p_a) * (1 - p_b)  # agreement expected if both labeled at random at those rates
kappa = (p_o - p_e) / (1 - p_e)

print(f"items: {n}, disagreements: {n - both_toxic - both_fine}")
print(f"observed agreement p_o = {p_o:.2f}")
print(f"chance agreement   p_e = {p_e:.3f}")
print(f"Cohen's kappa = {kappa:.2f}")"""

out = {}
# The scripted annotators, written independently of the TypeScript (see agreement.ts for the rules).
KINDS = {"balanced": "TTTTTTOOOOOOPPPSSSQQ", "rare": "TOOOOOOOOOOOOOOOOPSQ"}


def label(kind, who, guideline, first_quote):
    if kind in "TO":
        return int(kind == "T")
    if guideline == "v1":
        return int(kind in ("PQ" if who == "A" else "S"))
    if kind == "Q" and who == "A" and first_quote:
        return 1
    return int(kind == "S")


for guideline in ("v1", "v2"):
    for sample, kinds in KINDS.items():
        for b_mode in ("careful", "lazy"):
            first_q = kinds.index("Q")
            a = [label(k, "A", guideline, i == first_q) for i, k in enumerate(kinds)]
            b = [0 if b_mode == "lazy" else label(k, "B", guideline, i == first_q) for i, k in enumerate(kinds)]
            out[f"{guideline},{sample},{b_mode}"] = run(SOURCE, {"a": a, "b": b})
pathlib.Path(__file__).with_name("agreement-python.json").write_text(json.dumps(out, indent=1) + "\n")
