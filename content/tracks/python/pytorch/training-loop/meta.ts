import type { LessonMeta } from '@/lib/types';

export default {
  id: 'python/pytorch/training-loop',
  title: 'The training loop, evaluation and debugging',
  level: 'intermediate',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Write a training loop with zero_grad, backward and step in the right order',
    'Switch between train and eval modes and evaluate without tracking gradients',
    'Read loss curves for different learning rates and batch sizes',
    'Debug a model by overfitting one batch, and save and load a checkpoint',
  ],
  prerequisites: ['python/pytorch/datasets-modules'],
  concepts: ['training-loop', 'learning-rate', 'overfitting', 'checkpoint'],
  references: [
    {
      title: 'PyTorch: optimizing model parameters',
      url: 'https://docs.pytorch.org/tutorials/beginner/basics/optimization_tutorial.html',
      version: 'PyTorch 2.14',
    },
    {
      title: 'PyTorch: saving and loading models',
      url: 'https://docs.pytorch.org/tutorials/beginner/saving_loading_models.html',
      version: 'PyTorch 2.14',
    },
    {
      title: 'Karpathy (2019): A recipe for training neural networks',
      url: 'https://karpathy.github.io/2019/04/25/recipe/',
    },
  ],
} satisfies LessonMeta;
