import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/practice/model-testing',
  title: 'Model testing and evaluation pipelines',
  level: 'advanced',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Write tests for data, training code and model behavior',
    'Build an evaluation pipeline that runs on every model change',
    'Set pass or fail thresholds for a model release',
  ],
  prerequisites: ['ml/practice/ablations'],
  concepts: [],
} satisfies LessonMeta;
