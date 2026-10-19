import type { LessonMeta } from '@/lib/types';

export default {
  id: 'inference/perf/gpu-bottlenecks',
  title: 'GPU utilization and bottleneck analysis',
  level: 'advanced',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Tell compute-bound from memory-bound work',
    'Read GPU utilization metrics and their limits',
    'Choose an optimization based on the bottleneck',
  ],
  prerequisites: ['inference/perf/profiling'],
  concepts: [],
} satisfies LessonMeta;
