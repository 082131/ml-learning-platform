import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/math/gradients-chain-rule',
  title: 'Partial derivatives, gradients and the chain rule',
  level: 'beginner',
  minutes: 35,
  kind: 'lesson',
  objectives: [
    'Compute partial derivatives of a two-variable function',
    'Explain the gradient as the direction of steepest increase',
    'Apply the chain rule through a small computation graph',
  ],
  prerequisites: ['ml/math/functions-derivatives'],
  concepts: [],
} satisfies LessonMeta;
