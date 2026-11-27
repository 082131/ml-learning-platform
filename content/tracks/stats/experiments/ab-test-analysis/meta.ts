import type { LessonMeta } from '@/lib/types';

export default {
  id: 'stats/experiments/ab-test-analysis',
  title: 'Analysing an A/B test: lift, intervals and the peeking trap',
  level: 'advanced',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Compute the difference in conversion rates, its confidence interval and a two-proportion z-test, and explain why the test pools the rates but the interval does not',
    'Report a result as a lift with an interval, and read "not significant" correctly',
    'Show with a simulation why stopping at the first significant peek inflates false positives, and name the fixes',
    'Handle many metrics and many segments without fooling yourself (multiple comparisons)',
  ],
  prerequisites: ['stats/experiments/ab-test-design'],
  concepts: ['ab-test', 'confidence-interval', 'p-value', 'peeking', 'multiple-comparisons'],
  references: [
    { title: 'Kohavi, Tang and Xu, Trustworthy Online Controlled Experiments (Cambridge, 2020), chapters 17 to 19', url: 'https://experimentguide.com/' },
    { title: 'Evan Miller: How not to run an A/B test', url: 'https://www.evanmiller.org/how-not-to-run-an-ab-test.html' },
    { title: 'Johari et al. (2017), Peeking at A/B tests: why it matters, and what to do about it', url: 'https://doi.org/10.1145/3097983.3097992' },
  ],
} satisfies LessonMeta;
