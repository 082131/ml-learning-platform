import type { LessonMeta } from '@/lib/types';

export default {
  id: 'inference/basics/tensors-graphs',
  title: 'Inputs, outputs, tensors, batches and computational graphs',
  level: 'beginner',
  minutes: 35,
  kind: 'lesson',
  objectives: [
    'Describe model inputs and outputs as tensors with shapes',
    'Explain how batching adds a dimension',
    'Read a computational graph of a small model',
  ],
  prerequisites: ['inference/basics/what-is-inference', 'ml/math/tensors'],
  concepts: [],
} satisfies LessonMeta;
