import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/practice/experiment-tracking',
  title: 'Experiment tracking and reproducibility',
  level: 'advanced',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Record configs, seeds, metrics and code versions for each run',
    'Reproduce a run from its record',
    'Compare runs in a table and pick the best one fairly',
  ],
  prerequisites: ['ml/deep/training-loop'],
  concepts: [],
} satisfies LessonMeta;
