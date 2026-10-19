import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/math/project-math',
  title: 'Project: matrix multiply and gradient descent from scratch',
  level: 'beginner',
  minutes: 180,
  kind: 'project',
  objectives: [
    'Implement matrix multiplication with loops and check it against NumPy',
    'Implement gradient descent on a simple loss',
    'Test both against hand-worked examples',
  ],
  prerequisites: ['ml/math/matrix-multiplication', 'ml/math/loss-optimization'],
  concepts: [],
} satisfies LessonMeta;
