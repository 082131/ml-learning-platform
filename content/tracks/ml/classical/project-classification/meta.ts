import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/classical/project-classification',
  title: 'Project: end-to-end classification model',
  level: 'intermediate',
  minutes: 180,
  kind: 'project',
  objectives: [
    'Build a classification pipeline from a raw CSV to a model scored once on a held-out test set',
    'Compare a baseline and two model families fairly with stratified cross-validation on training data only',
    'Keep preprocessing inside the pipeline so no statistics leak from validation or test rows',
    'Report the result with a confusion matrix, per-class precision and recall, and an error analysis',
  ],
  prerequisites: [
    'ml/classical/cross-validation',
    'ml/classical/metrics-error-analysis',
    'ml/classical/trees-ensembles',
  ],
  concepts: ['dataset', 'feature', 'label', 'model', 'baseline-model', 'ml-pipeline'],
  references: [
    {
      title: 'scikit-learn user guide: pipelines and composite estimators',
      url: 'https://scikit-learn.org/1.8/modules/compose.html',
      version: 'scikit-learn 1.8',
    },
    {
      title: 'sklearn.model_selection.train_test_split',
      url: 'https://scikit-learn.org/1.8/modules/generated/sklearn.model_selection.train_test_split.html',
      version: 'scikit-learn 1.8',
    },
    {
      title: 'sklearn.model_selection.cross_val_score',
      url: 'https://scikit-learn.org/1.8/modules/generated/sklearn.model_selection.cross_val_score.html',
      version: 'scikit-learn 1.8',
    },
    {
      title: 'sklearn.dummy.DummyClassifier',
      url: 'https://scikit-learn.org/1.8/modules/generated/sklearn.dummy.DummyClassifier.html',
      version: 'scikit-learn 1.8',
    },
    {
      title: 'palmerpenguins: Palmer Archipelago penguin data (CC0)',
      url: 'https://allisonhorst.github.io/palmerpenguins/',
      version: 'R package 0.1.0',
    },
  ],
} satisfies LessonMeta;
