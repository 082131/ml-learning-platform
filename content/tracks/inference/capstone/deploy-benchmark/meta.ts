import type { LessonMeta } from '@/lib/types';

export default {
  id: 'inference/capstone/deploy-benchmark',
  title: 'Capstone: deploy, benchmark and optimize',
  level: 'advanced',
  minutes: 600,
  kind: 'capstone',
  objectives: [
    'Deploy a model behind an API and benchmark its latency and throughput under load',
    'Apply at least two optimizations, such as quantization, batching or a different runtime, and measure each separately',
    'Check that each optimization keeps accuracy within a stated tolerance',
    'Write up the results with the hardware, versions and method needed to reproduce them',
  ],
  prerequisites: [
    'inference/ops/monitoring-load-testing',
    'inference/compression/quantize-prune-distill',
    'inference/perf/gpu-bottlenecks',
  ],
  concepts: [],
} satisfies LessonMeta;
