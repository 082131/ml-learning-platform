import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/foundations/types-of-ml',
  title: 'Supervised, unsupervised and reinforcement learning',
  level: 'beginner',
  minutes: 35,
  kind: 'lesson',
  objectives: [
    'Sort a problem into supervised, unsupervised or reinforcement learning',
    'Explain what a label is and when one is available',
    'Pick a learning type for a new scenario and justify it',
  ],
  prerequisites: ['ml/foundations/what-is-ml'],
  concepts: ['supervised-learning', 'unsupervised-learning', 'label'],
} satisfies LessonMeta;
