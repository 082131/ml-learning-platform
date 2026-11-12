import type { GlossaryTerm } from '@/lib/types';

// Glossary terms for the deploy/pipelines chapter (merged into the glossary by content/index.ts).
export default [
  {
    id: 'ml-workflow-pipeline',
    term: 'ML pipeline',
    short:
      'A sequence of steps (ingest, validate, build features, train, evaluate, register) that turns data into a deployable model, run by an orchestrator.',
    long: 'Each step is usually a container that reads input artifacts and writes output artifacts, so a run can be repeated, cached and audited.',
    introducedIn: 'deploy/pipelines/data-model-pipelines',
    aliases: ['training pipeline', 'Kubeflow pipeline'],
  },
  {
    id: 'pipeline-artifact',
    term: 'Pipeline artifact',
    short:
      'A versioned output of a pipeline step, such as a dataset snapshot, a feature table, a model file or a metrics report.',
    long: 'Artifacts are stored outside the step (object storage) and referenced by later steps, which makes lineage possible.',
    introducedIn: 'deploy/pipelines/data-model-pipelines',
    aliases: ['artifact'],
  },
  {
    id: 'step-cache',
    term: 'Step cache',
    short:
      'Reuse of a pipeline step’s earlier output when the step’s code and inputs are unchanged, instead of running it again.',
    long: 'The cache key is a hash of everything that could change the output. If any upstream output changes, the key changes and the step runs again.',
    introducedIn: 'deploy/pipelines/data-model-pipelines',
    aliases: ['pipeline caching', 'cache key'],
  },
] satisfies GlossaryTerm[];
