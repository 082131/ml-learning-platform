import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/math/tensors',
  title: 'Tensors and shapes: batch, channels, sequence',
  level: 'beginner',
  minutes: 35,
  kind: 'lesson',
  objectives: [
    'Describe a tensor by its number of dimensions and its shape',
    'Name the batch, channel and sequence dimensions in common data',
    'Reshape and transpose a tensor and predict the new shape',
  ],
  prerequisites: ['ml/math/matrix-multiplication'],
  concepts: [],
} satisfies LessonMeta;
