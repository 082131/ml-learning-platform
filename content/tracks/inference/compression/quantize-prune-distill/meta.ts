import type { LessonMeta } from '@/lib/types';

export default {
  id: 'inference/compression/quantize-prune-distill',
  title: 'Quantization, pruning and distillation trade-offs',
  level: 'advanced',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Compare quantization, pruning and distillation by what each removes and what it costs to apply',
    'Prune a small model by weight magnitude and measure the accuracy change',
    'Distill a small student model from a larger teacher’s soft outputs',
    'Choose a compression method for a memory, latency or accuracy target and verify it on held-out data',
  ],
  prerequisites: ['inference/precision/precision-quantization', 'ml/deep/training-loop'],
  concepts: [],
} satisfies LessonMeta;
