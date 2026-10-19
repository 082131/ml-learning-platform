import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/deep/transformers',
  title: 'Transformer blocks and sequence modeling',
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Name the parts of a transformer block and their order',
    'Trace tensor shapes through a transformer block',
    'Explain the role of positional information and masking',
  ],
  prerequisites: ['ml/deep/attention'],
  concepts: [],
} satisfies LessonMeta;
