import type { LessonMeta } from '@/lib/types';

export default {
  id: 'stats/distributions/binomial-poisson',
  title: 'Bernoulli, binomial and Poisson: distributions for counts',
  level: 'beginner',
  minutes: 40,
  kind: 'lesson',
  objectives: [
    'Recognise a Bernoulli trial and build the binomial distribution from it, explaining each part of the formula',
    'Use the Poisson distribution for counts of events in a window of time, and say what λ means',
    'Compute and read P(X = k), P(X ≤ k) and P(X > k) for both',
    'Check the assumptions (fixed n, independence, constant rate) and spot when real data break them',
  ],
  prerequisites: ['stats/probability/random-variables'],
  concepts: ['bernoulli-trial', 'binomial-distribution', 'poisson-distribution', 'pmf', 'cdf'],
  references: [
    { title: 'OpenIntro Statistics (4th ed.), sections 4.3 and 4.5', url: 'https://www.openintro.org/book/os/' },
    { title: 'SciPy: scipy.stats.binom and scipy.stats.poisson (used to check the explorer)', url: 'https://docs.scipy.org/doc/scipy-1.18.1/reference/generated/scipy.stats.binom.html', version: '1.18.1' },
    { title: 'Python docs: math.comb', url: 'https://docs.python.org/3.13/library/math.html#math.comb', version: '3.13' },
  ],
} satisfies LessonMeta;
