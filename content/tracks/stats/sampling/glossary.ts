import type { GlossaryTerm } from '@/lib/types';

// Glossary terms for the stats/sampling chapter (merged into the glossary by content/index.ts).
export default [
  {
    id: 'population',
    term: 'Population',
    short: 'Everything we want to learn about (all users, all waits), with a true mean μ and SD σ that we usually do not know.',
    introducedIn: 'stats/sampling/sampling-distributions',
  },
  {
    id: 'sample',
    term: 'Sample',
    short: 'The part of the population we actually measured. Statistics computed from it (such as the sample mean) estimate the population’s values.',
    long: 'Precision formulas such as σ/√n assume a random sample; a non-random sample can be precisely wrong.',
    introducedIn: 'stats/sampling/sampling-distributions',
  },
  {
    id: 'sampling-distribution',
    term: 'Sampling distribution',
    short: 'How a statistic (such as the sample mean) would vary across all the samples we could have drawn. Its SD is the standard error.',
    introducedIn: 'stats/sampling/sampling-distributions',
  },
  {
    id: 'central-limit-theorem',
    term: 'Central limit theorem (CLT)',
    short: 'The mean of n independent values is approximately normal, N(μ, σ/√n), for large n, whatever the shape of the data. It is about averages, never about the data themselves.',
    introducedIn: 'stats/sampling/central-limit-theorem',
    aliases: ['CLT'],
  },
] satisfies GlossaryTerm[];
