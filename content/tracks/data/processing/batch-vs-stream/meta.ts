import type { LessonMeta } from '@/lib/types';

export default {
  id: 'data/processing/batch-vs-stream',
  title: 'Batch vs stream processing',
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Compare batch and stream processing on latency and completeness',
    'Explain event time, processing time and windows',
    'Explain how watermarks decide when a window is complete',
  ],
  prerequisites: ['data/etl/etl-vs-elt'],
  concepts: [],
} satisfies LessonMeta;
