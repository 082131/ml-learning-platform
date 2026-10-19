import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/classical/logistic-regression',
  title: 'Logistic regression and decision boundaries',
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Explain how the sigmoid turns a score into a probability',
    'Draw the decision boundary of a 2-D logistic model',
    'Train a logistic model and read its predictions',
  ],
  prerequisites: ['ml/classical/linear-regression'],
  concepts: ['label'],
} satisfies LessonMeta;
