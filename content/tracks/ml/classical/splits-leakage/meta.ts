import type { LessonMeta } from '@/lib/types';

const SK = 'scikit-learn 1.8';

export default {
  id: 'ml/classical/splits-leakage',
  title: 'Train, validation and test sets, and data leakage',
  level: 'intermediate',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Split a dataset into train, validation and test sets with a seed, and say what each set is for',
    'Compute split sizes from shares and reproduce them with scikit-learn’s train_test_split',
    'Explain, with numbers, why choosing features or fitting a scaler on all rows inflates the test score',
    'Recognize the common leaks (preprocessing on all rows, duplicates across splits, target leakage, time order) and fix them',
  ],
  prerequisites: ['ml/classical/features-scaling'],
  concepts: [
    'training-set',
    'validation-set',
    'test-set',
    'data-leakage',
    'generalization',
    'hyperparameter',
    'feature-selection',
  ],
  references: [
    {
      title: 'sklearn.model_selection.train_test_split',
      url: 'https://scikit-learn.org/stable/modules/generated/sklearn.model_selection.train_test_split.html',
      version: SK,
    },
    {
      title: 'Common pitfalls and recommended practices: data leakage',
      url: 'https://scikit-learn.org/stable/common_pitfalls.html',
      version: SK,
    },
    {
      title: 'sklearn.feature_selection.SelectKBest',
      url: 'https://scikit-learn.org/stable/modules/generated/sklearn.feature_selection.SelectKBest.html',
      version: SK,
    },
    {
      title: 'sklearn.neighbors.NearestCentroid',
      url: 'https://scikit-learn.org/stable/modules/generated/sklearn.neighbors.NearestCentroid.html',
      version: SK,
    },
    {
      title: 'sklearn.pipeline.make_pipeline',
      url: 'https://scikit-learn.org/stable/modules/generated/sklearn.pipeline.make_pipeline.html',
      version: SK,
    },
    {
      title: 'sklearn.preprocessing.StandardScaler',
      url: 'https://scikit-learn.org/stable/modules/generated/sklearn.preprocessing.StandardScaler.html',
      version: SK,
    },
  ],
} satisfies LessonMeta;
