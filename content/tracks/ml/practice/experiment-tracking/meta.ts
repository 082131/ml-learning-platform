import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/practice/experiment-tracking',
  title: 'Experiment tracking and reproducibility',
  level: 'advanced',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'List every input that determines a training run, including the hidden ones (seed, data version, library versions)',
    'Write a run record that lets someone else rebuild the run and check the result',
    'Control randomness with seeds, and know where seeding is not enough (GPU kernels, library upgrades)',
    'Compare two configs over several seeds and report the spread, not the luckiest run',
  ],
  prerequisites: ['ml/deep/training-loop'],
  concepts: ['experiment-tracking', 'random-seed', 'reproducibility', 'run-record'],
  references: [
    {
      title: 'PyTorch: Reproducibility (randomness notes)',
      url: 'https://docs.pytorch.org/docs/2.14/notes/randomness.html',
      version: 'PyTorch 2.14',
    },
    {
      title: 'MLflow Tracking',
      url: 'https://mlflow.org/docs/latest/ml/tracking/',
      version: 'MLflow 3.17',
    },
    {
      title: 'Python json module',
      url: 'https://docs.python.org/3/library/json.html',
      version: 'Python 3.13',
    },
    {
      title: 'Bouthillier et al., Accounting for Variance in Machine Learning Benchmarks (MLSys 2021)',
      url: 'https://arxiv.org/abs/2103.03098',
    },
  ],
} satisfies LessonMeta;
