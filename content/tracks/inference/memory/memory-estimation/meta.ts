import type { LessonMeta } from '@/lib/types';

export default {
  id: 'inference/memory/memory-estimation',
  title: 'Memory, VRAM, parameters, activations and KV cache',
  level: 'intermediate',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Count a transformer’s parameters from its config and turn them into weight memory for any precision',
    'Compute the KV cache for a given number of layers, key/value heads, sequence length and batch size',
    'Explain why activations, unlike in training, stay small during inference, and when they don’t',
    'Decide whether a model fits on a GPU and find the largest batch that does',
  ],
  prerequisites: ['inference/hardware/cpu-vs-gpu', 'ml/deep/transformers'],
  concepts: ['vram', 'kv-cache', 'activation-memory', 'grouped-query-attention', 'prefill', 'gibibyte'],
  references: [
    {
      title: 'Llama 3.1 architecture arguments (dim, n_layers, n_heads, n_kv_heads, ffn sizing)',
      url: 'https://github.com/meta-llama/llama-models/blob/main/models/sku_list.py',
      version: 'llama-models main branch, read 2026-10-19',
    },
    {
      title: 'GPT2Config defaults (vocab_size, n_positions, n_embd, n_layer, n_head)',
      url: 'https://github.com/huggingface/transformers/blob/main/src/transformers/models/gpt2/configuration_gpt2.py',
      version: 'Transformers main branch, read 2026-10-19',
    },
    {
      title: 'numpy.ndarray.nbytes',
      url: 'https://numpy.org/doc/stable/reference/generated/numpy.ndarray.nbytes.html',
      version: 'NumPy 2.5',
    },
    {
      title: 'PyTorch: CUDA semantics, memory management (caching allocator, memory_allocated vs memory_reserved)',
      url: 'https://pytorch.org/docs/stable/notes/cuda.html#memory-management',
      version: 'PyTorch stable docs, read 2026-10-19',
    },
    {
      title: 'Ainslie et al., GQA: Training Generalized Multi-Query Transformer Models from Multi-Head Checkpoints (2023)',
      url: 'https://arxiv.org/abs/2305.13245',
    },
    {
      title: 'Dao et al., FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness (2022)',
      url: 'https://arxiv.org/abs/2205.14135',
    },
    {
      title: 'Kwon et al., Efficient Memory Management for Large Language Model Serving with PagedAttention (2023)',
      url: 'https://arxiv.org/abs/2309.06180',
    },
  ],
} satisfies LessonMeta;
