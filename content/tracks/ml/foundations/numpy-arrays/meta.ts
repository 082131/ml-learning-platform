import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/foundations/numpy-arrays',
  title: 'NumPy arrays: shape, dtype and indexing',
  level: 'beginner',
  minutes: 35,
  kind: 'lesson',
  objectives: [
    'Create NumPy arrays and read their shape and dtype',
    'Index and slice 1-D and 2-D arrays, and predict the shape of the result',
    'Explain why arrays are faster than Python lists for numeric work',
  ],
  prerequisites: ['ml/foundations/python-collections'],
  concepts: ['numpy-array', 'shape', 'dtype', 'axis', 'reshape'],
  references: [
    {
      title: 'NumPy: the absolute basics for beginners',
      url: 'https://numpy.org/doc/stable/user/absolute_beginners.html',
      version: 'NumPy 2.x',
    },
    {
      title: 'NumPy: indexing on ndarrays',
      url: 'https://numpy.org/doc/stable/user/basics.indexing.html',
      version: 'NumPy 2.x',
    },
  ],
} satisfies LessonMeta;
