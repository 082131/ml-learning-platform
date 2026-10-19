import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/math/loss-optimization',
  title: 'Loss functions and optimization',
  level: 'beginner',
  minutes: 35,
  kind: 'lesson',
  objectives: [
    'Explain what a loss function measures',
    'Run gradient descent by hand for a few steps',
    'Recognize when a learning rate is too small or makes training diverge',
  ],
  prerequisites: ['ml/math/gradients-chain-rule'],
  concepts: ['parameter'],
} satisfies LessonMeta;
