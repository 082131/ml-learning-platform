import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/deep/pytorch-basics',
  title: 'Building networks with PyTorch',
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Build a model with torch.nn and run a forward pass',
    'Write a PyTorch training loop with an optimizer and a loss',
    'Map each PyTorch call to the math it performs',
  ],
  prerequisites: ['ml/deep/training-loop'],
  concepts: [],
} satisfies LessonMeta;
