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
  references: [
    {
      title: 'Pineau et al., Improving Reproducibility in Machine Learning Research (JMLR 2021)',
      url: 'https://jmlr.org/papers/v22/20-303.html',
    },
    {
      title: 'scikit-learn: LinearRegression',
      url: 'https://scikit-learn.org/1.9/modules/generated/sklearn.linear_model.LinearRegression.html',
      version: 'scikit-learn 1.9',
    },
    {
      title: 'Python statistics module (mean, stdev)',
      url: 'https://docs.python.org/3/library/statistics.html',
      version: 'Python 3.13',
    },
  ],
} satisfies LessonMeta;
