# Prints {"b,r,c": {"x": str(x), "flatten": ..., "merge": ..., "transpose": ...}} for every shape up to 4.
import json, numpy as np
out = {}
for b in range(1, 5):
    for r in range(1, 5):
        for c in range(1, 5):
            x = np.arange(b * r * c).reshape(b, r, c)
            out[f"{b},{r},{c}"] = {
                "x": str(x),
                "flatten": str(x.reshape(b, r * c)),
                "merge": str(x.reshape(b * r, c)),
                "transpose": str(x.transpose(0, 2, 1)),
            }
print(json.dumps(out))
