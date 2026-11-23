import type { LessonMeta } from '@/lib/types';

export default {
  id: 'automation/cicd/model-delivery',
  title: 'Continuous delivery of models: gates, environments and rollbacks',
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Separate CI (is the code sound?) from CD (is this model ready to release?) for ML systems',
    'Write a release gate that compares a retrained challenger with the production champion fairly',
    'Use deployment environments, required reviewers and OIDC credentials to release safely',
    'Release gradually (staging, canary) with an automatic rollback path',
  ],
  prerequisites: ['automation/cicd/ml-ci-pipelines'],
  concepts: ['continuous-delivery', 'release-gate', 'champion-challenger', 'deployment-environment', 'model-registry', 'canary-release', 'rollback', 'oidc-federation'],
  references: [
    { title: 'Google Cloud: MLOps, continuous delivery and automation pipelines in machine learning', url: 'https://cloud.google.com/architecture/mlops-continuous-delivery-and-automation-pipelines-in-machine-learning' },
    { title: 'GitHub Docs: Managing environments for deployment', url: 'https://docs.github.com/en/actions/managing-workflow-runs-and-deployments/managing-deployments/managing-environments-for-deployment' },
    { title: 'GitHub Docs: About security hardening with OpenID Connect', url: 'https://docs.github.com/en/actions/security-for-github-actions/security-hardening-your-deployments/about-security-hardening-with-openid-connect' },
    { title: 'MLflow Model Registry: aliases', url: 'https://mlflow.org/docs/latest/model-registry/', version: '2.9+' },
  ],
} satisfies LessonMeta;
