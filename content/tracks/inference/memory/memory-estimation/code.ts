// Code for the memory estimation lesson. The estimator's printout is checked against CPython 3.13 in
// src/lib/inference/memory.test.ts; the NumPy outputs below were produced with NumPy 2.5.3 on CPython 3.13.
import { MEMORY_SOURCE, memoryExperiment, memorySlots, type MemoryState } from '@/lib/inference/memory';
import type { CodeExample } from '@/lib/types';

const ESTIMATE_ID = 'memory-estimate';

/** Llama 3.1 8B in BF16 with one 8,192-token sequence: about 16.5 GiB, so it fits a 24 GiB card. */
export const initial: MemoryState = {
  model: 'llama-3.1-8b',
  weights: 'bf16',
  kv: 'bf16',
  batch: 1,
  seqLen: 8192,
  attention: 'fused',
  gpu: 24,
};

/** One state for the bar chart, the estimator code, its step-through and the readout. */
export const experiment = memoryExperiment('memory', initial, ESTIMATE_ID);

const st = (s: unknown) => s as MemoryState;

export const estimateCode: CodeExample = {
  id: ESTIMATE_ID,
  language: 'python',
  source: MEMORY_SOURCE,
  slots: Object.fromEntries(
    ['label', 'shape', 'params', 'batch', 'seq_len', 'w_bytes', 'kv_bytes', 'act_bytes', 'scores'].map(
      (k) => [k, (s: unknown) => memorySlots(st(s))[k]!],
    ),
  ),
  annotations: [
    {
      id: 'shape',
      range: { line: 2, startCol: 48, endCol: 57 },
      match: '{{shape}}',
      kind: 'parameter',
      title: 'The model’s shape',
      what: 'Layers, hidden size, query heads, key/value heads and MLP width, copied from the model’s published config.',
      why: 'Every term of the estimate is built from these five numbers, so a wrong one makes everything wrong. Read them from the config file, not from a blog post.',
    },
    {
      id: 'kv-heads',
      range: { line: 2, startCol: 23, endCol: 31 },
      match: 'kv_heads',
      kind: 'variable',
      title: 'kv_heads',
      what: 'How many key/value heads each layer stores. Grouped-query attention lets several query heads share one key/value head.',
      why: 'Only keys and values are cached, so the cache scales with kv_heads, not with the number of query heads.',
    },
    {
      id: 'head-dim',
      range: { line: 3, startCol: 18, endCol: 20 },
      match: '//',
      kind: 'math',
      title: '// (integer division)',
      what: 'Divides and rounds down to a whole number: 4096 // 32 = 128.',
      why: 'head_dim is used as a tensor size, and sizes must be integers. hidden / heads would give the float 128.0.',
      output: 'head_dim, an int',
    },
    {
      id: 'params',
      range: { line: 4, startCol: 0, endCol: 6 },
      match: 'params',
      kind: 'variable',
      title: 'params',
      what: 'The number of weights in the model, computed from the shapes (see the parameter count below).',
      why: 'Python allows underscores in numbers, so 8_030_261_248 reads as 8.03 billion.',
    },
    {
      id: 'bytes',
      range: { line: 6, startCol: 0, endCol: 7 },
      match: 'w_bytes',
      kind: 'variable',
      title: 'w_bytes: bytes per weight',
      what: '4 for FP32, 2 for FP16 or BF16, 1 for INT8 and 0.5 for INT4.',
      why: 'Precision is the cheapest lever on memory: halving the bytes per weight halves the biggest term.',
    },
    {
      id: 'act-bytes',
      range: { line: 6, startCol: 19, endCol: 28 },
      match: 'act_bytes',
      kind: 'variable',
      title: 'act_bytes',
      what: 'Bytes per activation value. With INT8 or INT4 weights it stays 2, because the weights are turned back into 16-bit floats for the math.',
      why: 'Quantizing weights does not by itself shrink activations.',
    },
    {
      id: 'weights',
      range: { line: 8, startCol: 10, endCol: 26 },
      match: 'params * w_bytes',
      kind: 'math',
      title: 'params * w_bytes',
      what: 'Weight memory: every parameter stored once.',
      why: 'Weights are loaded once and shared by every request, so this term does not change with batch size or sequence length.',
      output: 'Bytes for the weights',
    },
    {
      id: 'kv-two',
      range: { line: 9, startCol: 11, endCol: 14 },
      match: '2 *',
      kind: 'math',
      title: '2 * (keys and values)',
      what: 'Each layer caches one key vector and one value vector per head and token.',
      why: 'Forgetting this factor halves the estimate.',
    },
    {
      id: 'kv-per-token',
      range: { line: 9, startCol: 24, endCol: 43 },
      match: 'kv_heads * head_dim',
      kind: 'math',
      title: 'kv_heads * head_dim',
      what: 'The width of one key (or value) for one token in one layer.',
      why: 'For Llama 3.1 8B it is 8 · 128 = 1,024 numbers, a quarter of the 4,096 that 32 key/value heads would need.',
    },
    {
      id: 'kv-grows',
      range: { line: 9, startCol: 46, endCol: 61 },
      match: 'seq_len * batch',
      kind: 'math',
      title: 'seq_len * batch',
      what: 'The cache holds an entry for every token of every sequence being generated.',
      why: 'This is the term that grows while the server runs: longer conversations and bigger batches both add to it.',
    },
    {
      id: 'act-width',
      range: { line: 10, startCol: 12, endCol: 41 },
      match: '2 * hidden + 2 * intermediate',
      kind: 'math',
      title: 'Values per token at a layer’s widest point',
      what: 'Inside the MLP, the layer’s input and output (hidden wide each) and two intermediate tensors (intermediate wide each) are alive at the same time.',
      why: 'A rough estimate: real frameworks may keep a few more temporaries. The naive attention kernel adds heads · seq_len scores per token.',
    },
    {
      id: 'gib',
      range: { line: 14, startCol: 6, endCol: 13 },
      match: '2 ** 30',
      kind: 'math',
      title: '2 ** 30 bytes = 1 GiB',
      what: 'A gibibyte is 1,073,741,824 bytes, about 7% more than a gigabyte (10⁹ bytes).',
      why: 'nvidia-smi and PyTorch report memory in binary units (MiB, GiB), so we compare in GiB.',
    },
    {
      id: 'format',
      range: { line: 15, startCol: 34, endCol: 39 },
      match: ':9.2f',
      kind: 'syntax',
      title: ':9.2f',
      what: 'Formats the number with 2 decimals, right-aligned in 9 characters.',
      why: 'Lines the four results up in a column.',
    },
  ],
};

