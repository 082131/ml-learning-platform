import type { LessonMeta } from '@/lib/types';

export default {
  id: 'inference/perf/profiling',
  title: 'Latency, throughput and memory profiling',
  level: 'advanced',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Measure latency percentiles with warm-up, enough samples and correct GPU synchronization',
    'Profile where time goes in a request: preprocessing, transfer, model and postprocessing',
    'Measure peak memory and compare it with an estimate',
    'Avoid common benchmarking mistakes such as timing the first call or a closed-loop load',
  ],
  prerequisites: ['inference/throughput/batching-throughput'],
  concepts: [],
} satisfies LessonMeta;
