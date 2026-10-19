import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/math/scalars-vectors',
  title: 'Scalars, vectors and what a vector means geometrically',
  level: 'beginner',
  minutes: 35,
  kind: 'lesson',
  objectives: [
    'Tell a scalar from a vector and write both in Python and NumPy',
    'Draw a 2-D vector as an arrow from the origin and read its components',
    'Add two vectors and scale a vector, by hand and with NumPy',
    'Describe a data point as a vector of features',
  ],
  prerequisites: ['ml/foundations/numpy-arrays'],
  concepts: ['scalar', 'vector', 'element-wise', 'shape', 'feature'],
  references: [
    {
      title: 'NumPy: the absolute basics for beginners',
      url: 'https://numpy.org/doc/stable/user/absolute_beginners.html',
      version: 'NumPy 2.5',
    },
    {
      title: 'numpy.array',
      url: 'https://numpy.org/doc/stable/reference/generated/numpy.array.html',
      version: 'NumPy 2.5',
    },
  ],
} satisfies LessonMeta;
