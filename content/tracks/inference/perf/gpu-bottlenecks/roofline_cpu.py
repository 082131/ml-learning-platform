import time
import numpy as np

def best(f, repeat=7, number=5):
    f()
    ts = []
    for _ in range(repeat):
        t0 = time.perf_counter()
        for _ in range(number):
            f()
        ts.append((time.perf_counter() - t0) / number)
    return min(ts)

d = 8192
W = np.random.default_rng(0).standard_normal((d, d), dtype=np.float32)
print(f"W is {d} x {d} float32 = {W.nbytes / 2**20:.0f} MiB")
print(f"{'operation':22s} {'FLOP/byte':>9s} {'time':>9s} {'GFLOP/s':>8s} {'GB/s':>6s}")
for m in [1, 2, 8, 32, 128, 512]:
    x = np.random.default_rng(1).standard_normal((m, d), dtype=np.float32)
    t = best(lambda: x @ W)
    flops = 2 * m * d * d
    nbytes = 4 * (m * d + d * d + m * d)
    print(f"{'matmul, batch ' + str(m):22s} {flops / nbytes:9.2f} {t * 1e3:7.2f} ms {flops / t / 1e9:8.1f} {nbytes / t / 1e9:6.1f}")
n = 16 * 2**20
a = np.ones(n, dtype=np.float32); b = np.ones(n, dtype=np.float32); out = np.empty_like(a)
t = best(lambda: np.add(a, b, out=out))
print(f"{'add, 16M elements':22s} {n / (12 * n):9.2f} {t * 1e3:7.2f} ms {n / t / 1e9:8.1f} {12 * n / t / 1e9:6.1f}")
