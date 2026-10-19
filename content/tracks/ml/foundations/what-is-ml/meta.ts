import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/foundations/what-is-ml',
  title: 'What AI, ML and deep learning actually mean',
  level: 'beginner',
  minutes: 35,
  kind: 'lesson',
  objectives: [
    'Tell apart artificial intelligence, machine learning and deep learning with one example of each',
    'Explain the difference between a hand-written rule and a rule learned from data',
    'Name the parts of a learning system: data, model, training and prediction',
  ],
  prerequisites: [],
  concepts: [
    'artificial-intelligence',
    'machine-learning',
    'deep-learning',
    'model',
    'training',
    'inference',
    'feature',
    'dataset',
  ],
} satisfies LessonMeta;
