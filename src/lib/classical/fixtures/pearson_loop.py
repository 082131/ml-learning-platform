import math

xs = {{xs}}
ys = {{ys}}
mx = sum(xs) / len(xs)
my = sum(ys) / len(ys)
sxy = sxx = syy = 0.0
for x, y in zip(xs, ys):
    sxy += (x - mx) * (y - my)
    sxx += (x - mx) * (x - mx)
    syy += (y - my) * (y - my)
r = sxy / math.sqrt(sxx * syy)
print(round(r, 3))
