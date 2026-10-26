import type { LessonMeta } from '@/lib/types';

export default {
  id: 'inference/hardware/cpu-vs-gpu',
  title: 'CPU vs GPU execution',
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Explain why a GPU runs matrix multiplication with thousands of parallel threads and a CPU with a few wide cores',
    'Estimate when a model is small enough, or traffic light enough, for CPU inference',
    'Account for the cost of copying data between host and device memory',
    'Time the same model on CPU and GPU correctly, with warm-up and synchronization',
  ],
  prerequisites: ['inference/basics/tensors-graphs', 'ml/math/matrix-multiplication'],
  concepts: [],
} satisfies LessonMeta;
