import type { LessonMeta } from '@/lib/types';

export default {
  id: 'deploy/pipelines/data-model-pipelines',
  title: 'Data and model pipelines: steps, artifacts, caching and a model registry',
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Describe an ML pipeline as steps that pass versioned artifacts to each other',
    'Predict which steps a pipeline re-runs after a change, from content-based cache keys',
    'Gate the promotion of a model on evaluation results and record its lineage in a registry',
    'Map these ideas onto Kubeflow Pipelines, Argo Workflows and MLflow',
  ],
  prerequisites: ['deploy/foundations/deployment-map', 'data/orchestration/dags-retries'],
  concepts: ['ml-workflow-pipeline', 'pipeline-artifact', 'step-cache', 'content-hash', 'model-registry', 'data-lineage', 'release-gate'],
  references: [
    {
      title: 'Kubeflow Pipelines: caching',
      url: 'https://www.kubeflow.org/docs/components/pipelines/user-guides/core-functions/caching/',
      version: 'KFP v2',
    },
    { title: 'Kubeflow Pipelines: components', url: 'https://www.kubeflow.org/docs/components/pipelines/concepts/component/' },
    { title: 'Argo Workflows documentation', url: 'https://argo-workflows.readthedocs.io/' },
    { title: 'MLflow Model Registry', url: 'https://mlflow.org/docs/latest/ml/model-registry/' },
    { title: 'scikit-learn: load_digits', url: 'https://scikit-learn.org/stable/modules/generated/sklearn.datasets.load_digits.html', version: 'scikit-learn 1.9' },
  ],
} satisfies LessonMeta;
