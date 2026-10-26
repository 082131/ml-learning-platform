import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/math/probability',
  title: 'Probability, distributions and expected value',
  level: 'beginner',
  minutes: 40,
  kind: 'lesson',
  objectives: [
    'Compute probabilities of simple events from a distribution',
    'Describe a discrete distribution and compare it with a sample’s histogram',
    'Compute an expected value and check it by simulation',
    'Use a seed to make random experiments reproducible',
  ],
  prerequisites: ['ml/foundations/python-basics'],
  concepts: ['random-variable', 'probability-distribution', 'expected-value', 'law-of-large-numbers', 'random-seed'],
  references: [
    {
      title: 'NumPy random Generator',
      url: 'https://numpy.org/doc/stable/reference/random/generator.html',
      version: 'NumPy 2.5',
    },
    {
      title: 'random: generate pseudo-random numbers',
      url: 'https://docs.python.org/3/library/random.html',
      version: 'Python 3.13',
    },
  ],
} satisfies LessonMeta;
