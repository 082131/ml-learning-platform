import type { LessonMeta } from '@/lib/types';

export default {
  id: 'stats/inference/hypothesis-tests',
  title: 'Hypothesis tests and p-values',
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Explain the logic of a test: assume no effect, then ask how surprising the data would be in that world',
    'State a null and an alternative hypothesis, choose a test statistic, and compute a p-value (exact binomial and z)',
    'Say what a p-value is and is not, and why "not significant" does not mean "no effect"',
    'Choose one- or two-sided tests before seeing the data, and connect tests to confidence intervals',
  ],
  prerequisites: ['stats/inference/confidence-intervals', 'stats/distributions/binomial-poisson'],
  concepts: ['null-hypothesis', 'alternative-hypothesis', 'test-statistic', 'p-value', 'significance-level'],
  references: [
    { title: 'Wasserstein and Lazar (2016), The ASA Statement on p-Values: Context, Process, and Purpose', url: 'https://doi.org/10.1080/00031305.2016.1154108' },
    { title: 'SciPy: scipy.stats.binomtest (the two-sided rule used here)', url: 'https://docs.scipy.org/doc/scipy-1.18.1/reference/generated/scipy.stats.binomtest.html', version: '1.18.1' },
    { title: 'OpenIntro Statistics (4th ed.), section 5.3: Hypothesis testing for a proportion', url: 'https://www.openintro.org/book/os/' },
  ],
} satisfies LessonMeta;
