import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/deep/pytorch-basics',
  title: 'Building networks with PyTorch',
  level: 'intermediate',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Define a model as an nn.Module with nn.Linear layers and state the shape of every weight',
    'Write the PyTorch training step: zero_grad, forward, loss, backward, step',
    'Explain what autograd stores in .grad and why torch.no_grad() is used for evaluation',
    'Map each PyTorch call to the matrix math and the NumPy or TypeScript code it replaces',
  ],
  prerequisites: ['ml/deep/training-loop'],
  concepts: ['pytorch', 'nn-module', 'autograd', 'tensor', 'computation-graph', 'optimizer', 'sgd'],
  references: [
    {
      title: 'torch.nn.Linear (y = xAᵀ + b; weight shape (out_features, in_features))',
      url: 'https://docs.pytorch.org/docs/stable/generated/torch.nn.Linear.html',
      version: 'PyTorch 2.14',
    },
    {
      title: 'torch.nn.Module',
      url: 'https://docs.pytorch.org/docs/stable/generated/torch.nn.Module.html',
      version: 'PyTorch 2.14',
    },
    {
      title: 'torch.nn.BCELoss (reduction, and the log clamp at −100)',
      url: 'https://docs.pytorch.org/docs/stable/generated/torch.nn.BCELoss.html',
      version: 'PyTorch 2.14',
    },
    {
      title: 'torch.optim (zero_grad with set_to_none=True, step)',
      url: 'https://docs.pytorch.org/docs/stable/optim.html',
      version: 'PyTorch 2.14',
    },
    {
      title: 'torch.no_grad',
      url: 'https://docs.pytorch.org/docs/stable/generated/torch.no_grad.html',
      version: 'PyTorch 2.14',
    },
    {
      title: 'A gentle introduction to torch.autograd',
      url: 'https://docs.pytorch.org/tutorials/beginner/blitz/autograd_tutorial.html',
      version: 'PyTorch 2.14',
    },
  ],
} satisfies LessonMeta;
