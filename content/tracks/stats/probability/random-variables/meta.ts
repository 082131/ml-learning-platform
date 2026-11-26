import type { LessonMeta } from '@/lib/types';

export default {
  id: 'stats/probability/random-variables',
  title: 'Random variables, expected value and variance',
  level: 'beginner',
  minutes: 40,
  kind: 'lesson',
  objectives: [
    'Describe a random variable as a number decided by chance, with a table of values and probabilities',
    'Compute the expected value as a probability-weighted average, and explain it as the long-run average',
    'Compute the variance and standard deviation, and explain them as the typical distance from the expected value',
    'Use the rules for sums and rescaling (E[aX + b], Var of a sum) that later lessons rely on',
  ],
  prerequisites: ['stats/probability/probability-rules'],
  concepts: ['random-variable', 'pmf', 'expected-value', 'variance', 'standard-deviation', 'law-of-large-numbers'],
  references: [
    { title: 'Blitzstein and Hwang, Introduction to Probability (2nd ed.), chapters 3 and 4', url: 'https://projects.iq.harvard.edu/stat110/home' },
    { title: 'NumPy: numpy.random.Generator.choice', url: 'https://numpy.org/doc/2.4/reference/random/generated/numpy.random.Generator.choice.html', version: '2.4' },
  ],
} satisfies LessonMeta;
