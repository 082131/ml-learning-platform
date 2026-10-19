import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/math/matrices',
  title: 'Matrices: dimensions, indexing, addition, transpose',
  level: 'beginner',
  minutes: 35,
  kind: 'lesson',
  objectives: [
    'Read a matrix’s shape and find any entry by its row and column index',
    'Add two matrices and say when addition is defined',
    'Transpose a matrix and predict the new shape',
    'Lay out a dataset as a matrix with one row per example',
  ],
  prerequisites: ['ml/math/dot-product'],
  concepts: ['matrix', 'shape', 'transpose', 'element-wise'],
  references: [
    {
      title: 'NumPy indexing on ndarrays',
      url: 'https://numpy.org/doc/stable/user/basics.indexing.html',
      version: 'NumPy 2.5',
    },
    {
      title: 'numpy.ndarray.T',
      url: 'https://numpy.org/doc/stable/reference/generated/numpy.ndarray.T.html',
      version: 'NumPy 2.5',
    },
  ],
} satisfies LessonMeta;
