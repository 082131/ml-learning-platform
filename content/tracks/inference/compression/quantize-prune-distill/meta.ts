import type { LessonMeta } from '@/lib/types';

export default {
  id: 'inference/compression/quantize-prune-distill',
  title: 'Quantization, pruning and distillation trade-offs',
  level: 'advanced',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Compare quantization, pruning and distillation',
    'Measure the accuracy cost of compression',
    'Choose a compression method for a latency or memory target',
  ],
  prerequisites: ['inference/precision/precision-quantization'],
  concepts: [],
} satisfies LessonMeta;
