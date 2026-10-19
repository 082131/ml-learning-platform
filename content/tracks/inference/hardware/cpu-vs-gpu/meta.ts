import type { LessonMeta } from '@/lib/types';

export default {
  id: 'inference/hardware/cpu-vs-gpu',
  title: 'CPU vs GPU execution',
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Explain why GPUs run matrix math in parallel',
    'Decide when a CPU is good enough for inference',
    'Explain how data transfer between host and device costs time',
  ],
  prerequisites: ['inference/basics/tensors-graphs'],
  concepts: [],
} satisfies LessonMeta;
