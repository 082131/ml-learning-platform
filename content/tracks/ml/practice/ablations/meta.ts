import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/practice/ablations',
  title: 'Error analysis and ablation studies',
  level: 'advanced',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Group errors into categories and find the biggest one',
    'Design an ablation that isolates one component',
    'Read an ablation table and draw a justified conclusion',
  ],
  prerequisites: ['ml/classical/metrics-error-analysis'],
  concepts: [],
} satisfies LessonMeta;
