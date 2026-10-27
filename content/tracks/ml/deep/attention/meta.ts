import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/deep/attention',
  title: 'Attention: queries, keys and values',
  level: 'intermediate',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Compute Q, K and V from token vectors and state the shape of every intermediate',
    'Compute one row of attention weights by hand: scaled dot products, then a softmax',
    'Explain what the √d_k scaling and the causal mask do',
    'Read an attention heatmap and the output vector of a selected token',
  ],
  prerequisites: ['ml/deep/embeddings', 'ml/math/matrix-multiplication'],
  concepts: [
    'attention',
    'query-key-value',
    'softmax',
    'causal-mask',
    'matrix-multiplication',
    'transpose',
    'dot-product',
  ],
  references: [
    {
      title: 'Vaswani et al. (2017), Attention Is All You Need, section 3.2 (scaled dot-product attention)',
      url: 'https://arxiv.org/abs/1706.03762',
    },
    {
      title: 'PyTorch: scaled_dot_product_attention in torch.nn.functional',
      url: 'https://docs.pytorch.org/docs/stable/generated/torch.nn.functional.scaled_dot_product_attention.html',
      version: 'PyTorch 2.14',
    },
    {
      title: 'numpy.tril and numpy.where',
      url: 'https://numpy.org/doc/stable/reference/generated/numpy.tril.html',
      version: 'NumPy 2.5',
    },
    {
      title: 'Dao et al. (2022), FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness',
      url: 'https://arxiv.org/abs/2205.14135',
    },
  ],
} satisfies LessonMeta;
