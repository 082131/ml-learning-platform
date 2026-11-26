import type { LessonMeta } from '@/lib/types';

export default {
  id: 'stats/sampling/central-limit-theorem',
  title: 'The central limit theorem: why averages are normal',
  level: 'intermediate',
  minutes: 35,
  kind: 'lesson',
  objectives: [
    'State the central limit theorem in plain words and in symbols: the mean of n values is approximately N(μ, σ/√n)',
    'Explain intuitively why averaging cancels extremes and produces a bell shape, whatever the data look like',
    'Judge when n is "large enough": skewed data and rare events need more',
    'Use the theorem to turn "how unusual is this sample mean?" into a z-score',
  ],
  prerequisites: ['stats/sampling/sampling-distributions'],
  concepts: ['central-limit-theorem', 'sampling-distribution', 'standard-error', 'skewness', 'normal-distribution'],
  references: [
    { title: 'OpenIntro Statistics (4th ed.), section 5.1.3: Central Limit Theorem', url: 'https://www.openintro.org/book/os/' },
    { title: 'Blitzstein and Hwang, Introduction to Probability (2nd ed.), section 10.3', url: 'https://projects.iq.harvard.edu/stat110/home' },
  ],
} satisfies LessonMeta;
