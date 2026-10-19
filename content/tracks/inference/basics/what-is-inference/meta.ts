import type { LessonMeta } from '@/lib/types';

export default {
  id: 'inference/basics/what-is-inference',
  title: 'Inference vs training',
  level: 'beginner',
  minutes: 35,
  kind: 'lesson',
  objectives: [
    'Explain the difference between training and inference',
    'List what changes in compute and memory at inference time',
    'Name the latency and throughput goals of a serving system',
  ],
  prerequisites: ['ml/foundations/what-is-ml'],
  concepts: ['inference', 'training'],
} satisfies LessonMeta;
