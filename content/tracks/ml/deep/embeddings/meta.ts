import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/deep/embeddings',
  title: 'Embeddings and vector similarity',
  level: 'intermediate',
  minutes: 40,
  kind: 'lesson',
  objectives: [
    'Look up a token’s embedding as a row of a (vocabulary, d) table, and show it equals a one-hot vector times the table',
    'Compute the cosine similarity of two embeddings by hand and say what it ignores',
    'Rank a token’s nearest neighbours by cosine similarity',
    'Explain what a 2-D embedding map can and cannot show about real, learned embeddings',
  ],
  prerequisites: ['ml/math/dot-product', 'ml/deep/tokenization'],
  concepts: ['embedding', 'token-id', 'vector', 'norm', 'dot-product', 'cosine-similarity'],
  references: [
    {
      title: 'torch.nn.Embedding',
      url: 'https://docs.pytorch.org/docs/stable/generated/torch.nn.Embedding.html',
      version: 'PyTorch 2.14',
    },
    {
      title: 'numpy.linalg.norm',
      url: 'https://numpy.org/doc/stable/reference/generated/numpy.linalg.norm.html',
      version: 'NumPy 2.5',
    },
    {
      title: 'Mikolov et al. (2013), Efficient Estimation of Word Representations in Vector Space (word2vec)',
      url: 'https://arxiv.org/abs/1301.3781',
    },
    {
      title:
        'Radford et al. (2019), Language Models are Unsupervised Multitask Learners (GPT-2: 768-dimensional embeddings in the smallest model)',
      url: 'https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf',
    },
  ],
} satisfies LessonMeta;
