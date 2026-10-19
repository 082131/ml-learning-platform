import type { LessonMeta } from '@/lib/types';

export default {
  id: 'inference/runtime/loading-serialization',
  title: 'Loading, serialization and checkpoints',
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Compare checkpoint formats and what they store',
    'Load a model safely without running untrusted code',
    'Reduce model load time',
  ],
  prerequisites: ['inference/basics/tensors-graphs'],
  concepts: [],
} satisfies LessonMeta;
