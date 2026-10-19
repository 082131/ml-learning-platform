import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/math/dot-product',
  title: 'Dot product, length, angle and similarity',
  level: 'beginner',
  minutes: 35,
  kind: 'lesson',
  objectives: [
    'Compute a dot product by hand and with NumPy',
    'Compute a vector length and the angle between two vectors',
    'Use cosine similarity to compare two vectors',
  ],
  prerequisites: ['ml/math/scalars-vectors'],
  concepts: [],
} satisfies LessonMeta;
