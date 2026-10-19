import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/projects/capstone-classification',
  title: 'Capstone: end-to-end classification system',
  level: 'advanced',
  minutes: 600,
  kind: 'capstone',
  objectives: [
    'Deliver a classification system from data to evaluated, tested model',
    'Track experiments and justify the final model',
    'Document results, limits and how to reproduce them',
  ],
  prerequisites: ['ml/classical/project-classification', 'ml/practice/model-testing'],
  concepts: [],
} satisfies LessonMeta;
