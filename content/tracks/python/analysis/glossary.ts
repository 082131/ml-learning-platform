import type { GlossaryTerm } from '@/lib/types';

// Terms first taught in the Python course's analysis chapter. Merged with content/glossary.ts.
export default [
  {
    id: 'median',
    term: 'Median',
    short:
      'The middle value when the data is sorted (the mean of the two middle values for an even count). Unlike the mean, it barely moves when one value is extreme.',
    introducedIn: 'python/analysis/eda-visualization',
    aliases: ['50th percentile'],
  },
  {
    id: 'skewness',
    term: 'Skewness',
    short:
      'How lopsided a distribution is. Right-skewed data, such as incomes or prices, has a long tail of large values that pulls the mean above the median.',
    introducedIn: 'python/analysis/eda-visualization',
    aliases: ['skew', 'long tail'],
  },
  {
    id: 'standard-error',
    term: 'Standard error',
    short:
      'The standard deviation of an estimate, such as a sample mean, across repeated samples. It shrinks with the square root of the sample size.',
    introducedIn: 'python/analysis/statistical-inference',
    aliases: ['SE'],
  },
  {
    id: 'confidence-interval',
    term: 'Confidence interval',
    short:
      'A range computed from a sample by a method that, over many samples, captures the true value a stated share of the time, such as 95%.',
    long: 'It is a statement about the method, not a 95% probability that this particular interval holds the true value.',
    introducedIn: 'python/analysis/statistical-inference',
    aliases: ['CI', 'bootstrap interval'],
  },
  {
    id: 'permutation-test',
    term: 'Permutation test',
    short:
      'A test that shuffles group labels many times to see how often chance alone produces a difference as large as the observed one.',
    introducedIn: 'python/analysis/statistical-inference',
    aliases: ['randomization test'],
  },
  {
    id: 'ab-test',
    term: 'A/B test',
    short:
      'A randomized experiment that shows two versions to randomly split users and compares a metric between the groups.',
    introducedIn: 'python/analysis/statistical-inference',
    aliases: ['split test', 'online experiment'],
  },
] satisfies GlossaryTerm[];
