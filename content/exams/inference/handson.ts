import type { HandsOnTask } from '@/lib/exam/types';

// Hands-on part of the Inference Engineer exam: 5 tasks, 100 points. NumPy and the standard library only:
// no GPU is needed, because every task is the planning, quantization or scheduling logic behind a real server.
// Every solution passes all its checks and every starter fails them (content/exams/exams-python.test.ts).

const NOT_DONE = 'raise NotImplementedError';

export const tasks: HandsOnTask[] = [
  {
    id: 'inference-h1',
    title: 'GPU memory and speed planner',
    domain: 'arch',
    brief: `Write three planning functions. Sizes are in bytes, bandwidth in bytes per second.

\`kv_bytes_per_token(layers, kv_heads, head_dim, dtype_bytes)\`: the KV cache size of one token (keys and values, every layer).

\`max_sequences(gpu_bytes, weight_bytes, reserve_frac, layers, kv_heads, head_dim, dtype_bytes, context)\`: how many full-length sequences fit. First keep \`reserve_frac\` of \`gpu_bytes\` free for activations and runtime; the rest minus the weights is KV budget. Return the whole number of sequences of \`context\` tokens that fit (0 if none, never negative).

\`decode_upper_bound(weight_bytes, bandwidth, batch)\`: the bandwidth-bound ceiling on total output tokens per second when every decode step reads all weights once and serves \`batch\` sequences (ignore KV reads).`,
    starter: `def kv_bytes_per_token(layers, kv_heads, head_dim, dtype_bytes):
    ${NOT_DONE}

def max_sequences(gpu_bytes, weight_bytes, reserve_frac, layers, kv_heads, head_dim, dtype_bytes, context):
    ${NOT_DONE}

def decode_upper_bound(weight_bytes, bandwidth, batch):
    ${NOT_DONE}
`,
    solution: `def kv_bytes_per_token(layers, kv_heads, head_dim, dtype_bytes):
    return 2 * layers * kv_heads * head_dim * dtype_bytes

def max_sequences(gpu_bytes, weight_bytes, reserve_frac, layers, kv_heads, head_dim, dtype_bytes, context):
    budget = gpu_bytes * (1 - reserve_frac) - weight_bytes
    per_seq = kv_bytes_per_token(layers, kv_heads, head_dim, dtype_bytes) * context
    return max(0, int(budget // per_seq))

def decode_upper_bound(weight_bytes, bandwidth, batch):
    return bandwidth / weight_bytes * batch
`,
    checks: [
      {
        name: 'KV bytes per token, with and without GQA',
        points: 6,
        tests: `assert kv_bytes_per_token(32, 32, 128, 2) == 524288, "32 layers x 32 heads x 128 dims x fp16 = 0.5 MiB"
assert kv_bytes_per_token(32, 8, 128, 2) == 131072, "8 KV heads (GQA) is 4x smaller"
assert kv_bytes_per_token(80, 8, 128, 1) == 163840, "fp8 KV cache"
`,
      },
      {
        name: 'Sequences that fit on the GPU',
        points: 8,
        tests: `_g = 80 * 10**9
assert max_sequences(_g, 16 * 10**9, 0.1, 32, 8, 128, 2, 8192) == 52, max_sequences(_g, 16 * 10**9, 0.1, 32, 8, 128, 2, 8192)
assert max_sequences(_g, 75 * 10**9, 0.1, 32, 8, 128, 2, 8192) == 0, "weights alone exceed the budget: return 0, not a negative number"
assert isinstance(max_sequences(_g, 16 * 10**9, 0.1, 32, 8, 128, 2, 4096), int)
`,
      },
      {
        name: 'Bandwidth-bound decode ceiling',
        points: 6,
        tests: `assert abs(decode_upper_bound(14e9, 2e12, 1) - 142.857142857) < 1e-6
assert abs(decode_upper_bound(14e9, 2e12, 32) - 4571.428571428) < 1e-6, "batching shares each weight read"
`,
      },
    ],
  },
  {
    id: 'inference-h2',
    title: 'Symmetric INT8 and grouped INT4 quantization',
    domain: 'optimize',
    brief: `Implement weight quantization with NumPy. \`W\` is a 2-D float array of shape (out_features, in_features).

\`quantize_per_channel(W, bits=8)\`: symmetric per-output-row quantization. For each row, \`scale = max(abs(row)) / qmax\` with \`qmax = 2**(bits-1) - 1\` (use scale 1.0 for an all-zero row). \`q = clip(round(W / scale), -qmax, qmax)\` as \`int8\`. Return \`(q, scales)\` with \`scales\` of shape (out_features, 1).

\`dequantize(q, scales)\` returns \`q * scales\` as float32.

\`quantize_grouped(W, bits=4, group=32)\`: the same symmetric scheme, but each row is split into consecutive groups of \`group\` columns (in_features is a multiple of \`group\`), each with its own scale. Return \`(q, scales)\` where \`q\` has W's shape and \`scales\` has shape (out_features, in_features // group).

\`dequantize_grouped(q, scales, group)\` reverses it.`,
    starter: `import numpy as np

def quantize_per_channel(W, bits=8):
    ${NOT_DONE}

def dequantize(q, scales):
    ${NOT_DONE}

def quantize_grouped(W, bits=4, group=32):
    ${NOT_DONE}

def dequantize_grouped(q, scales, group):
    ${NOT_DONE}
`,
    solution: `import numpy as np

def _scales(absmax, qmax):
    return np.where(absmax == 0, 1.0, absmax / qmax)

def quantize_per_channel(W, bits=8):
    qmax = 2 ** (bits - 1) - 1
    scales = _scales(np.abs(W).max(axis=1, keepdims=True), qmax)
    q = np.clip(np.round(W / scales), -qmax, qmax).astype(np.int8)
    return q, scales

def dequantize(q, scales):
    return (q * scales).astype(np.float32)

def quantize_grouped(W, bits=4, group=32):
    rows, cols = W.shape
    qmax = 2 ** (bits - 1) - 1
    Wg = W.reshape(rows, cols // group, group)
    scales = _scales(np.abs(Wg).max(axis=2), qmax)
    q = np.clip(np.round(Wg / scales[..., None]), -qmax, qmax).astype(np.int8)
    return q.reshape(rows, cols), scales

def dequantize_grouped(q, scales, group):
    rows, cols = q.shape
    qg = q.reshape(rows, cols // group, group)
    return (qg * scales[..., None]).reshape(rows, cols).astype(np.float32)
`,
    checks: [
      {
        name: 'Per-channel INT8 matches the definition',
        points: 6,
        tests: `import numpy as np
_W = np.array([[0.5, -1.27, 0.0], [2.54, 0.01, -0.3], [0.0, 0.0, 0.0]])
_q, _s = quantize_per_channel(_W)
assert _q.dtype == np.int8 and _s.shape == (3, 1)
assert np.allclose(_s[:, 0], [0.01, 0.02, 1.0]), _s
assert _q.tolist() == [[50, -127, 0], [127, 0, -15], [0, 0, 0]], _q.tolist()
`,
      },
      {
        name: 'Round trip error stays within half a step',
        points: 5,
        tests: `import numpy as np
_r = np.random.default_rng(0); _W = _r.normal(size=(64, 128)).astype(np.float32)
_q, _s = quantize_per_channel(_W)
_err = np.abs(dequantize(_q, _s) - _W)
assert np.all(_err <= _s / 2 + 1e-6), "symmetric rounding error is at most scale/2 per element"
assert dequantize(_q, _s).dtype == np.float32
`,
      },
      {
        name: 'Grouped INT4 shapes and range',
        points: 4,
        tests: `import numpy as np
_r = np.random.default_rng(1); _W = _r.normal(size=(8, 128))
_q, _s = quantize_grouped(_W, 4, 32)
assert _q.shape == (8, 128) and _s.shape == (8, 4), (_q.shape, _s.shape)
assert _q.min() >= -7 and _q.max() <= 7, "4-bit symmetric range is -7..7"
`,
      },
      {
        name: 'Groups beat per-row scales on outliers',
        points: 5,
        tests: `import numpy as np
_r = np.random.default_rng(2); _W = _r.normal(size=(16, 256)); _W[:, 3] *= 40
_q1, _s1 = quantize_per_channel(_W, 4)
_e1 = np.abs(dequantize(_q1, _s1) - _W).mean()
_q2, _s2 = quantize_grouped(_W, 4, 32)
_e2 = np.abs(dequantize_grouped(_q2, _s2, 32) - _W).mean()
assert _e2 < 0.5 * _e1, f"group error {_e2:.4f} should be far below per-row error {_e1:.4f} when one column has outliers"
`,
      },
    ],
  },
  {
    id: 'inference-h3',
    title: 'A paged KV cache block allocator',
    domain: 'gpu',
    brief: `Write a class \`BlockAllocator(num_blocks, block_size)\` like the one behind PagedAttention. Physical blocks are numbered 0 to num_blocks - 1 and each holds \`block_size\` tokens.

- \`free_blocks()\` returns how many blocks are free.
- \`add(seq_id, n_tokens)\` registers a new sequence holding \`n_tokens\` tokens, taking the blocks it needs. Always hand out the lowest-numbered free blocks first.
- \`append(seq_id)\` adds one token to the sequence, taking a new block only when its last block is full.
- \`table(seq_id)\` returns the list of physical block numbers for the sequence, in order.
- \`release(seq_id)\` frees all its blocks.

If an \`add\` or \`append\` needs more blocks than are free, raise \`MemoryError\` and change nothing. \`add\` with an existing \`seq_id\` raises \`ValueError\`.`,
    starter: `class BlockAllocator:
    def __init__(self, num_blocks, block_size):
        ${NOT_DONE}
`,
    solution: `import heapq

class BlockAllocator:
    def __init__(self, num_blocks, block_size):
        self.block_size = block_size
        self.free = list(range(num_blocks))
        heapq.heapify(self.free)
        self.tables = {}
        self.lengths = {}

    def free_blocks(self):
        return len(self.free)

    def _take(self, n):
        if n > len(self.free):
            raise MemoryError(f'need {n} blocks, {len(self.free)} free')
        return [heapq.heappop(self.free) for _ in range(n)]

    def add(self, seq_id, n_tokens):
        if seq_id in self.tables:
            raise ValueError(f'sequence {seq_id} exists')
        needed = -(-n_tokens // self.block_size)
        self.tables[seq_id] = self._take(needed)
        self.lengths[seq_id] = n_tokens

    def append(self, seq_id):
        if self.lengths[seq_id] % self.block_size == 0:
            self.tables[seq_id] += self._take(1)
        self.lengths[seq_id] += 1

    def table(self, seq_id):
        return list(self.tables[seq_id])

    def release(self, seq_id):
        for b in self.tables.pop(seq_id):
            heapq.heappush(self.free, b)
        del self.lengths[seq_id]
`,
    checks: [
      {
        name: 'Allocates ceil(tokens / block size) blocks',
        points: 5,
        tests: `_a = BlockAllocator(10, 16)
_a.add('x', 33)
assert _a.table('x') == [0, 1, 2] and _a.free_blocks() == 7
_a.add('y', 16)
assert _a.table('y') == [3], "16 tokens fill exactly one block"
`,
      },
      {
        name: 'Append takes a block only at a boundary',
        points: 5,
        tests: `_a = BlockAllocator(4, 4)
_a.add('s', 3)
_a.append('s')
assert _a.table('s') == [0], "4th token still fits block 0"
_a.append('s')
assert _a.table('s') == [0, 1] and _a.free_blocks() == 2
`,
      },
      {
        name: 'Released blocks are reused lowest first',
        points: 5,
        tests: `_a = BlockAllocator(6, 2)
_a.add('a', 4); _a.add('b', 2); _a.add('c', 2)
_a.release('a')
assert _a.free_blocks() == 4
_a.add('d', 5)
assert _a.table('d') == [0, 1, 4], _a.table('d')
`,
      },
      {
        name: 'Out of memory changes nothing',
        points: 5,
        tests: `_a = BlockAllocator(3, 8)
_a.add('a', 16)
try:
    _a.add('b', 9)
    raise AssertionError('expected MemoryError')
except MemoryError:
    pass
assert _a.free_blocks() == 1, "a failed add must not take any blocks"
_a.add('c', 8)
try:
    _a.append('c')
    raise AssertionError('expected MemoryError on append')
except MemoryError:
    pass
assert _a.table('c') == [2] and _a.free_blocks() == 0
try:
    _a.add('a', 1)
    raise AssertionError('expected ValueError for a duplicate id')
except ValueError:
    pass
`,
      },
    ],
  },
  {
    id: 'inference-h4',
    title: 'Static versus continuous batching',
    domain: 'gpu',
    brief: `Simulate a decode loop in steps. Each request is \`(arrival_step, output_tokens)\`; every step, each running request produces one token. A request that receives its last token at step \`t\` finishes at \`t\`, and its latency is \`t - arrival_step + 1\`.

\`continuous(requests, max_batch)\`: at the start of each step (from step 0), admit waiting requests that have arrived (\`arrival_step <= step\`) in arrival order (ties by list order) while fewer than \`max_batch\` are running. Then all running requests produce a token. Finished requests free their slot for the next step.

\`static(requests, max_batch)\`: a batch starts only when no batch is running. At that step, take up to \`max_batch\` arrived waiting requests in the same order; the batch runs until its longest request finishes, and no request joins midway. If nothing has arrived, wait.

Both return the list of latencies in the order of \`requests\`.`,
    starter: `def continuous(requests, max_batch):
    ${NOT_DONE}

def static(requests, max_batch):
    ${NOT_DONE}
`,
    solution: `def _order(requests):
    return sorted(range(len(requests)), key=lambda i: (requests[i][0], i))

def continuous(requests, max_batch):
    waiting = _order(requests)
    left = [n for _, n in requests]
    lat = [None] * len(requests)
    running, step = [], 0
    while waiting or running:
        while waiting and len(running) < max_batch and requests[waiting[0]][0] <= step:
            running.append(waiting.pop(0))
        for i in running:
            left[i] -= 1
            if left[i] == 0:
                lat[i] = step - requests[i][0] + 1
        running = [i for i in running if left[i] > 0]
        step += 1
    return lat

def static(requests, max_batch):
    waiting = _order(requests)
    lat = [None] * len(requests)
    step = 0
    while waiting:
        batch = [i for i in waiting if requests[i][0] <= step][:max_batch]
        if not batch:
            step += 1
            continue
        for i in batch:
            waiting.remove(i)
            lat[i] = step + requests[i][1] - 1 - requests[i][0] + 1
        step += max(requests[i][1] for i in batch)
    return lat
`,
    checks: [
      {
        name: 'Continuous batching fills freed slots',
        points: 7,
        tests: `_r = [(0, 2), (0, 10), (1, 3)]
assert continuous(_r, 2) == [2, 10, 4], continuous(_r, 2)
`,
      },
      {
        name: 'Static batching waits for the longest request',
        points: 7,
        tests: `_r = [(0, 2), (0, 10), (1, 3)]
assert static(_r, 2) == [2, 10, 12], static(_r, 2)
assert static([(5, 1)], 4) == [1], "an idle server waits for the first arrival"
`,
      },
      {
        name: 'Continuous batching wins on mixed lengths',
        points: 6,
        tests: `import random
_g = random.Random(7)
_r = sorted([(_g.randint(0, 50), _g.choice([4, 8, 64, 200])) for _ in range(40)])
_c, _s = continuous(_r, 8), static(_r, 8)
assert all(l >= n for l, (_, n) in zip(_c, _r)), "latency can never be below the output length"
assert sum(_c) < 0.6 * sum(_s), f"continuous total {sum(_c)} should be well below static {sum(_s)}"
assert continuous([(0, 3)] * 3, 1) == [3, 6, 9]
`,
      },
    ],
  },
  {
    id: 'inference-h5',
    title: 'Open-loop load test analysis',
    domain: 'reliability',
    brief: `Write the analysis code for a load test that avoids coordinated omission.

\`percentile(xs, p)\`: nearest-rank percentile: sort \`xs\`, return the element at rank \`ceil(p / 100 * n)\` (1-based), with rank at least 1.

\`open_loop(arrivals, service, servers)\`: requests arrive at the given times (sorted) no matter how slow the server is. Each needs \`service[i]\` seconds on one of \`servers\` identical workers, first come first served; a request starts on the worker that frees up earliest (at or after its arrival). Return each request's latency (finish time minus arrival time).

\`closed_loop(service, users, duration)\`: \`users\` virtual users each send a request, wait for the reply, and immediately send the next, with a single server (FIFO, \`service\` is a function of the request index \`k\` returning seconds, \`k\` counting all requests in send order). Simulate until time \`duration\`, recording the latency of each request that finishes by then. Ties in send time go to the lower user number. Return the list of latencies in completion order.

\`littles_law(rate, latency)\` returns the mean number of requests in the system.`,
    starter: `import heapq
import math

def percentile(xs, p):
    ${NOT_DONE}

def open_loop(arrivals, service, servers):
    ${NOT_DONE}

def closed_loop(service, users, duration):
    ${NOT_DONE}

def littles_law(rate, latency):
    ${NOT_DONE}
`,
    solution: `import heapq
import math

def percentile(xs, p):
    s = sorted(xs)
    rank = max(1, math.ceil(p / 100 * len(s)))
    return s[rank - 1]

def open_loop(arrivals, service, servers):
    free_at = [0.0] * servers
    heapq.heapify(free_at)
    out = []
    for t, s in zip(arrivals, service):
        start = max(t, heapq.heappop(free_at))
        heapq.heappush(free_at, start + s)
        out.append(start + s - t)
    return out

def closed_loop(service, users, duration):
    sends = [(0.0, u) for u in range(users)]
    heapq.heapify(sends)
    server_free, k, out = 0.0, 0, []
    while sends:
        t, u = heapq.heappop(sends)
        if t >= duration:
            break
        finish = max(t, server_free) + service(k)
        k += 1
        server_free = finish
        if finish <= duration:
            out.append(finish - t)
        heapq.heappush(sends, (finish, u))
    return out

def littles_law(rate, latency):
    return rate * latency
`,
    checks: [
      {
        name: 'Nearest-rank percentiles',
        points: 4,
        tests: `_x = [15, 20, 35, 40, 50]
assert percentile(_x, 30) == 20 and percentile(_x, 40) == 20 and percentile(_x, 50) == 35 and percentile(_x, 100) == 50
assert percentile(_x, 0) == 15
assert percentile(list(range(1, 1001)), 99) == 990
`,
      },
      {
        name: 'Open-loop queueing with several workers',
        points: 6,
        tests: `assert open_loop([0, 1, 2], [1, 1, 1], 1) == [1, 1, 1]
assert open_loop([0, 0, 0], [2, 2, 2], 2) == [2, 2, 4]
_o = open_loop([0, 0.5, 1.0, 1.5], [3, 0.1, 0.1, 0.1], 1)
assert all(abs(a - b) < 1e-9 for a, b in zip(_o, [3, 2.6, 2.2, 1.8])), _o
`,
      },
      {
        name: 'A stall: open loop sees it, closed loop hides it',
        points: 7,
        tests: `_svc = lambda k: 10.0 if k == 100 else 0.01
_closed = closed_loop(_svc, 1, 20.0)
assert sum(1 for x in _closed if x > 1) == 1, "the closed loop records the 10 s stall only once"
assert percentile(_closed, 99) < 0.02, f"closed-loop p99 {percentile(_closed, 99)} hides the stall"
_arr = [i * 0.02 for i in range(1000)]
_open = open_loop(_arr, [_svc(k) for k in range(1000)], 1)
assert percentile(_open, 99) > 5, f"open-loop p99 {percentile(_open, 99):.2f} must show requests stuck behind the stall"
`,
      },
      {
        name: "Little's law",
        points: 3,
        tests: `assert littles_law(200, 1.5) == 300
assert abs(littles_law(50, 0.02) - 1.0) < 1e-12
`,
      },
    ],
  },
];
