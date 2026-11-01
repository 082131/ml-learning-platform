import type { LessonMeta } from '@/lib/types';

export default {
  id: 'data/features/training-serving',
  title: 'Feature pipelines and training-serving consistency',
  level: 'advanced',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Build features once and use the same code for training and serving',
    'Explain training-serving skew, and detect it by comparing feature distributions',
    'Compute point-in-time correct features, so training never sees values from the future',
    'Decide which features need streaming freshness and which can come from batch jobs',
  ],
  prerequisites: [
    'data/quality/observability-testing',
    'data/processing/batch-vs-stream',
    'ml/classical/features-scaling',
  ],
  concepts: [
    'point-in-time-correctness',
    'feature-pipeline',
    'feature-store',
    'population-stability-index',
    'training-serving-skew',
    'data-leakage',
    'event-time',
  ],
  references: [
    {
      title: 'pandas: merge_asof',
      url: 'https://pandas.pydata.org/docs/reference/api/pandas.merge_asof.html',
      version: 'pandas 3.0',
    },
    {
      title: 'Feast: point-in-time joins',
      url: 'https://docs.feast.dev/getting-started/concepts/point-in-time-joins',
    },
    {
      title: 'Google: Rules of Machine Learning (training-serving skew, rules 29 to 37)',
      url: 'https://developers.google.com/machine-learning/guides/rules-of-ml',
    },
    {
      title: 'TensorFlow Data Validation: training-serving skew detection',
      url: 'https://www.tensorflow.org/tfx/data_validation/get_started',
    },
  ],
} satisfies LessonMeta;
