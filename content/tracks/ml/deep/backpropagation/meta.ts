import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/deep/backpropagation',
  title: 'Loss and backpropagation',
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Compute gradients backwards through a 2-2-1 network with the chain rule',
    'Check a computed gradient against a numerical estimate',
    'Explain what each weight update does to the loss',
  ],
  prerequisites: ['ml/deep/forward-propagation', 'ml/math/gradients-chain-rule'],
  concepts: [],
} satisfies LessonMeta;
