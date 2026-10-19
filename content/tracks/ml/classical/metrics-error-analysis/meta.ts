import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/classical/metrics-error-analysis',
  title: 'Evaluation metrics and error analysis',
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Build a confusion matrix from predictions',
    'Compute precision, recall and F1 and pick a threshold',
    'Read a ROC curve and run a basic error analysis',
  ],
  prerequisites: ['ml/classical/logistic-regression'],
  concepts: [],
} satisfies LessonMeta;
