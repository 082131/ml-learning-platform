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
  concepts: ['latency-percentile', 'warm-up', 'coordinated-omission', 'profiler'],
  references: [
    {
      title: 'numpy.percentile (method="linear" is the default)',
      url: 'https://numpy.org/doc/stable/reference/generated/numpy.percentile.html',
      version: 'NumPy 2.5',
    },
    {
      title: 'tracemalloc: trace memory allocations',
      url: 'https://docs.python.org/3/library/tracemalloc.html',
      version: 'Python 3.13',
    },
    {
      title: 'torch.profiler',
      url: 'https://pytorch.org/docs/stable/profiler.html',
      version: 'PyTorch stable docs, read 2026-11-01',
    },
    {
      title: 'torch.cuda.max_memory_allocated and reset_peak_memory_stats',
      url: 'https://pytorch.org/docs/stable/cuda.html#memory-management',
      version: 'PyTorch stable docs, read 2026-11-01',
    },
    {
      title: 'Gil Tene, How NOT to Measure Latency (talk on coordinated omission)',
      url: 'https://www.infoq.com/presentations/latency-response-time/',
    },
  ],
} satisfies LessonMeta;
