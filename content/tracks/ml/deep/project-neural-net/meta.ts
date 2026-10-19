import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/deep/project-neural-net',
  title: 'Project: train and evaluate a neural network',
  level: 'intermediate',
  minutes: 180,
  kind: 'project',
  objectives: [
    'Train a small neural network on a real dataset',
    'Tune learning rate and batch size with a validation set',
    'Report test results and failure cases',
  ],
  prerequisites: ['ml/deep/training-loop'],
  concepts: [],
} satisfies LessonMeta;
