import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/deep/attention',
  title: 'Attention: queries, keys and values',
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Compute attention weights from queries and keys',
    'Combine values using the attention weights',
    'Read an attention heatmap for a sentence',
  ],
  prerequisites: ['ml/deep/embeddings', 'ml/math/matrix-multiplication'],
  concepts: [],
} satisfies LessonMeta;
