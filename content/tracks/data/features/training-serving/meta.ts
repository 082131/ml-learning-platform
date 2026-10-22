import type { LessonMeta } from '@/lib/types';

export default {
  id: 'data/features/training-serving',
  title: 'Feature pipelines and training-serving consistency',
  level: 'advanced',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Build features once and use the same code for training and serving',
    'Explain training-serving skew, and detect it by comparing feature distributions',
    'Compute point-in-time correct features, so training never sees values from the future',
    'Decide which features need streaming freshness and which can come from batch jobs',
  ],
  prerequisites: [
    'data/quality/observability-testing',
    'data/processing/batch-vs-stream',
    'ml/classical/features-scaling',
  ],
  concepts: ['event-time', 'stream-processing', 'batch-processing'],
} satisfies LessonMeta;
