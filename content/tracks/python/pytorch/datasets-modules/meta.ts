import type { LessonMeta } from '@/lib/types';

export default {
  id: 'python/pytorch/datasets-modules',
  title: 'Datasets, DataLoaders and nn.Module',
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Wrap a cleaned DataFrame in a Dataset and batch it with a DataLoader',
    'State the shape of every batch, including the last, smaller one',
    'Build a model as an nn.Module and count its parameters',
    'Standardize features with statistics from the training split only',
  ],
  prerequisites: ['python/pytorch/tensors-autograd', 'python/core/classes-dataclasses'],
  concepts: ['torch-dataset', 'dataloader', 'nn-module', 'batch'],
  references: [
    {
      title: 'PyTorch: datasets and dataloaders',
      url: 'https://docs.pytorch.org/tutorials/beginner/basics/data_tutorial.html',
      version: 'PyTorch 2.14',
    },
    {
      title: 'PyTorch: torch.utils.data',
      url: 'https://docs.pytorch.org/docs/2.14/data.html',
      version: 'PyTorch 2.14',
    },
    {
      title: 'PyTorch: build the neural network',
      url: 'https://docs.pytorch.org/tutorials/beginner/basics/buildmodel_tutorial.html',
      version: 'PyTorch 2.14',
    },
  ],
} satisfies LessonMeta;
