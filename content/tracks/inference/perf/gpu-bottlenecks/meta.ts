import type { LessonMeta } from '@/lib/types';

export default {
  id: 'inference/perf/gpu-bottlenecks',
  title: 'GPU utilization and bottleneck analysis',
  level: 'advanced',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Tell compute-bound from memory-bound kernels with arithmetic intensity and the roofline model',
    'Read GPU utilization and memory bandwidth metrics and know what each does not show',
    'Find stalls caused by the CPU, data loading or host-to-device copies',
    'Choose an optimization that targets the actual bottleneck and measure its effect',
  ],
  prerequisites: ['inference/perf/profiling', 'inference/hardware/cpu-vs-gpu'],
  concepts: [],
} satisfies LessonMeta;
