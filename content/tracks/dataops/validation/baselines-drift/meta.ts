import type { LessonMeta } from '@/lib/types';

export default {
  id: 'dataops/validation/baselines-drift',
  title: 'Data baselines, skew and drift detection',
  level: 'intermediate',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Build a baseline (schema plus statistics) from training data and validate new batches against it',
    'Tell covariate drift, label drift, concept drift and training-serving skew apart, and say which a data check can see',
    'Compute the Kolmogorov–Smirnov statistic and the population stability index for one feature, and read both',
    'Explain why a large sample makes tiny shifts statistically significant, and choose alert thresholds accordingly',
  ],
  prerequisites: ['dataops/foundations/data-centric-ml', 'data/quality/observability-testing', 'ml/math/statistics-intuition'],
  concepts: [
    'data-baseline',
    'data-drift',
    'concept-drift',
    'ks-test',
    'population-stability-index',
    'training-serving-skew',
    'p-value',
  ],
  references: [
    {
      title: 'TensorFlow Data Validation: get started (schema, anomalies, drift and skew)',
      url: 'https://www.tensorflow.org/tfx/data_validation/get_started',
    },
    {
      title: 'SciPy: scipy.stats.ks_2samp',
      url: 'https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.ks_2samp.html',
      version: 'SciPy 1.16',
    },
    {
      title: 'Amazon SageMaker Model Monitor: data quality baselines and constraints',
      url: 'https://docs.aws.amazon.com/sagemaker/latest/dg/model-monitor-data-quality.html',
    },
    {
      title: 'Google Cloud Vertex AI Model Monitoring: training-serving skew and prediction drift',
      url: 'https://cloud.google.com/vertex-ai/docs/model-monitoring/overview',
    },
    {
      title: 'Evidently: data drift presets and default tests',
      url: 'https://docs.evidentlyai.com/metrics/preset_data_drift',
    },
  ],
} satisfies LessonMeta;
