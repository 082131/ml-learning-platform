import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/deep/forward-propagation',
  title: 'Layers and forward propagation',
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Write a layer as a matrix multiply plus a bias',
    'Trace shapes through a small network',
    'Compute a forward pass by hand for a tiny network',
  ],
  prerequisites: ['ml/deep/neurons-activations', 'ml/math/matrix-multiplication'],
  concepts: [],
} satisfies LessonMeta;
