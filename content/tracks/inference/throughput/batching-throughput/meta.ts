import type { LessonMeta } from '@/lib/types';

export default {
  id: 'inference/throughput/batching-throughput',
  title: 'Batching, dynamic batching, latency vs throughput',
  level: 'advanced',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Explain the latency and throughput trade-off of batching',
    'Configure dynamic batching with a maximum batch size and wait time',
    'Read p50 and p95 latency from a simulation',
  ],
  prerequisites: ['inference/memory/memory-estimation'],
  concepts: [],
} satisfies LessonMeta;
