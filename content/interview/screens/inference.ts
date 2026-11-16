import type { ScreenDef } from '@/lib/interview/types';

const NOT_DONE = 'raise NotImplementedError';

// Inference rounds mix numerics with small systems problems: a sampler, a batch scheduler, a cache.
export const inferenceScreen: ScreenDef = {
  id: 'inference',
  role: 'inference',
  title: 'Inference engineer coding screen',
  summary:
    'Three tasks from inference-infrastructure interviews: numerically careful sampling, a dynamic request batcher and a cache with eviction.',
  minutes: 55,
  passPercent: 70,
  tasks: [
    {
      id: 'scr-inf-topp',
      title: 'Stable softmax and nucleus sampling',
      domain: 'inference',
      brief: `Write \`softmax(logits, temperature=1.0)\` for a 1-D array. Divide the logits by \`temperature\` first. It must give finite, correct results for logits such as 1000 and -1000.

Write \`top_p_filter(logits, p, temperature=1.0)\` for nucleus sampling. Sort tokens by probability, highest first (ties by lower index), and keep the smallest prefix whose probabilities sum to at least \`p\`. Return \`(indices, probs)\`: the kept token indices in that order as a list of ints, and their probabilities renormalized to sum to 1 as a NumPy array. At least one token is always kept.`,
      starter: `import numpy as np

def softmax(logits, temperature=1.0):
    ${NOT_DONE}

def top_p_filter(logits, p, temperature=1.0):
    ${NOT_DONE}
`,
      solution: `import numpy as np

def softmax(logits, temperature=1.0):
    z = np.asarray(logits, dtype=float) / temperature
    z = z - z.max()
    e = np.exp(z)
    return e / e.sum()

def top_p_filter(logits, p, temperature=1.0):
    probs = softmax(logits, temperature)
    order = np.lexsort((np.arange(len(probs)), -probs))
    cum = np.cumsum(probs[order])
    n = int(np.searchsorted(cum, p - 1e-12)) + 1
    n = min(max(n, 1), len(probs))
    keep = order[:n]
    return [int(i) for i in keep], probs[keep] / probs[keep].sum()
`,
      checks: [
        {
          name: 'softmax is correct and does not overflow',
          points: 11,
          tests: `import numpy as np, warnings
warnings.simplefilter("error")
assert np.allclose(softmax(np.array([1.0, 2.0, 3.0])), [0.09003057, 0.24472847, 0.66524096])
_s = softmax(np.array([1000.0, 1000.0, -1000.0]))
assert np.all(np.isfinite(_s)) and np.allclose(_s, [0.5, 0.5, 0.0]), f"got {_s.tolist()}"
assert np.allclose(softmax(np.array([0.0, np.log(3.0)]), temperature=0.5), [0.1, 0.9]), "temperature divides the logits"
`,
        },
        {
          name: 'Keeps the smallest set reaching p',
          points: 14,
          tests: `import numpy as np
_lg = np.log(np.array([0.1, 0.5, 0.15, 0.25]))
_i, _p = top_p_filter(_lg, 0.7)
assert _i == [1, 3], f"got {_i}"
assert np.allclose(_p, [2 / 3, 1 / 3]) and abs(_p.sum() - 1) < 1e-12
_i, _ = top_p_filter(_lg, 0.76)
assert _i == [1, 3, 2], f"got {_i}"
assert top_p_filter(_lg, 1.0)[0] == [1, 3, 2, 0]
`,
        },
        {
          name: 'Edge cases: tiny p, ties, temperature',
          points: 10,
          tests: `import numpy as np
_i, _p = top_p_filter(np.array([0.0, 5.0, 1.0]), 1e-9)
assert _i == [1] and np.allclose(_p, [1.0]), "at least one token is kept"
_i, _ = top_p_filter(np.zeros(4), 0.5)
assert _i == [0, 1], f"equal probabilities are taken in index order, got {_i}"
_lg = np.array([2.0, 1.0, 0.0])
assert len(top_p_filter(_lg, 0.9, temperature=0.1)[0]) == 1, "a low temperature sharpens the distribution"
assert len(top_p_filter(_lg, 0.9, temperature=10.0)[0]) == 3, "a high temperature flattens it"
`,
        },
      ],
    },
    {
      id: 'scr-inf-batcher',
      title: 'Dynamic batcher',
      domain: 'inference',
      brief: `A model server collects requests into batches. Write \`make_batches(arrivals, max_batch, max_wait)\`.

\`arrivals\` is a sorted list of arrival times in milliseconds. A batch opens when the first waiting request arrives at time \`t0\`. It closes, and is dispatched, at the earlier of: the arrival time of its \`max_batch\`-th request, or \`t0 + max_wait\`. A request arriving exactly at \`t0 + max_wait\` still joins. The next batch opens at the next arrival; assume the model is always free.

Return a list of \`(dispatch_time, indices)\` where \`indices\` are positions in \`arrivals\`.

Also write \`mean_wait(arrivals, batches)\`: the average time requests spent waiting for dispatch, or 0.0 with no requests.`,
      starter: `def make_batches(arrivals, max_batch, max_wait):
    ${NOT_DONE}

def mean_wait(arrivals, batches):
    ${NOT_DONE}
`,
      solution: `def make_batches(arrivals, max_batch, max_wait):
    batches = []
    i = 0
    n = len(arrivals)
    while i < n:
        deadline = arrivals[i] + max_wait
        j = i
        while j + 1 < n and j + 1 - i < max_batch and arrivals[j + 1] <= deadline:
            j += 1
        full = j - i + 1 == max_batch
        batches.append((arrivals[j] if full else deadline, list(range(i, j + 1))))
        i = j + 1
    return batches

def mean_wait(arrivals, batches):
    if not arrivals:
        return 0.0
    total = sum(t - arrivals[i] for t, idx in batches for i in idx)
    return total / len(arrivals)
`,
      checks: [
        {
          name: 'Closes on size or on timeout, whichever is first',
          points: 14,
          tests: `_a = [0, 1, 2, 3, 50, 100, 104, 200]
_b = make_batches(_a, 3, 10)
assert _b == [(2, [0, 1, 2]), (13, [3]), (60, [4]), (110, [5, 6]), (210, [7])], f"got {_b}"
assert make_batches([0, 10], 4, 10) == [(10, [0, 1])], "an arrival exactly at the deadline joins the batch"
assert make_batches([0, 11], 4, 10) == [(10, [0]), (21, [1])]
assert make_batches([], 4, 10) == []
`,
        },
        {
          name: 'A batch size of 1 never waits',
          points: 8,
          tests: `_a = [5, 5, 9]
assert make_batches(_a, 1, 100) == [(5, [0]), (5, [1]), (9, [2])], f"got {make_batches(_a, 1, 100)}"
assert mean_wait(_a, make_batches(_a, 1, 100)) == 0
`,
        },
        {
          name: 'mean_wait shows the latency cost of batching',
          points: 13,
          tests: `_a = [0, 1, 2, 3, 50, 100, 104, 200]
_w = mean_wait(_a, make_batches(_a, 3, 10))
assert abs(_w - (2 + 1 + 0 + 10 + 10 + 10 + 6 + 10) / 8) < 1e-9, f"got {_w}"
assert mean_wait([], []) == 0.0
import random
_r = random.Random(2); _t = 0; _arr = []
for _ in range(5000):
    _t += _r.randrange(0, 4); _arr.append(_t)
_small = make_batches(_arr, 4, 5); _big = make_batches(_arr, 32, 50)
assert sorted(i for _, idx in _big for i in idx) == list(range(5000)), "every request is in exactly one batch"
assert all(len(idx) <= 32 and t - _arr[idx[0]] <= 50 for t, idx in _big)
assert len(_big) < len(_small) and mean_wait(_arr, _big) > mean_wait(_arr, _small), "bigger batches mean fewer dispatches and longer waits"
`,
        },
      ],
    },
    {
      id: 'scr-inf-lru',
      title: 'LRU response cache',
      domain: 'inference',
      brief: `Write a class \`LRUCache(capacity)\` for caching model responses.

\`get(key)\` returns the value or \`None\`, and counts as a use. \`put(key, value)\` inserts or updates and counts as a use; when the cache would exceed \`capacity\` it evicts the least recently used key. \`len(cache)\` is the number of stored keys. Keep \`hits\` and \`misses\` counters updated by \`get\`.

Both operations must run in O(1). A capacity of 0 stores nothing.`,
      starter: `class LRUCache:
    def __init__(self, capacity):
        ${NOT_DONE}

    def get(self, key):
        ${NOT_DONE}

    def put(self, key, value):
        ${NOT_DONE}

    def __len__(self):
        ${NOT_DONE}
`,
      solution: `from collections import OrderedDict

class LRUCache:
    def __init__(self, capacity):
        self.capacity = capacity
        self.data = OrderedDict()
        self.hits = 0
        self.misses = 0

    def get(self, key):
        if key not in self.data:
            self.misses += 1
            return None
        self.hits += 1
        self.data.move_to_end(key)
        return self.data[key]

    def put(self, key, value):
        if self.capacity <= 0:
            return
        if key in self.data:
            self.data.move_to_end(key)
        self.data[key] = value
        if len(self.data) > self.capacity:
            self.data.popitem(last=False)

    def __len__(self):
        return len(self.data)
`,
      checks: [
        {
          name: 'Evicts the least recently used key',
          points: 12,
          tests: `_c = LRUCache(2)
_c.put("a", 1); _c.put("b", 2)
assert _c.get("a") == 1
_c.put("c", 3)
assert _c.get("b") is None, "b was the least recently used"
assert _c.get("a") == 1 and _c.get("c") == 3 and len(_c) == 2
`,
        },
        {
          name: 'Updating a key refreshes it; counters are kept',
          points: 10,
          tests: `_c = LRUCache(2)
_c.put("a", 1); _c.put("b", 2); _c.put("a", 10); _c.put("c", 3)
assert _c.get("a") == 10 and _c.get("b") is None, "updating a made b the oldest"
assert (_c.hits, _c.misses) == (1, 1), f"got hits={_c.hits}, misses={_c.misses}"
_z = LRUCache(0); _z.put("k", 1)
assert _z.get("k") is None and len(_z) == 0, "capacity 0 stores nothing"
_n = LRUCache(1); _n.put("k", None)
assert len(_n) == 1
`,
        },
        {
          name: 'Constant-time operations at scale',
          points: 8,
          tests: `import time
_c = LRUCache(50_000)
_t = time.perf_counter()
for _i in range(200_000):
    _c.put(_i, _i)
    if _i % 3 == 0:
        _c.get(_i // 2)
assert time.perf_counter() - _t < 15, "too slow: get and put must not scan the cache"
assert len(_c) == 50_000 and _c.get(199_999) == 199_999 and _c.get(0) is None
`,
        },
      ],
    },
  ],
};
