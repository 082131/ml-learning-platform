import type { LessonMeta } from '@/lib/types';

export default {
  id: 'python/numpy/indexing-views',
  title: 'NumPy indexing, views and copies',
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Index arrays with slices, integer arrays and boolean masks and state the result shape',
    'Tell whether an operation returns a view or a copy, and check it with np.shares_memory',
    'Reduce along an axis, with keepdims when the result must broadcast back',
    'Avoid accidental writes into the original array',
  ],
  prerequisites: ['ml/foundations/vectorization', 'python/core/references-mutability'],
  concepts: ['numpy-array', 'array-view', 'fancy-indexing', 'axis'],
  references: [
    {
      title: 'NumPy: indexing on ndarrays',
      url: 'https://numpy.org/doc/2.4/user/basics.indexing.html',
      version: 'NumPy 2.4',
    },
    {
      title: 'NumPy: copies and views',
      url: 'https://numpy.org/doc/2.4/user/basics.copies.html',
      version: 'NumPy 2.4',
    },
  ],
} satisfies LessonMeta;
