import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/math/scalars-vectors',
  title: 'Scalars, vectors and what a vector means geometrically',
  level: 'beginner',
  minutes: 35,
  kind: 'lesson',
  objectives: [
    'Tell a scalar from a vector and write both in NumPy',
    'Draw a 2-D vector as an arrow and add or scale vectors',
    'Explain how a data point becomes a vector of features',
  ],
  prerequisites: ['ml/foundations/numpy-arrays'],
  concepts: [],
} satisfies LessonMeta;
