import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/deep/training-loop',
  title: 'The training loop: batches, epochs and loss curves',
  level: 'intermediate',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Write a mini-batch training loop with shuffling, batches and epochs',
    'Compute the iterations per epoch, ceil(N / B), and the size of the last batch',
    'Explain why mini-batch loss curves are noisy and how batch size changes that',
    'Read training and validation loss curves to spot a learning rate that is too high or a model that overfits',
  ],
  prerequisites: ['ml/deep/optimizers'],
  concepts: [
    'mini-batch',
    'epoch',
    'iteration',
    'loss-curve',
    'batch',
    'training',
    'random-seed',
    'early-stopping',
  ],
  references: [
    {
      title: 'PyTorch tutorial: Optimizing model parameters (the training loop)',
      url: 'https://docs.pytorch.org/tutorials/beginner/basics/optimization_tutorial.html',
      version: 'PyTorch 2.14',
    },
    {
      title: 'torch.utils.data.DataLoader (batch_size, shuffle, drop_last)',
      url: 'https://docs.pytorch.org/docs/stable/data.html',
      version: 'PyTorch 2.14',
    },
    {
      title: 'numpy.random.Generator.permutation',
      url: 'https://numpy.org/doc/stable/reference/random/generated/numpy.random.Generator.permutation.html',
      version: 'NumPy 2.5',
    },
    {
      title: 'Goodfellow, Bengio and Courville, Deep Learning, section 8.1.3: Batch and minibatch algorithms',
      url: 'https://www.deeplearningbook.org/contents/optimization.html',
    },
  ],
} satisfies LessonMeta;