/** Counting Llama 3.1 8B's parameters from its shapes. Pure Python, so it runs without packages. */
export const paramCount: CodeExample = {
  id: 'memory-param-count',
  language: 'python',
  run: 'pyodide',
  source: `vocab, hidden, layers = 128256, 4096, 32
heads, kv_heads, intermediate = 32, 8, 14336
head_dim = hidden // heads                      # 128

attention = 2 * hidden * hidden + 2 * hidden * kv_heads * head_dim   # Q, O and K, V
mlp = 3 * hidden * intermediate                 # gate, up and down projections
norms = 2 * hidden                              # two RMSNorm scales per layer
per_layer = attention + mlp + norms

embeddings = vocab * hidden                     # token embedding table
output_head = vocab * hidden                    # not shared with the embeddings in Llama 3.1
total = embeddings + layers * per_layer + hidden + output_head   # + final norm

print(f"per layer: {per_layer:,}")
print(f"total:     {total:,}")`,
  annotations: [
    {
      id: 'attn',
      range: { line: 5 },
      kind: 'math',
      title: 'Attention weights',
      what: 'Q and O map hidden → hidden. K and V map hidden → kv_heads · head_dim = 1,024, which is smaller because of grouped-query attention.',
      why: '2 · 4096² + 2 · 4096 · 1024 = 41,943,040 weights per layer.',
    },
    {
      id: 'mlp',
      range: { line: 6 },
      kind: 'math',
      title: 'MLP weights',
      what: 'Three matrices of 4096 × 14336: two project up (one of them gates the other), one projects back down.',
      why: '3 · 4096 · 14336 = 176,160,768: the MLP holds about 80% of each layer’s weights.',
    },
    {
      id: 'heads-out',
      range: { line: 11 },
      kind: 'math',
      title: 'The output head',
      what: 'Turns the final hidden vector into one score per vocabulary token.',
      why: 'Some models reuse (tie) the embedding table here, GPT-2 for example. Llama 3.1 8B stores a separate one, 525,336,576 more weights.',
    },
  ],
  expectedOutput: 'per layer: 218,112,000\ntotal:     8,030,261,248',
};

/** NumPy reports the bytes an array really occupies. Output from NumPy 2.5.3. */
export const measureNbytes: CodeExample = {
  id: 'memory-nbytes',
  language: 'python',
  run: 'pyodide',
  source: `import numpy as np

W = np.zeros((4096, 4096), dtype=np.float32)    # one 4096 x 4096 weight matrix
print(W.nbytes)                                 # 4096 * 4096 * 4 bytes
print(W.astype(np.float16).nbytes)              # half the bytes per number

# A KV cache for GPT-2 small: (layers, K and V, batch, kv_heads, seq_len, head_dim)
layers, batch, kv_heads, seq_len, head_dim = 12, 1, 12, 1024, 64
cache = np.zeros((layers, 2, batch, kv_heads, seq_len, head_dim), dtype=np.float16)
print(cache.shape)
print(cache.nbytes)
print(2 * layers * kv_heads * head_dim * seq_len * batch * 2)   # the formula, 2 bytes per value`,
  annotations: [
    {
      id: 'nbytes',
      range: { line: 4, startCol: 6, endCol: 14 },
      match: 'W.nbytes',
      kind: 'framework',
      title: '.nbytes',
      what: 'The number of bytes the array’s data occupies: number of elements × bytes per element.',
      why: 'It is a measurement of this array, not an estimate, and it agrees with the formula.',
      output: '67108864 for 4096 · 4096 float32 values',
    },
    {
      id: 'astype',
      range: { line: 5, startCol: 6, endCol: 26 },
      match: 'W.astype(np.float16)',
      kind: 'framework',
      title: '.astype(np.float16)',
      what: 'Makes a copy with every value converted to a 16-bit float.',
      why: 'Same shape, half the bytes: 33,554,432.',
    },
    {
      id: 'cache-shape',
      range: { line: 9 },
      kind: 'framework',
      title: 'The cache as one tensor',
      what: 'Six dimensions: layer, key-or-value, sequence in the batch, key/value head, token position and position within the head.',
      why: 'Multiplying the six sizes and the bytes per value is exactly the KV cache formula.',
      output: 'shape (12, 2, 1, 12, 1024, 64), 37,748,736 bytes = 36 MiB',
    },
  ],
  expectedOutput: '67108864\n33554432\n(12, 2, 1, 12, 1024, 64)\n37748736\n37748736',
};
