import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/classical/eda',
  title: 'Exploratory data analysis',
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Summarize each column of a dataset',
    'Find relationships between features and the target with plots',
    'Write down questions and hypotheses from what you see',
  ],
  prerequisites: ['ml/classical/data-cleaning', 'ml/foundations/matplotlib-plotting'],
  concepts: ['feature'],
} satisfies LessonMeta;
