import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/deep/project-neural-net',
  title: 'Project: train and evaluate a neural network',
  level: 'intermediate',
  minutes: 240,
  kind: 'project',
  objectives: [
    'Train a small neural network on a real dataset, first in NumPy and then in PyTorch',
    'Tune the learning rate and batch size with a validation set, without touching the test set',
    'Report test results with a confusion matrix and examine the failure cases',
    'Make the whole run reproducible with pinned versions and seeds',
  ],
  prerequisites: ['ml/deep/training-loop', 'ml/deep/pytorch-basics'],
  concepts: ['mini-batch', 'epoch', 'early-stopping', 'random-seed', 'pytorch', 'reproducibility'],
  references: [
    {
      title: 'scikit-learn: load_breast_cancer',
      url: 'https://scikit-learn.org/1.9/modules/generated/sklearn.datasets.load_breast_cancer.html',
      version: 'scikit-learn 1.9',
    },
    {
      title: 'scikit-learn: train_test_split',
      url: 'https://scikit-learn.org/1.9/modules/generated/sklearn.model_selection.train_test_split.html',
      version: 'scikit-learn 1.9',
    },
    {
      title: 'PyTorch: torch.nn.BCEWithLogitsLoss',
      url: 'https://docs.pytorch.org/docs/2.14/generated/torch.nn.BCEWithLogitsLoss.html',
      version: 'PyTorch 2.14',
    },
    {
      title: 'PyTorch: torch.utils.data (Dataset, DataLoader)',
      url: 'https://docs.pytorch.org/docs/2.14/data.html',
      version: 'PyTorch 2.14',
    },
    {
      title: 'UCI Machine Learning Repository: Breast Cancer Wisconsin (Diagnostic)',
      url: 'https://archive.ics.uci.edu/dataset/17/breast+cancer+wisconsin+diagnostic',
    },
  ],
} satisfies LessonMeta;
