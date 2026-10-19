import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/math/matrix-multiplication',
  title: 'Matrix multiplication, row × column',
  level: 'beginner',
  minutes: 35,
  kind: 'lesson',
  objectives: [
    'Multiply two matrices by hand, one row and column at a time',
    'Predict whether two shapes can be multiplied and the result shape',
    'Connect each output cell to the NumPy code that computes it',
  ],
  prerequisites: ['ml/math/matrices'],
  concepts: [],
} satisfies LessonMeta;
