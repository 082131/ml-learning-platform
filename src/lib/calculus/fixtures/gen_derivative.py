# Prints [fn, x, h, f"{forward:.6f} {central:.6f}"] for the lesson's code, as CPython computes it.
import json
FNS = {"square": lambda x: x * x, "cubic": lambda x: x * x * x - 3 * x, "abs": lambda x: abs(x)}
out = []
for name, f in FNS.items():
    for x in [1, -2.5, 0, 0.3, 2.9]:
        for h in ["1", "0.1", "0.01", "0.001", "1e-06", "1e-12"]:
            hv = float(h)
            forward = (f(x + hv) - f(x)) / hv
            central = (f(x + hv) - f(x - hv)) / (2 * hv)
            out.append([name, x, h, f"{forward:.6f} {central:.6f}"])
print(json.dumps(out))
