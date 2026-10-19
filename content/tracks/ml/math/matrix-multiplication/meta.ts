import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/math/matrix-multiplication',
  title: 'Matrix multiplication, row × column',
  level: 'beginner',
  minutes: 40,
  kind: 'lesson',
  objectives: [
    'Compute any entry of a matrix product by hand as a row of A times a column of B',
    'Predict whether two shapes can be multiplied, and the shape of the result',
    'Connect each output entry to the NumPy code and the loop that compute it',
    'Recognize the shape errors NumPy raises and fix them',
  ],
  prerequisites: ['ml/math/matrices'],
  concepts: ['matrix', 'shape', 'dot-product', 'matrix-multiplication'],
  references: [
    {
      title: 'numpy.matmul (the @ operator)',
      url: 'https://numpy.org/doc/stable/reference/generated/numpy.matmul.html',
      version: 'NumPy 2.5',
    },
    {
      title: 'PEP 465: a dedicated infix operator for matrix multiplication',
      url: 'https://peps.python.org/pep-0465/',
      version: 'Python 3.5+',
    },
  ],
} satisfies LessonMeta;
