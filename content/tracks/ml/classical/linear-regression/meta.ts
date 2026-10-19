import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/classical/linear-regression',
  title: 'Linear regression',
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Fit a line by adjusting slope and intercept and read the residuals',
    'Compute mean squared error',
    'Compare the closed-form solution with gradient descent',
  ],
  prerequisites: ['ml/math/loss-optimization', 'ml/classical/splits-leakage'],
  concepts: ['model', 'parameter'],
} satisfies LessonMeta;
