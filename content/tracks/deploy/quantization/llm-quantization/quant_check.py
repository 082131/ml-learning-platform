"""Checks the lesson's plain-Python Q8_0/Q4_0 quantizer against gguf's NumPy reference (gguf.quants).

Run with the gguf package installed (0.19.0 was used): python quant_check.py
It prints the dequantized values from both for every lesson setting and asserts they are identical.
"""
import math
import struct

import numpy as np
from gguf import GGMLQuantizationType, quants

W = [0.0, 0.006, -0.0055, -0.0178, -0.0091, -0.0198, 0.0012, 0.0268, -0.0098, -0.0124, 0.0098, 0.0071, 0.0021,
     -0.0186, -0.0006, 0.0139, -0.0269, -0.0092, -0.038, -0.0258, -0.0368, -0.0047, -0.0253, 0.0054, 0.0031,
     -0.0037, -0.0503, -0.0108, -0.001, 0.0023, -0.0306, -0.0096, -0.0196, -0.0162, 0.0212, -0.0162, -0.0007,
     0.0177, -0.0117, -0.0022, 0.0022, 0.0013, -0.0245, 0.0015, 0.0272, -0.0309, 0.0172, 0.0024, -0.0128, 0.04,
     0.0152, -0.024, 0.0015, 0.0115, -0.0038, 0.0137, -0.0013, 0.0133, 0.0288, -0.0135, 0.0041, -0.0093, 0.0025,
     -0.0237]


def fp16(x):
    return struct.unpack("e", struct.pack("e", x))[0]


def lesson(block, fmt):
    if fmt == "Q8_0":
        d = max(abs(x) for x in block) / 127
        q = [math.floor(x / d + 0.5) if x >= 0 else -math.floor(-x / d + 0.5) for x in block]
        return [v * fp16(d) for v in q]
    m = max(block, key=abs)
    d = m / -8
    q = [min(15, int(x / d + 8.5)) for x in block]
    return [(v - 8) * fp16(d) for v in q]


for outlier in (False, True):
    w = list(W)
    if outlier:
        w[37] = 0.31
    for fmt, t in (("Q8_0", GGMLQuantizationType.Q8_0), ("Q4_0", GGMLQuantizationType.Q4_0)):
        # gguf works in float32: compare against float32 inputs
        x32 = np.array(w, dtype=np.float32)
        ref = quants.dequantize(quants.quantize(x32.reshape(1, -1), t), t).reshape(-1)
        mine = [v for i in range(0, 64, 32) for v in lesson([float(v) for v in x32[i:i + 32]], fmt)]
        same = np.array_equal(ref.astype(np.float64), np.array(mine, dtype=np.float32).astype(np.float64))
        print(f"outlier={outlier!s:5} {fmt}: identical to gguf.quants: {same}")
        assert same
