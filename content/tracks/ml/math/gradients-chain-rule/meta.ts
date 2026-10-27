import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/math/gradients-chain-rule',
  title: 'Partial derivatives, gradients and the chain rule',
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Compute a partial derivative by holding the other inputs fixed',
    'Collect partial derivatives into a gradient and read its direction',
    'Apply the chain rule along a computation graph, one local derivative at a time',
    'Compute the gradient of a squared-error loss for a linear model',
  ],
  prerequisites: ['ml/math/functions-derivatives'],
  concepts: ['partial-derivative', 'gradient', 'chain-rule', 'computation-graph', 'derivative'],
  references: [
    {
      title: 'numpy.ndarray.T and the @ operator',
      url: 'https://numpy.org/doc/stable/reference/generated/numpy.matmul.html',
      version: 'NumPy 2.5',
    },
    {
      title: 'PyTorch: a gentle introduction to torch.autograd',
      url: 'https://docs.pytorch.org/tutorials/beginner/blitz/autograd_tutorial.html',
      version: 'PyTorch 2.x',
    },
  ],
} satisfies LessonMeta;
