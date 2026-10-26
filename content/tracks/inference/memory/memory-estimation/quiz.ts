import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'weights-gb',
    type: 'numeric',
    prompt:
      'A model has 3 billion parameters stored in BF16. How many gigabytes (GB, 10⁹ bytes) do its weights take?',
    answer: 6,
    tolerance: 0,
    hint: 'BF16 uses 2 bytes per number. Multiply, then divide by 10⁹.',
    explain: '3,000,000,000 × 2 bytes = 6,000,000,000 bytes = 6 GB, which is 5.59 GiB.',
  },
  {
    id: 'kv-per-token',
    type: 'numeric',
    prompt:
      'A model has 32 layers, 8 key/value heads and a head dimension of 128, and caches keys and values in FP16. How many bytes of KV cache does one token of one sequence need?',
    answer: 131072,
    tolerance: 0,
    hint: 'Keys and values (2) × layers × KV heads × head dimension × bytes per value.',
    explain: '2 · 32 · 8 · 128 · 2 = 131,072 bytes, which is 128 KiB per token.',
  },
  {
    id: 'double-context',
    type: 'choice',
    prompt:
      'Llama 3.1 8B in BF16 serves one sequence. You raise the context from 4,096 to 8,192 tokens. Which part of the estimate doubles?',
    options: [
      {
        text: 'The KV cache (and the prefill activations), but not the weights',
        correct: true,
        explain:
          'Both scale with seq_len: the cache goes from 0.5 GiB to 1 GiB. The weights are stored once, whatever the length.',
      },
      {
        text: 'The total, because every term scales with the context',
        correct: false,
        explain:
          'The weights, 14.96 GiB here, do not depend on the context, so the total grows by far less than 2×.',
      },
      {
        text: 'The weights, because longer contexts need more parameters',
        correct: false,
        explain:
          'The parameter count is fixed by the architecture. Rotary position encodings have no weights at all.',
      },
    ],
  },
  {
    id: 'gqa',
    type: 'choice',
    prompt:
      'Llama 3.1 8B has 32 query heads but only 8 key/value heads (grouped-query attention). Compared with caching keys and values for all 32 heads, its KV cache is:',
    options: [
      {
        text: '4 times smaller',
        correct: true,
        explain: 'The cache scales with kv_heads: 8 instead of 32 is a quarter of the size.',
      },
      {
        text: 'The same size, because every query head still needs keys',
        correct: false,
        explain: 'Groups of 4 query heads read the same cached key and value, so they are stored once.',
      },
      {
        text: '32 times smaller',
        correct: false,
        explain: 'That would be multi-query attention with a single key/value head. Here there are 8.',
      },
    ],
  },
  {
    id: 'training',
    type: 'choice',
    prompt: 'Why does training the same model need much more memory than this inference estimate?',
    options: [
      {
        text: 'Training keeps every layer’s activations for backpropagation, and stores gradients and optimizer state for every weight',
        correct: true,
        explain:
          'Inference can free a layer’s activations once the next layer has them. Training needs them all for the backward pass, plus a gradient per weight and, with Adam, two more numbers per weight.',
      },
      {
        text: 'Training needs a much bigger KV cache',
        correct: false,
        explain:
          'The KV cache is an inference technique for generating one token at a time. Training processes whole sequences at once and does not keep one.',
      },
      {
        text: 'Training always uses FP32 weights, which are twice as big as FP16',
        correct: false,
        explain:
          'Precision matters, but it is not the main reason: mixed-precision training still needs activations, gradients and optimizer state.',
      },
    ],
  },
  {
    id: 'fit-steps',
    type: 'order',
    prompt: 'Put the steps for checking whether a model will fit on a GPU in order.',
    items: [
      'Read the layer count, hidden size, head counts and MLP width from the model’s config',
      'Multiply the parameter count by the bytes per weight',
      'Add the KV cache for the largest batch and context you will serve',
      'Add the activation peak and leave room for the framework’s own memory',
      'Compare the total with the GPU’s memory in GiB',
    ],
    explain:
      'Shapes first, then the fixed cost (weights), then the costs that grow with traffic, then the comparison.',
  },
];

export const kvExercise: Exercise = {
  id: 'kv-max-batch',
  prompt:
    'Write `kv_cache_bytes(...)` and `max_batch(gpu_bytes, weight_bytes, kv_bytes_per_sequence)`, which returns the largest batch whose weights and KV cache fit (0 if the weights alone do not).',
  starter: `def kv_cache_bytes(layers, kv_heads, head_dim, seq_len, batch, bytes_per_value):
    pass


def max_batch(gpu_bytes, weight_bytes, kv_bytes_per_sequence):
    pass`,
  hints: [
    'The cache stores a key and a value: `2 * layers * kv_heads * head_dim * seq_len * batch * bytes_per_value`.',
    'For max_batch, subtract the weights from the GPU memory first. If nothing is left, return 0.',
    'Use `//` so the result is a whole number of sequences: `(gpu_bytes - weight_bytes) // kv_bytes_per_sequence`.',
  ],
  solution: `def kv_cache_bytes(layers, kv_heads, head_dim, seq_len, batch, bytes_per_value):
    return 2 * layers * kv_heads * head_dim * seq_len * batch * bytes_per_value


def max_batch(gpu_bytes, weight_bytes, kv_bytes_per_sequence):
    free = gpu_bytes - weight_bytes
    if free <= 0:
        return 0
    return free // kv_bytes_per_sequence`,
  explanation:
    'The cache is the product of its six sizes and the bytes per value, the same numbers as the tensor’s shape. Once the weights are loaded, every sequence in the batch needs its own cache, so the number of sequences that fit is the free memory divided by one sequence’s cache, rounded down.',
  tests: `GiB = 2 ** 30
assert kv_cache_bytes(32, 8, 128, 8192, 1, 2) == GiB, 'Llama 3.1 8B, 8,192 tokens in BF16 should need exactly 1 GiB'
assert kv_cache_bytes(12, 12, 64, 1024, 1, 2) == 37748736, 'GPT-2 small, 1,024 tokens in FP16 should need 37,748,736 bytes'
assert kv_cache_bytes(32, 8, 128, 1, 4, 2) == 4 * 131072, 'one token for 4 sequences should need 4 x 131,072 bytes'
assert max_batch(24 * GiB, 16_060_522_496, GiB) == 9, 'Llama 3.1 8B in BF16 on 24 GiB with 1 GiB per sequence: 9 sequences fit'
assert max_batch(10, 20, 1) == 0, 'when the weights are bigger than the GPU, no batch fits'
assert isinstance(max_batch(24 * GiB, 16_060_522_496, GiB), int), 'max_batch should return a whole number'`,
};
