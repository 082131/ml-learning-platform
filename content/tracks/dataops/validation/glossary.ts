import type { GlossaryTerm } from '@/lib/types';

// Glossary terms for the dataops/validation chapter (merged into the glossary by content/index.ts).
export default [
  {
    id: 'data-baseline',
    term: 'Data baseline',
    short:
      'A schema plus summary statistics computed from the training data, used as the reference that new batches are checked against.',
    long: 'The schema says which columns exist, their types, allowed values and how often they may be missing; the statistics (histograms, quantiles, category frequencies) are what drift tests compare with. TFDV, Great Expectations and SageMaker Model Monitor all start by generating one.',
    introducedIn: 'dataops/validation/baselines-drift',
    aliases: ['baseline statistics', 'reference distribution', 'data schema', 'constraints'],
  },
  {
    id: 'data-drift',
    term: 'Data drift',
    short: 'A change over time in the distribution of a model’s inputs, P(x), compared with the training data.',
    long: 'Also called covariate shift. It does not by itself mean the model is wrong, but it moves the model into regions it saw less of in training. Label drift (prior shift) is a change in P(y), the class balance.',
    introducedIn: 'dataops/validation/baselines-drift',
    aliases: ['covariate shift', 'feature drift', 'input drift', 'prediction drift', 'prior shift', 'label drift'],
  },
  {
    id: 'concept-drift',
    term: 'Concept drift',
    short:
      'A change in the relationship between inputs and the target, P(y | x): the same input now deserves a different answer.',
    long: 'Example: after a policy change, the same transaction pattern is no longer fraud. Input distributions can stay identical, so data-only drift checks cannot see it; it shows up in model performance once labels arrive.',
    introducedIn: 'dataops/validation/baselines-drift',
    aliases: ['real concept drift', 'posterior shift'],
  },
  {
    id: 'ks-test',
    term: 'Kolmogorov–Smirnov test',
    short:
      'A test of whether two samples come from the same distribution, based on D, the largest gap between their empirical cumulative distribution functions.',
    long: 'D ranges from 0 (identical) to 1 (no overlap). Its p-value depends strongly on the sample sizes: with tens of thousands of values, a shift too small to matter is still “significant”. scipy.stats.ks_2samp computes it.',
    introducedIn: 'dataops/validation/baselines-drift',
    aliases: ['KS test', 'two-sample KS test', 'ks_2samp', 'KS statistic'],
  },
  {
    id: 'p-value',
    term: 'p-value',
    short:
      'The probability of seeing a difference at least this large if there were really no difference (the null hypothesis).',
    long: 'A small p-value (often below 0.05) is evidence of some difference, not of an important one. With large samples, tiny differences give tiny p-values, so drift alerts usually combine a test with an effect-size threshold.',
    introducedIn: 'dataops/validation/baselines-drift',
    aliases: ['statistical significance', 'significance level'],
  },
] satisfies GlossaryTerm[];
