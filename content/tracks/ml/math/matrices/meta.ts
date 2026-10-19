import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/math/matrices',
  title: 'Matrices: dimensions, indexing, addition and transpose',
  level: 'beginner',
  minutes: 35,
  kind: 'lesson',
  objectives: [
    'Read a matrix shape as rows × columns and index any cell',
    'Add matrices and transpose a matrix, predicting the result shape',
    'Explain how a dataset table maps to a matrix',
  ],
  prerequisites: ['ml/math/dot-product'],
  concepts: [],
} satisfies LessonMeta;
