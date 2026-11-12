import type { LessonMeta } from '@/lib/types';

export default {
  id: 'python/project/end-to-end',
  title: 'Project: from messy data to a PyTorch model',
  level: 'advanced',
  minutes: 240,
  kind: 'project',
  objectives: [
    'Clean and validate a messy raw table with a tested cleaning function',
    'Answer analysis questions with charts and a bootstrap interval',
    'Train a PyTorch model on the cleaned data and compare it with a baseline',
    'Write up what you found, with the numbers that support it',
  ],
  prerequisites: ['python/pytorch/training-loop', 'python/analysis/statistical-inference'],
  concepts: ['baseline-model', 'data-validation', 'training-loop'],
  references: [
    {
      title: 'pandas user guide',
      url: 'https://pandas.pydata.org/docs/user_guide/index.html',
      version: 'pandas 3.0',
    },
    {
      title: 'PyTorch tutorials',
      url: 'https://docs.pytorch.org/tutorials/',
      version: 'PyTorch 2.14',
    },
  ],
} satisfies LessonMeta;
