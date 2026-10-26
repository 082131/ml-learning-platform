import type { LessonMeta } from '@/lib/types';

export default {
  id: 'inference/ops/monitoring-load-testing',
  title: 'Monitoring, load testing and production debugging',
  level: 'advanced',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Load test a model server with open-loop arrivals and find its saturation point',
    'Monitor latency percentiles, error rate, throughput and GPU memory over time',
    'Set alerts from service-level objectives rather than averages',
    'Debug a production slowdown from metrics and traces',
  ],
  prerequisites: ['inference/serving/apis-containers', 'inference/perf/profiling'],
  concepts: [],
} satisfies LessonMeta;
