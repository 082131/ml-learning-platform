import type { LessonMeta } from '@/lib/types';

export default {
  id: 'inference/ops/monitoring-load-testing',
  title: 'Monitoring, load testing and production debugging',
  level: 'advanced',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Load test a model server and find its saturation point',
    'Monitor latency, errors and resource use',
    'Debug a production slowdown from metrics',
  ],
  prerequisites: ['inference/serving/apis-containers', 'inference/perf/profiling'],
  concepts: [],
} satisfies LessonMeta;
