import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/deep/optimizers',
  title: 'Gradient descent variants and optimizers: SGD, momentum, Adam',
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Compare batch, mini-batch and stochastic gradient descent',
    'Explain how momentum and Adam change each step',
    'Choose an optimizer and learning rate for a problem',
  ],
  prerequisites: ['ml/deep/backpropagation'],
  concepts: [],
} satisfies LessonMeta;
