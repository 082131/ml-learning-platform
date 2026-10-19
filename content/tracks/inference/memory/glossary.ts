import type { GlossaryTerm } from '@/lib/types';

// Glossary terms for the inference/memory chapter (merged into the glossary by content/index.ts).
export default [
  {
    id: 'vram',
    term: 'VRAM (GPU memory)',
    short: 'The memory on a GPU card. A model’s weights, KV cache and activations must all fit in it.',
    long: 'Data has to be in GPU memory for the GPU to compute on it quickly. When a request needs more than is free, the framework raises an out-of-memory error rather than slowing down.',
    introducedIn: 'inference/memory/memory-estimation',
    aliases: ['GPU memory', 'HBM', 'device memory'],
  },
  {
    id: 'kv-cache',
    term: 'KV cache',
    short:
      'The keys and values a transformer has already computed for earlier tokens, kept in memory so each new token only computes its own.',
    long: 'Its size is 2 × layers × key/value heads × head dimension × tokens × sequences × bytes per value. It grows with every generated token, so long contexts and large batches are limited by it.',
    introducedIn: 'inference/memory/memory-estimation',
    aliases: ['key-value cache', 'KV-cache'],
  },
  {
    id: 'activation-memory',
    term: 'Activation memory',
    short: 'The intermediate tensors a forward pass produces between layers, such as each layer’s output.',
    long: 'During inference a layer’s activations can be freed once the next layer has used them, so only about one layer’s worth is alive at a time. Training keeps them all for backpropagation.',
    introducedIn: 'inference/memory/memory-estimation',
    aliases: ['activations'],
  },
  {
    id: 'grouped-query-attention',
    term: 'Grouped-query attention (GQA)',
    short: 'Attention in which several query heads share one key head and one value head.',
    long: 'Llama 3.1 8B groups its 32 query heads into 8 key/value heads, which makes its KV cache 4 times smaller than caching all 32. With a single key/value head it is called multi-query attention (MQA).',
    introducedIn: 'inference/memory/memory-estimation',
    aliases: ['GQA', 'multi-query attention', 'MQA'],
  },
  {
    id: 'prefill',
    term: 'Prefill and decode',
    short:
      'The two phases of text generation: prefill processes the whole prompt at once; decode then generates one token per step.',
    long: 'Prefill fills the KV cache for the prompt and has the largest activations. Each decode step reads the whole cache and the weights to produce a single token per sequence.',
    introducedIn: 'inference/memory/memory-estimation',
    aliases: ['decode', 'decoding', 'prompt processing'],
  },
  {
    id: 'gibibyte',
    term: 'GiB (gibibyte)',
    short: '2³⁰ = 1,073,741,824 bytes. A GB (gigabyte) is 10⁹ bytes, about 7% less.',
    long: 'Memory tools such as nvidia-smi and PyTorch report binary units (MiB, GiB). 16,060,522,496 bytes is 16.06 GB but 14.96 GiB.',
    introducedIn: 'inference/memory/memory-estimation',
    aliases: ['GiB', 'MiB', 'KiB', 'gigabyte', 'GB'],
  },
] satisfies GlossaryTerm[];
