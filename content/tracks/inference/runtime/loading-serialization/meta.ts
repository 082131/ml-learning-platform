import type { LessonMeta } from '@/lib/types';

export default {
  id: 'inference/runtime/loading-serialization',
  title: 'Loading, serialization and checkpoints',
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Compare checkpoint formats (pickle-based .pt, safetensors, ONNX) by what they store and how they load',
    'Load weights without executing untrusted code',
    'Check that loaded weights match the expected names, shapes and dtypes',
    'Reduce model load time with memory mapping and lazy loading',
  ],
  prerequisites: ['inference/basics/tensors-graphs', 'ml/deep/pytorch-basics'],
  concepts: [],
} satisfies LessonMeta;
