import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/foundations/vectorization',
  title: 'Vectorization and broadcasting',
  level: 'beginner',
  minutes: 35,
  kind: 'lesson',
  objectives: [
    'Replace a Python loop with a vectorized NumPy expression',
    'Predict the result shape of a broadcast operation, or the error',
    'Measure loop vs vectorized time in your own browser and read the result',
  ],
  prerequisites: ['ml/foundations/numpy-arrays'],
  concepts: ['vectorization', 'broadcasting', 'boolean-mask', 'element-wise', 'axis'],
  references: [
    {
      title: 'NumPy: broadcasting',
      url: 'https://numpy.org/doc/stable/user/basics.broadcasting.html',
      version: 'NumPy 2.x',
    },
    {
      title: 'NumPy: universal functions (ufunc) basics',
      url: 'https://numpy.org/doc/stable/user/basics.ufuncs.html',
      version: 'NumPy 2.x',
    },
  ],
} satisfies LessonMeta;
