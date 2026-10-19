import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/deep/training-loop',
  title: 'The training loop: batches, epochs and loss curves',
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Write a training loop with batches and epochs',
    'Read training and validation loss curves',
    'Diagnose a training run that is not learning',
  ],
  prerequisites: ['ml/deep/optimizers'],
  concepts: ['training'],
} satisfies LessonMeta;
