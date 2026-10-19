import type { LessonMeta } from '@/lib/types';

export default {
  id: 'inference/perf/profiling',
  title: 'Latency, throughput and memory profiling',
  level: 'advanced',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Measure latency percentiles correctly',
    'Profile where time and memory go in an inference request',
    'Avoid common benchmarking mistakes such as missing warm-up',
  ],
  prerequisites: ['inference/throughput/batching-throughput'],
  concepts: [],
} satisfies LessonMeta;
