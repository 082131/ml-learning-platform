import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/deep/optimizers',
  title: 'Gradient descent variants and optimizers: SGD, momentum, Adam',
  level: 'intermediate',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Compute one update of SGD, momentum and Adam by hand, including Adam’s bias correction',
    'Explain why momentum and Adam cross an elongated valley faster than plain gradient descent',
    'Predict when a learning rate makes gradient descent diverge on a quadratic',
    'Map each line of an Adam update to torch.optim.Adam and choose a starting learning rate',
  ],
  prerequisites: ['ml/deep/backpropagation'],
  concepts: ['optimizer', 'sgd', 'momentum', 'adam', 'bias-correction', 'parameter'],
  references: [
    {
      title: 'torch.optim.SGD (momentum, dampening and Nesterov options, with the update rule)',
      url: 'https://docs.pytorch.org/docs/stable/generated/torch.optim.SGD.html',
      version: 'PyTorch 2.14',
    },
    {
      title: 'torch.optim.Adam (the update rule and its defaults)',
      url: 'https://docs.pytorch.org/docs/stable/generated/torch.optim.Adam.html',
      version: 'PyTorch 2.14',
    },
    {
      title: 'Kingma and Ba, Adam: A Method for Stochastic Optimization (ICLR 2015)',
      url: 'https://arxiv.org/abs/1412.6980',
    },
    {
      title:
        'Goodfellow, Bengio and Courville, Deep Learning, chapter 8: Optimization for training deep models',
      url: 'https://www.deeplearningbook.org/contents/optimization.html',
    },
  ],
} satisfies LessonMeta;
