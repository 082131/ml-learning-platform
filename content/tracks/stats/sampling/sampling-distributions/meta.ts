import type { LessonMeta } from '@/lib/types';

export default {
  id: 'stats/sampling/sampling-distributions',
  title: 'Samples, populations and the standard error',
  level: 'intermediate',
  minutes: 40,
  kind: 'lesson',
  objectives: [
    'Separate the population (what we want to know) from the sample (what we measured) and from a statistic computed on the sample',
    'Explain the sampling distribution: how a sample mean would vary across many possible samples',
    'Derive the standard error σ/√n from the variance rules, and say why the √n means diminishing returns',
    'Tell the standard deviation of the data from the standard error of the mean, and explain the n − 1 in the sample SD',
  ],
  prerequisites: ['stats/probability/random-variables', 'stats/distributions/normal-distribution'],
  concepts: ['population', 'sample', 'sampling-distribution', 'standard-error', 'law-of-large-numbers'],
  references: [
    { title: 'OpenIntro Statistics (4th ed.), section 5.1: Point estimates and sampling variability', url: 'https://www.openintro.org/book/os/' },
    { title: 'NumPy: numpy.std (ddof)', url: 'https://numpy.org/doc/2.4/reference/generated/numpy.std.html', version: '2.4' },
    { title: 'Python docs: statistics.stdev and statistics.pstdev', url: 'https://docs.python.org/3.13/library/statistics.html#statistics.stdev', version: '3.13' },
  ],
} satisfies LessonMeta;
