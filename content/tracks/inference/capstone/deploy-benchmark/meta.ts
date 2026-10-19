import type { LessonMeta } from '@/lib/types';

export default {
  id: 'inference/capstone/deploy-benchmark',
  title: 'Capstone: deploy, benchmark and optimize',
  level: 'advanced',
  minutes: 600,
  kind: 'capstone',
  objectives: [
    'Deploy a model and benchmark it under load',
    'Apply at least two optimizations and measure each',
    'Document the results with the method used',
  ],
  prerequisites: ['inference/ops/monitoring-load-testing', 'inference/compression/quantize-prune-distill'],
  concepts: [],
} satisfies LessonMeta;
