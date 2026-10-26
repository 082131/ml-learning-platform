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
    'Choose a decision threshold from the cost of each kind of error',
    'Document results, limits and how to reproduce them',
  ],
  prerequisites: ['ml/classical/project-classification', 'ml/practice/model-testing'],
  concepts: [],
  references: [
    {
      title: 'scikit-learn: load_breast_cancer',
      url: 'https://scikit-learn.org/1.9/modules/generated/sklearn.datasets.load_breast_cancer.html',
      version: 'scikit-learn 1.9',
    },
    {
      title: 'scikit-learn: Metrics and scoring',
      url: 'https://scikit-learn.org/1.9/modules/model_evaluation.html',
      version: 'scikit-learn 1.9',
    },
    {
      title: 'scikit-learn: Cross-validation',
      url: 'https://scikit-learn.org/1.9/modules/cross_validation.html',
      version: 'scikit-learn 1.9',
    },
    { title: 'MLflow Tracking', url: 'https://mlflow.org/docs/latest/ml/tracking/', version: 'MLflow 3' },
    {
      title: 'Mitchell et al., Model Cards for Model Reporting (2019)',
      url: 'https://arxiv.org/abs/1810.03993',
    },
  ],
} satisfies LessonMeta;
