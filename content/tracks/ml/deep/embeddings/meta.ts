import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/deep/embeddings',
  title: 'Embeddings and vector similarity',
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Explain an embedding as a learned vector for a token',
    'Compare embeddings with cosine similarity',
    'Read a 2-D embedding map and its limits',
  ],
  prerequisites: ['ml/math/dot-product', 'ml/deep/tokenization'],
  concepts: [],
} satisfies LessonMeta;
