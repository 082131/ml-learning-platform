import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/practice/gpu-training',
  title: 'GPU fundamentals and training optimization',
  level: 'advanced',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Explain why GPUs speed up training',
    'Use mixed precision and batch size to trade memory for speed',
    'Find whether data loading or compute is the bottleneck',
  ],
  prerequisites: ['ml/deep/training-loop'],
  concepts: [],
} satisfies LessonMeta;
