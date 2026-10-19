import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/classical/trees-ensembles',
  title: 'Decision trees, random forests and gradient boosting',
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Choose a tree split using Gini impurity',
    'Explain how a random forest combines many trees',
    'Explain how gradient boosting corrects earlier errors',
  ],
  prerequisites: ['ml/classical/logistic-regression'],
  concepts: [],
} satisfies LessonMeta;
