import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/deep/tokenization',
  title: 'Tokenization and token IDs',
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Explain why text must become numbers for a model',
    'Run byte-pair encoding on a toy vocabulary',
    'Predict how a tokenizer splits a new word',
  ],
  prerequisites: ['ml/foundations/python-collections'],
  concepts: [],
} satisfies LessonMeta;
