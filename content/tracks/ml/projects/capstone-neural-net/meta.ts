import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/projects/capstone-neural-net',
  title: 'Capstone: a neural network from scratch, then in PyTorch',
  level: 'advanced',
  minutes: 600,
  kind: 'capstone',
  objectives: [
    'Implement and train a neural network with only NumPy',
    'Rebuild it in PyTorch and match the results',
    'Explain every difference between the two versions',
  ],
  prerequisites: ['ml/deep/project-neural-net', 'ml/deep/pytorch-basics'],
  concepts: [],
} satisfies LessonMeta;
