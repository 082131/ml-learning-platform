import type { GlossaryTerm } from '@/lib/types';

// Terms first taught in the Python course's pytorch chapter. Merged with content/glossary.ts.
export default [
  {
    id: 'torch-dataset',
    term: 'Dataset (PyTorch)',
    short:
      'A class with __len__ and __getitem__ that returns one example at a time, such as (features, label), for a DataLoader to batch.',
    introducedIn: 'python/pytorch/datasets-modules',
    aliases: ['torch.utils.data.Dataset'],
  },
  {
    id: 'dataloader',
    term: 'DataLoader',
    short:
      'PyTorch’s batching iterator: it draws indices (shuffled or not), fetches examples from a Dataset and stacks them into batch tensors.',
    introducedIn: 'python/pytorch/datasets-modules',
    aliases: ['torch.utils.data.DataLoader'],
  },
  {
    id: 'training-loop',
    term: 'Training loop',
    short:
      'The repeated cycle of forward pass, loss, backward pass and optimizer step over batches and epochs that fits a model’s parameters.',
    introducedIn: 'python/pytorch/training-loop',
    aliases: ['train loop', 'epoch'],
  },
] satisfies GlossaryTerm[];
