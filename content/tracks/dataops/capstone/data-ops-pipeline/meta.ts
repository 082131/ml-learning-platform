import type { LessonMeta } from '@/lib/types';

export default {
  id: 'dataops/capstone/data-ops-pipeline',
  title: 'Capstone: a data operations pipeline for a labeled dataset',
  level: 'advanced',
  minutes: 600,
  kind: 'capstone',
  objectives: [
    'Build a pipeline that takes raw annotations to a versioned, validated, privacy-safe training set',
    'Gate every new batch on label agreement, label-error audits, schema checks and drift against a baseline',
    'Make any past training set reproducible from a manifest, and honour a deletion request across versions',
    'Write the runbook and dataset documentation another engineer can operate from',
  ],
  prerequisites: ['dataops/pipelines/retraining-triggers', 'dataops/pipelines/privacy-governance'],
  concepts: ['ml-data-lifecycle', 'cohens-kappa', 'data-baseline', 'content-hash', 'datasheet-for-datasets'],
  references: [
    {
      title: 'Gebru et al.: Datasheets for Datasets',
      url: 'https://arxiv.org/abs/1803.09010',
    },
    {
      title: 'Google: Rules of Machine Learning',
      url: 'https://developers.google.com/machine-learning/guides/rules-of-ml',
    },
  ],
} satisfies LessonMeta;
