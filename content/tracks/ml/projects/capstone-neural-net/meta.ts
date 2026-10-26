import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/projects/capstone-neural-net',
  title: 'Capstone: a neural network from scratch, then in PyTorch',
  level: 'advanced',
  minutes: 600,
  kind: 'capstone',
  objectives: [
    'Implement and train a neural network with only NumPy',
    'Verify the backward pass with a gradient check',
    'Rebuild it in PyTorch and match the results',
    'Explain every difference between the two versions',
  ],
  prerequisites: ['ml/deep/project-neural-net', 'ml/deep/pytorch-basics'],
  concepts: [],
  references: [
    {
      title: 'scikit-learn: load_digits',
      url: 'https://scikit-learn.org/1.9/modules/generated/sklearn.datasets.load_digits.html',
      version: 'scikit-learn 1.9',
    },
    {
      title: 'PyTorch: torch.nn.Linear',
      url: 'https://docs.pytorch.org/docs/2.14/generated/torch.nn.Linear.html',
      version: 'PyTorch 2.14',
    },
    {
      title: 'PyTorch: torch.nn.functional.cross_entropy',
      url: 'https://docs.pytorch.org/docs/2.14/generated/torch.nn.functional.cross_entropy.html',
      version: 'PyTorch 2.14',
    },
    { title: 'CS231n notes: gradient checks', url: 'https://cs231n.github.io/neural-networks-3/' },
  ],
} satisfies LessonMeta;
