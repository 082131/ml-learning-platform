import type { GlossaryTerm } from '@/lib/types';

// Glossary terms for the stats/distributions chapter (merged into the glossary by content/index.ts).
export default [
  {
    id: 'bernoulli-trial',
    term: 'Bernoulli trial',
    short: 'One try with two outcomes: success (1) with probability p, failure (0) with 1 − p. Mean p, variance p(1 − p).',
    introducedIn: 'stats/distributions/binomial-poisson',
    aliases: ['Bernoulli'],
  },
  {
    id: 'binomial-distribution',
    term: 'Binomial distribution',
    short: 'The number of successes in n independent tries with the same chance p. P(X = k) = C(n, k) pᵏ (1 − p)ⁿ⁻ᵏ; mean np, variance np(1 − p).',
    introducedIn: 'stats/distributions/binomial-poisson',
    aliases: ['binomial'],
  },
  {
    id: 'poisson-distribution',
    term: 'Poisson distribution',
    short: 'The number of events in a window when they happen independently at a steady average rate λ. P(X = k) = λᵏ e^(−λ) / k!; mean and variance both λ.',
    introducedIn: 'stats/distributions/binomial-poisson',
    aliases: ['Poisson'],
  },
  {
    id: 'cdf',
    term: 'Cumulative distribution function (CDF)',
    short: 'F(x) = P(X ≤ x): the probability of a value at or below x. For counts, the running total of the bars; for continuous values, the area to the left of x.',
    introducedIn: 'stats/distributions/binomial-poisson',
  },
  {
    id: 'pdf',
    term: 'Probability density function (PDF)',
    short: 'For a continuous value, a curve whose AREA over a range is the probability of landing in that range. Its height is a density (probability per unit), not a probability.',
    introducedIn: 'stats/distributions/normal-distribution',
    aliases: ['density'],
  },
  {
    id: 'normal-distribution',
    term: 'Normal distribution',
    short: 'The symmetric bell curve fixed by a mean μ and an SD σ. About 68%, 95% and 99.7% of values lie within 1, 2 and 3 SDs of the mean.',
    introducedIn: 'stats/distributions/normal-distribution',
    aliases: ['bell curve', 'Gaussian'],
  },
] satisfies GlossaryTerm[];
