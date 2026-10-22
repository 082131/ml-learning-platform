import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/practice/versioning',
  title: 'Dataset and model versioning',
  level: 'advanced',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Identify a dataset, config or model by a content hash instead of a file name',
    'Trace a model back to the exact data, config and code that produced it (its lineage)',
    'Predict which versions change when one input changes, and why two runs can share a model',
    'Version data alongside code with DVC and restore an old version',
  ],
  prerequisites: ['ml/practice/experiment-tracking'],
  concepts: ['content-hash', 'data-lineage', 'model-registry'],
  references: [
    {
      title: 'DVC: Versioning data and models (example scenario)',
      url: 'https://doc.dvc.org/example-scenarios/versioning-data-and-models',
      version: 'DVC 3.67',
    },
    {
      title: 'Python hashlib (SHA-256)',
      url: 'https://docs.python.org/3/library/hashlib.html',
      version: 'Python 3.13',
    },
    {
      title: 'NIST FIPS 180-4, Secure Hash Standard',
      url: 'https://csrc.nist.gov/pubs/fips/180-4/upd1/final',
    },
    {
      title: 'MLflow Model Registry',
      url: 'https://mlflow.org/docs/latest/ml/model-registry/',
      version: 'MLflow 3.17',
    },
  ],
} satisfies LessonMeta;
