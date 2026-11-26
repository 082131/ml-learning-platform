import type { LessonMeta } from '@/lib/types';

export default {
  id: 'stats/distributions/normal-distribution',
  title: 'The normal distribution, density and z-scores',
  level: 'beginner',
  minutes: 40,
  kind: 'lesson',
  objectives: [
    'Explain why continuous values need a density curve, and why probability is an area under it rather than its height',
    'Describe the normal distribution by its mean and standard deviation, and use the 68-95-99.7 rule',
    'Convert values to z-scores and use the normal CDF and its inverse to answer "how likely" and "how high" questions',
    'Recognise data that are not normal (skewed, bounded, heavy-tailed) and why that matters',
  ],
  prerequisites: ['stats/distributions/binomial-poisson'],
  concepts: ['pdf', 'normal-distribution', 'z-score', 'cdf', 'standard-deviation'],
  references: [
    { title: 'Python docs: statistics.NormalDist', url: 'https://docs.python.org/3.13/library/statistics.html#statistics.NormalDist', version: '3.13' },
    { title: 'OpenIntro Statistics (4th ed.), section 4.1: Normal distribution', url: 'https://www.openintro.org/book/os/' },
    { title: 'NIST/SEMATECH e-Handbook of Statistical Methods: 1.3.6.6.1 Normal distribution', url: 'https://www.itl.nist.gov/div898/handbook/eda/section3/eda3661.htm' },
  ],
} satisfies LessonMeta;
