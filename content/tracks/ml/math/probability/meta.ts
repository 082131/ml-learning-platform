import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/math/probability',
  title: 'Probability, distributions and expected value',
  level: 'beginner',
  minutes: 35,
  kind: 'lesson',
  objectives: [
    'Compute probabilities of simple events',
    'Describe a distribution with a histogram and its shape',
    'Compute an expected value and check it by simulation',
  ],
  prerequisites: ['ml/foundations/python-basics'],
  concepts: [],
} satisfies LessonMeta;
