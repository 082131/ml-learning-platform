import type { LessonMeta } from '@/lib/types';

export default {
  id: 'inference/memory/memory-estimation',
  title: 'Memory, VRAM, parameters, activations and KV cache',
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Estimate weight memory from parameter count and precision',
    'Estimate KV cache size from model shape, sequence length and batch',
    'Decide whether a model fits on a given GPU',
  ],
  prerequisites: ['inference/hardware/cpu-vs-gpu', 'ml/deep/transformers'],
  concepts: [],
} satisfies LessonMeta;
