import type { LessonMeta } from '@/lib/types';

export default {
  id: 'dataops/pipelines/retraining-triggers',
  title: 'Continuous training and retraining triggers',
  level: 'advanced',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Describe a continuous training pipeline: trigger, data snapshot, validation, training, evaluation gate and registry',
    'Compare scheduled, drift-triggered and performance-triggered retraining on accuracy and cost',
    'Explain how label delay weakens performance-based triggers, and what proxy signals fill the gap',
    'Choose a trigger policy and its thresholds for a given drift pattern and retraining cost',
  ],
  prerequisites: ['dataops/validation/baselines-drift', 'dataops/versioning/data-snapshots'],
  concepts: ['continuous-training', 'retraining-trigger', 'label-delay', 'data-drift', 'release-gate'],
  references: [
    {
      title: 'Google Cloud: MLOps: continuous delivery and automation pipelines in machine learning',
      url: 'https://cloud.google.com/architecture/mlops-continuous-delivery-and-automation-pipelines-in-machine-learning',
    },
    {
      title: 'Amazon SageMaker Pipelines: overview',
      url: 'https://docs.aws.amazon.com/sagemaker/latest/dg/pipelines.html',
    },
    {
      title: 'Gama et al.: A Survey on Concept Drift Adaptation (ACM Computing Surveys, 2014)',
      url: 'https://doi.org/10.1145/2523813',
    },
  ],
} satisfies LessonMeta;
