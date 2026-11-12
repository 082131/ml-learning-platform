import type { LessonMeta } from '@/lib/types';

export default {
  id: 'python/pytorch/tensors-autograd',
  title: 'PyTorch tensors and autograd',
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Create tensors with an explicit dtype and device and convert to and from NumPy',
    'Predict result shapes of matmul, broadcasting, view and permute',
    'Compute gradients with requires_grad and backward, and read .grad',
    'Explain why gradients accumulate and when to use torch.no_grad',
  ],
  prerequisites: ['python/numpy/dtypes-random', 'ml/math/gradients-chain-rule'],
  concepts: ['tensor', 'autograd', 'computation-graph', 'gradient'],
  references: [
    {
      title: 'PyTorch: tensors',
      url: 'https://docs.pytorch.org/docs/2.14/tensors.html',
      version: 'PyTorch 2.14',
    },
    {
      title: 'PyTorch: a gentle introduction to torch.autograd',
      url: 'https://docs.pytorch.org/tutorials/beginner/blitz/autograd_tutorial.html',
      version: 'PyTorch 2.14',
    },
    {
      title: 'PyTorch: broadcasting semantics',
      url: 'https://docs.pytorch.org/docs/2.14/notes/broadcasting.html',
      version: 'PyTorch 2.14',
    },
  ],
} satisfies LessonMeta;
