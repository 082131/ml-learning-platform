import json, numpy as np, random
random.seed(1)
reprs = [0.1+0.2, 1e-05, 0.0001, 1.5e-07, 1e16, 1.2345e16, 123456789012345.6, 2.0, -0.0, 0.5, -3.75, 1/3, 2**0.5, 1e22, 5e-324, 100.0, 0.007]
fixed = [(0.0078125, 6), (0.125, 2), (0.375, 2), (2.5, 0), (3.5, 0), (-1e-9, 6), (1/3, 6), (2.0000005, 6), (123.456, 1), (-0.0625, 3), (1e20, 2)]
vecs = [([3,1.5],True),([-0.75,3.0],True),([6.0,2.0],True),([0.25,-10.0],True),([-3,1],False),([2.5,-0.125],True),([0.0,0.0],True),([-0.0,1.0],True),([4.5,-2.25,0.0],True),([12,-7,0],False)]
for _ in range(20):
    n = random.randint(2,4)
    vecs.append(([random.randint(-40,40)/4 for _ in range(n)], True))
out = {
 'repr': [[x, repr(x)] for x in reprs],
 'fixed': [[x, d, f"{x:.{d}f}"] for x, d in fixed],
 'vec': [[v, f, str(np.array(v, dtype=float if f else int))] for v, f in vecs],
}
print(json.dumps(out))
