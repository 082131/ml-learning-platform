import type { GlossaryTerm } from '@/lib/types';

// Glossary terms for the stats/inference chapter (merged into the glossary by content/index.ts).
export default [
  {
    id: 'margin-of-error',
    term: 'Margin of error',
    short: 'The "give or take" of an estimate: critical value × standard error, the half-width of a confidence interval.',
    introducedIn: 'stats/inference/confidence-intervals',
  },
  {
    id: 't-distribution',
    term: 't distribution',
    short: 'A bell curve with heavier tails than the normal, used when σ is estimated from the sample. Fewer degrees of freedom give heavier tails and wider intervals.',
    introducedIn: 'stats/inference/confidence-intervals',
    aliases: ["Student's t"],
  },
  {
    id: 'degrees-of-freedom',
    term: 'Degrees of freedom',
    short: 'How many independent pieces of information are left for estimating spread. For one sample’s SD it is n − 1, because the mean used up one.',
    introducedIn: 'stats/inference/confidence-intervals',
  },
  {
    id: 'null-hypothesis',
    term: 'Null hypothesis (H₀)',
    short: 'The "nothing happened" explanation a test assumes: no effect, no difference. It is specific enough to compute the distribution of results under it.',
    introducedIn: 'stats/inference/hypothesis-tests',
    aliases: ['H0', 'null'],
  },
  {
    id: 'alternative-hypothesis',
    term: 'Alternative hypothesis (H₁)',
    short: 'What we suspect instead of the null: "better" (one-sided) or "different" (two-sided). It decides which results count as extreme, and must be chosen before seeing the data.',
    introducedIn: 'stats/inference/hypothesis-tests',
    aliases: ['H1'],
  },
  {
    id: 'test-statistic',
    term: 'Test statistic',
    short: 'One number that summarises the data for a test, such as a count or a z-score, compared against its distribution under the null.',
    introducedIn: 'stats/inference/hypothesis-tests',
  },
  {
    id: 'significance-level',
    term: 'Significance level (α)',
    short: 'The p-value threshold for rejecting the null, chosen in advance (often 0.05). It is the false alarm rate the test accepts when the null is true.',
    introducedIn: 'stats/inference/hypothesis-tests',
    aliases: ['alpha', 'α'],
  },
  {
    id: 'type-i-error',
    term: 'Type I error',
    short: 'A false alarm: rejecting the null when it is true. Its rate is α.',
    introducedIn: 'stats/inference/errors-power',
    aliases: ['false positive'],
  },
  {
    id: 'type-ii-error',
    term: 'Type II error',
    short: 'A miss: not rejecting the null when a real effect exists. Its rate is β = 1 − power.',
    introducedIn: 'stats/inference/errors-power',
    aliases: ['false negative'],
  },
  {
    id: 'statistical-power',
    term: 'Power',
    short: 'The chance a test detects an effect that is really there, 1 − β. It grows with the effect size and with √n; 80% is a common target.',
    introducedIn: 'stats/inference/errors-power',
    aliases: ['statistical power'],
  },
  {
    id: 'effect-size',
    term: 'Effect size',
    short: 'How big an effect is, often in standard deviations of one observation (Cohen’s d). It, not the p-value, says whether a result matters.',
    introducedIn: 'stats/inference/errors-power',
    aliases: ["Cohen's d"],
  },
] satisfies GlossaryTerm[];
