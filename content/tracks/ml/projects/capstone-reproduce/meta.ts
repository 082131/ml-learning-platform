import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/projects/capstone-reproduce',
  title: 'Capstone: reproduce an experiment and document it',
  level: 'advanced',
  minutes: 600,
  kind: 'capstone',
  objectives: [
    'Reproduce a published or course result from its description',
    'Document every difference between your result and the original',
    'Run an ablation to explain one of the differences',
  ],
  prerequisites: ['ml/practice/experiment-tracking', 'ml/practice/ablations'],
  concepts: [],
} satisfies LessonMeta;
