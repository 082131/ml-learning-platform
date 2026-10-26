import type { LessonMeta } from '@/lib/types';

export default {
  id: 'inference/basics/tensors-graphs',
  title: 'Inputs, outputs, tensors, batches and computational graphs',
  level: 'beginner',
  minutes: 35,
  kind: 'lesson',
  objectives: [
    'Describe a model’s inputs and outputs as tensors with a shape and a dtype',
    'Explain how batching adds a leading dimension and why a model must accept it',
    'Read the computational graph of a small network and follow a tensor’s shape through it',
    'Spot shape and dtype mismatches between preprocessing and the model',
  ],
  prerequisites: ['inference/basics/what-is-inference', 'ml/math/tensors'],
  concepts: [],
} satisfies LessonMeta;
