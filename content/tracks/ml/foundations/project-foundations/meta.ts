import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/foundations/project-foundations',
  title: 'Project: analyze a small dataset end to end',
  level: 'beginner',
  minutes: 180,
  kind: 'project',
  objectives: [
    'Load, clean and summarize a small dataset in Python',
    'Answer three questions about the data with numbers and plots',
    'Write up findings with the code that produced them',
  ],
  prerequisites: ['ml/foundations/matplotlib-plotting'],
  concepts: [],
} satisfies LessonMeta;
