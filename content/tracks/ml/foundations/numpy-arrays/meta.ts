import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/foundations/numpy-arrays',
  title: 'NumPy arrays: shape, dtype and indexing',
  level: 'beginner',
  minutes: 35,
  kind: 'lesson',
  objectives: [
    'Create NumPy arrays and read their shape and dtype',
    'Index and slice 1-D and 2-D arrays',
    'Explain why arrays are faster than Python lists for numeric work',
  ],
  prerequisites: ['ml/foundations/python-collections'],
  concepts: [],
} satisfies LessonMeta;
