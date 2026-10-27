import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/deep/backpropagation',
  title: 'Loss and backpropagation',
  level: 'intermediate',
  minutes: 55,
  kind: 'lesson',
  objectives: [
    'Compute every gradient of a 2-2-1 network by hand with the chain rule, from the loss back to the first layer',
    'Write the backward pass in NumPy and state the shape of every gradient',
    'Check backpropagation against central-difference numerical gradients',
    'Apply one gradient descent step and confirm the loss goes down',
  ],
  prerequisites: ['ml/deep/forward-propagation', 'ml/math/gradients-chain-rule'],
  concepts: [
    'backpropagation',
    'gradient-check',
    'chain-rule',
    'gradient',
    'loss-function',
    'mean-squared-error',
    'finite-difference',
    'learning-rate',
  ],
  references: [
    {
      title:
        'Deep Learning (Goodfellow, Bengio, Courville), section 6.5: Back-Propagation and Other Differentiation Algorithms',
      url: 'https://www.deeplearningbook.org/contents/mlp.html',
    },
    {
      title: 'Rumelhart, Hinton, Williams (1986): Learning representations by back-propagating errors',
      url: 'https://www.nature.com/articles/323533a0',
    },
    {
      title: 'CS231n notes: gradient checks',
      url: 'https://cs231n.github.io/neural-networks-3/#gradcheck',
    },
    {
      title: 'torch.autograd.gradcheck (PyTorch’s built-in gradient check)',
      url: 'https://docs.pytorch.org/docs/stable/generated/torch.autograd.gradcheck.gradcheck.html',
      version: 'PyTorch stable',
    },
  ],
} satisfies LessonMeta;
