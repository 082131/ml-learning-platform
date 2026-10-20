import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/math/tensors',
  title: 'Tensors and shapes (batch, channels, sequence)',
  level: 'beginner',
  minutes: 40,
  kind: 'lesson',
  objectives: [
    'Describe a tensor by its number of dimensions and its shape',
    'Name the batch, channel and sequence dimensions in common data',
    'Reshape and transpose a tensor and predict the new shape',
    'Predict the shape of a batched matrix product',
  ],
  prerequisites: ['ml/math/matrix-multiplication'],
  concepts: ['tensor', 'shape', 'axis', 'reshape', 'batch', 'transpose'],
  references: [
    {
      title: 'numpy.reshape',
      url: 'https://numpy.org/doc/stable/reference/generated/numpy.reshape.html',
      version: 'NumPy 2.5',
    },
    {
      title: 'numpy.transpose',
      url: 'https://numpy.org/doc/stable/reference/generated/numpy.transpose.html',
      version: 'NumPy 2.5',
    },
    {
      title: 'numpy.matmul: stacks of matrices',
      url: 'https://numpy.org/doc/stable/reference/generated/numpy.matmul.html',
      version: 'NumPy 2.5',
    },
  ],
} satisfies LessonMeta;
