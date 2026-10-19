import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/math/dot-product',
  title: 'Dot product, length, angle, similarity',
  level: 'beginner',
  minutes: 40,
  kind: 'lesson',
  objectives: [
    'Compute the dot product of two vectors by hand and with NumPy',
    'Compute a vector’s length from its dot product with itself',
    'Find the angle between two vectors from cos θ and read its sign',
    'Use cosine similarity to compare feature vectors',
  ],
  prerequisites: ['ml/math/scalars-vectors'],
  concepts: ['dot-product', 'norm', 'cosine-similarity', 'orthogonal', 'vector'],
  references: [
    {
      title: 'numpy.dot',
      url: 'https://numpy.org/doc/stable/reference/generated/numpy.dot.html',
      version: 'NumPy 2.5',
    },
    {
      title: 'numpy.linalg.norm',
      url: 'https://numpy.org/doc/stable/reference/generated/numpy.linalg.norm.html',
      version: 'NumPy 2.5',
    },
  ],
} satisfies LessonMeta;
