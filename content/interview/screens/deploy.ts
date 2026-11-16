import type { ScreenDef } from '@/lib/interview/types';

const NOT_DONE = 'raise NotImplementedError';

// Deployment rounds like small, exact implementations of the mechanisms you operate: quantization, autoscaling, rate limits.
export const deployScreen: ScreenDef = {
  id: 'deploy',
  role: 'deploy',
  title: 'Model deployment coding screen',
  summary:
    'Three mechanisms behind a model platform, implemented exactly: weight quantization, the Kubernetes autoscaling rule and a token-bucket rate limiter.',
  minutes: 50,
  passPercent: 70,
  tasks: [
    {
      id: 'scr-dep-quant',
      title: 'Symmetric int8 quantization',
      domain: 'deploy',
      brief: `Write \`quantize(w)\` for a float array. Use symmetric linear quantization to 8 bits: \`scale = max(abs(w)) / 127\`, \`q = round(w / scale)\` clipped to [-127, 127]. Return \`(q, scale)\` with \`q\` of dtype \`int8\` and \`scale\` a Python float. If every weight is 0, use a scale of 1.0.

Write \`dequantize(q, scale)\` returning float32 values \`q * scale\`.

Write \`quantize_per_row(W)\` for a 2-D array: quantize each row with its own scale and return \`(Q, scales)\`, where \`scales\` has shape (rows,).`,
      starter: `import numpy as np

def quantize(w):
    ${NOT_DONE}

def dequantize(q, scale):
    ${NOT_DONE}

def quantize_per_row(W):
    ${NOT_DONE}
`,
      solution: `import numpy as np

def quantize(w):
    w = np.asarray(w, dtype=float)
    peak = float(np.abs(w).max()) if w.size else 0.0
    scale = peak / 127 if peak > 0 else 1.0
    q = np.clip(np.round(w / scale), -127, 127).astype(np.int8)
    return q, scale

def dequantize(q, scale):
    return (np.asarray(q, dtype=np.float32) * np.float32(scale)).astype(np.float32)

def quantize_per_row(W):
    W = np.asarray(W, dtype=float)
    peaks = np.abs(W).max(axis=1)
    scales = np.where(peaks > 0, peaks / 127, 1.0)
    Q = np.clip(np.round(W / scales[:, None]), -127, 127).astype(np.int8)
    return Q, scales
`,
      checks: [
        {
          name: 'Quantizes to int8 with the right scale',
          points: 12,
          tests: `import numpy as np
_q, _s = quantize(np.array([0.0, 0.5, -1.27, 1.27, 0.004]))
assert _q.dtype == np.int8, f"dtype was {_q.dtype}"
assert abs(_s - 0.01) < 1e-12 and type(_s) is float, f"scale was {_s!r}"
assert _q.tolist() == [0, 50, -127, 127, 0], f"got {_q.tolist()}"
_q0, _s0 = quantize(np.zeros(3))
assert _q0.tolist() == [0, 0, 0] and _s0 == 1.0, "all-zero weights use scale 1.0"
`,
        },
        {
          name: 'Round trip error is within half a step',
          points: 10,
          tests: `import numpy as np
_rng = np.random.default_rng(0)
_w = _rng.normal(0, 0.05, 10_000)
_q, _s = quantize(_w)
_back = dequantize(_q, _s)
assert _back.dtype == np.float32
assert np.abs(_back - _w).max() <= _s / 2 + 1e-6, "error must not exceed half a quantization step"
assert _q.min() >= -127 and _q.max() <= 127 and (abs(int(_q.min())) == 127 or int(_q.max()) == 127)
`,
        },
        {
          name: 'Per-row scales protect small rows from one large row',
          points: 11,
          tests: `import numpy as np
_W = np.array([[0.01, -0.04, 0.005], [10.0, -4.0, 2.0], [0.0, 0.0, 0.0]])
_Q, _sc = quantize_per_row(_W)
assert _Q.dtype == np.int8 and _Q.shape == (3, 3) and np.shape(_sc) == (3,)
assert np.allclose(_sc, [0.04 / 127, 10.0 / 127, 1.0]), f"scales were {np.asarray(_sc).tolist()}"
assert _Q.tolist() == [[32, -127, 16], [127, -51, 25], [0, 0, 0]], f"got {_Q.tolist()}"
_q, _s = quantize(_W)
_err_all = np.abs(_q[0] * _s - _W[0]).max(); _err_row = np.abs(_Q[0] * _sc[0] - _W[0]).max()
assert _err_row < _err_all / 10, "per-row quantization should keep the small row accurate"
`,
        },
      ],
    },
    {
      id: 'scr-dep-hpa',
      title: 'Autoscaler replica rule',
      domain: 'deploy',
      brief: `The Kubernetes Horizontal Pod Autoscaler computes \`desired = ceil(current * metric / target)\`.

Write \`desired_replicas(current, metric, target, min_r, max_r, tolerance=0.1)\`. If the ratio \`metric / target\` is within \`tolerance\` of 1.0 (inclusive), keep \`current\`. Otherwise apply the formula. Always clamp the result to \`[min_r, max_r]\`.

Then write \`simulate(loads, capacity, target, min_r, max_r, start)\`. \`loads\` is the total load at each step and \`capacity\` is what one replica handles at 100% utilization. At each step the metric is \`load / (replicas * capacity)\`; record the replica count in use for that step, then update it with \`desired_replicas\` for the next step. Return the recorded counts.`,
      starter: `import math

def desired_replicas(current, metric, target, min_r, max_r, tolerance=0.1):
    ${NOT_DONE}

def simulate(loads, capacity, target, min_r, max_r, start):
    ${NOT_DONE}
`,
      solution: `import math

def desired_replicas(current, metric, target, min_r, max_r, tolerance=0.1):
    ratio = metric / target
    desired = current if abs(ratio - 1.0) <= tolerance else math.ceil(current * ratio)
    return max(min_r, min(max_r, desired))

def simulate(loads, capacity, target, min_r, max_r, start):
    replicas = start
    history = []
    for load in loads:
        history.append(replicas)
        metric = load / (replicas * capacity)
        replicas = desired_replicas(replicas, metric, target, min_r, max_r)
    return history
`,
      checks: [
        {
          name: 'Scales up and down by the ratio',
          points: 12,
          tests: `assert desired_replicas(4, 0.75, 0.5, 1, 20) == 6
assert desired_replicas(4, 0.2, 0.6, 1, 20) == 2, "ceil(4 * 0.2 / 0.6) = 2"
assert desired_replicas(3, 1.0, 0.5, 1, 20) == 6
assert desired_replicas(10, 0.0, 0.5, 2, 20) == 2, "zero load falls to the minimum"
assert type(desired_replicas(4, 0.75, 0.5, 1, 20)) is int
`,
        },
        {
          name: 'Tolerance band and clamping',
          points: 10,
          tests: `assert desired_replicas(10, 0.54, 0.5, 1, 50) == 10, "a ratio of 1.08 is inside the 10% band"
assert desired_replicas(10, 0.46, 0.5, 1, 50) == 10
assert desired_replicas(10, 0.56, 0.5, 1, 50) == 12, "a ratio of 1.12 scales up"
assert desired_replicas(10, 0.6, 0.5, 1, 50, tolerance=0.25) == 10
assert desired_replicas(10, 5.0, 0.5, 1, 30) == 30, "clamp to the maximum"
assert desired_replicas(1, 0.5, 0.5, 3, 30) == 3, "clamp to the minimum even inside the tolerance band"
`,
        },
        {
          name: 'simulate follows a load spike',
          points: 11,
          tests: `_h = simulate([100, 100, 400, 400, 400, 60, 60], capacity=100, target=0.5, min_r=1, max_r=6, start=2)
assert _h == [2, 2, 2, 6, 6, 6, 2], f"got {_h}"
assert simulate([], 100, 0.5, 1, 6, 3) == []
_h = simulate([300] * 5, capacity=100, target=0.5, min_r=1, max_r=4, start=1)
assert _h == [1, 4, 4, 4, 4], f"the maximum caps the count even when the target cannot be met, got {_h}"
`,
        },
      ],
    },
    {
      id: 'scr-dep-bucket',
      title: 'Token-bucket rate limiter',
      domain: 'deploy',
      brief: `A gateway limits each tenant in tokens per second. Write a class \`TokenBucket(rate, capacity)\`.

The bucket starts full with \`capacity\` tokens and refills continuously at \`rate\` tokens per second, never beyond \`capacity\`. \`allow(now, cost=1)\` is called with a clock reading in seconds that never decreases: refill for the time since the previous call, then if at least \`cost\` tokens are available, subtract them and return \`True\`; otherwise return \`False\` and subtract nothing.

Also provide \`retry_after(now, cost=1)\`: the seconds to wait from \`now\` until \`cost\` tokens will be available (0.0 if they already are), without changing the bucket. Return \`float("inf")\` if \`cost\` exceeds \`capacity\`.`,
      starter: `class TokenBucket:
    def __init__(self, rate, capacity):
        ${NOT_DONE}

    def allow(self, now, cost=1):
        ${NOT_DONE}

    def retry_after(self, now, cost=1):
        ${NOT_DONE}
`,
      solution: `class TokenBucket:
    def __init__(self, rate, capacity):
        self.rate = rate
        self.capacity = capacity
        self.tokens = float(capacity)
        self.last = None

    def _level(self, now):
        if self.last is None:
            return self.tokens
        return min(self.capacity, self.tokens + (now - self.last) * self.rate)

    def allow(self, now, cost=1):
        self.tokens = self._level(now)
        self.last = now
        if self.tokens >= cost:
            self.tokens -= cost
            return True
        return False

    def retry_after(self, now, cost=1):
        if cost > self.capacity:
            return float("inf")
        level = self._level(now)
        return 0.0 if level >= cost else (cost - level) / self.rate
`,
      checks: [
        {
          name: 'Allows a burst up to capacity, then the steady rate',
          points: 12,
          tests: `_b = TokenBucket(rate=2, capacity=5)
assert [_b.allow(0.0) for _ in range(6)] == [True] * 5 + [False], "a full bucket allows exactly capacity requests"
assert _b.allow(0.25) is False, "0.5 tokens is not enough"
assert _b.allow(0.5) is True, "two tokens per second gives one token after 0.5 s"
assert _b.allow(0.5) is False
`,
        },
        {
          name: 'Refill is capped; a refused request costs nothing',
          points: 10,
          tests: `_b = TokenBucket(rate=1, capacity=3)
assert all(_b.allow(0.0) for _ in range(3))
assert [_b.allow(1000.0) for _ in range(4)] == [True, True, True, False], "a long idle period refills only to capacity"
_c = TokenBucket(rate=1, capacity=10)
assert _c.allow(0.0, cost=8) is True
assert _c.allow(0.0, cost=5) is False, "only 2 tokens are left"
assert _c.allow(0.0, cost=2) is True, "the refused request must not have used tokens"
assert _c.allow(3.0, cost=3) is True and _c.allow(3.0, cost=1) is False
`,
        },
        {
          name: 'retry_after tells the client how long to wait',
          points: 12,
          tests: `_b = TokenBucket(rate=4, capacity=8)
assert _b.retry_after(0.0) == 0.0
assert _b.allow(0.0, cost=8) is True
assert abs(_b.retry_after(0.0, cost=2) - 0.5) < 1e-9, "2 tokens at 4 per second take 0.5 s"
assert abs(_b.retry_after(0.25, cost=2) - 0.25) < 1e-9, "retry_after accounts for time already passed"
assert _b.allow(0.5, cost=2) is True, "retry_after must not change the bucket"
assert _b.retry_after(0.5, cost=9) == float("inf"), "a cost above capacity can never be served"
`,
        },
      ],
    },
  ],
};
