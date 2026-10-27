import type { GlossaryTerm } from '@/lib/types';

const L = 'ml/classical/eda';

export default [
  {
    id: 'exploratory-data-analysis',
    term: 'Exploratory data analysis (EDA)',
    short:
      'Looking at a dataset before modeling it: summaries, counts, group comparisons and plots, to find problems and write down questions.',
    long: 'EDA produces questions and hypotheses, not conclusions. Patterns found by browsing many plots need confirming on data you did not browse.',
    introducedIn: L,
    aliases: ['EDA'],
  },
  {
    id: 'simpsons-paradox',
    term: 'Simpson’s paradox',
    short:
      'A trend that appears in a whole dataset but reverses (or disappears) inside each of its groups, because the groups differ.',
    long: 'In the penguins, bill length and bill depth correlate negatively overall (r ≈ −0.235) but positively within each species: Gentoo have long, shallow bills and Adelie short, deep ones, so mixing species creates the downward trend.',
    introducedIn: L,
    aliases: ['Simpson paradox'],
  },
] satisfies GlossaryTerm[];
