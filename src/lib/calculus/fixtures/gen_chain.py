# Runs the chain-rule lesson's code for several inputs and prints [[w, x, b, y], printed line].
import contextlib, io, json
SOURCE = """
p = w * x
y_hat = p + b
e = y_hat - y
L = e * e
dL_de = 2 * e
dL_dyhat = dL_de * 1
dL_dp = dL_dyhat * 1
dL_db = dL_dyhat * 1
dL_dw = dL_dp * x
print(L, dL_dw, dL_db)
"""
cases = [(1, 2, 0, 6), (0.5, 2, 1, 3), (-1.5, 2.5, -0.5, 1), (2, 3, 0, 6), (0, -1.5, 0, 0), (3, -3, 3, -3), (-2.5, 0.5, 1.5, -1)]
out = []
for w, x, b, y in cases:
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        exec(SOURCE, {"w": w, "x": x, "b": b, "y": y})
    out.append([[w, x, b, y], buf.getvalue().strip()])
print(json.dumps(out))
