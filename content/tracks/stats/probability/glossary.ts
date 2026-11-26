import type { GlossaryTerm } from '@/lib/types';

// Glossary terms for the stats/probability chapter (merged into the glossary by content/index.ts).
export default [
  {
    id: 'sample-space',
    term: 'Sample space',
    short: 'The complete list of outcomes that could happen. For two dice: the 36 ordered pairs (1, 1) to (6, 6).',
    long: 'Probabilities can be computed by counting only when the outcomes in the list are equally likely.',
    introducedIn: 'stats/probability/probability-rules',
  },
  {
    id: 'probability-event',
    term: 'Event',
    short: 'A yes/no question about the outcome, such as "is the sum 7?". It picks out some outcomes of the sample space.',
    introducedIn: 'stats/probability/probability-rules',
  },
  {
    id: 'complement-rule',
    term: 'Complement rule',
    short: 'P(not A) = 1 − P(A). Handy for "at least one" questions: compute "none" and subtract it from 1.',
    introducedIn: 'stats/probability/probability-rules',
    aliases: ['complement'],
  },
  {
    id: 'mutually-exclusive',
    term: 'Mutually exclusive',
    short: 'Events that cannot happen together, such as "the sum is 2" and "the sum is 12". Their overlap is empty, so P(A or B) = P(A) + P(B).',
    introducedIn: 'stats/probability/probability-rules',
    aliases: ['disjoint'],
  },
  {
    id: 'independent-events',
    term: 'Independent events',
    short: 'Events where knowing one happened does not change the chance of the other. Then P(A and B) = P(A) · P(B).',
    long: 'Not the same as mutually exclusive: mutually exclusive events with positive probabilities are always dependent, because one rules the other out.',
    introducedIn: 'stats/probability/probability-rules',
    aliases: ['independence'],
  },
  {
    id: 'conditional-probability',
    term: 'Conditional probability',
    short: 'P(A | B), "A given B": among the cases where B happened, the share in which A also happens. P(A | B) = P(A and B) / P(B).',
    long: 'P(A | B) and P(B | A) are different numbers because they divide by different groups.',
    introducedIn: 'stats/probability/conditional-probability',
  },
  {
    id: 'bayes-rule',
    term: "Bayes' rule",
    short: 'Turns P(evidence | cause) into P(cause | evidence): P(H | E) = P(E | H) · P(H) / P(E). A tree of natural frequencies, written as a formula.',
    introducedIn: 'stats/probability/conditional-probability',
    aliases: ["Bayes' theorem"],
  },
  {
    id: 'base-rate',
    term: 'Base rate',
    short: 'How common something is before any test or model says anything, such as 1% of payments being fraud. It is the prior in Bayes’ rule.',
    introducedIn: 'stats/probability/conditional-probability',
    aliases: ['prevalence'],
  },
  {
    id: 'sensitivity',
    term: 'Sensitivity',
    short: 'P(positive | condition): the share of real cases a test or model catches. The same as recall and true positive rate.',
    introducedIn: 'stats/probability/conditional-probability',
    aliases: ['true positive rate', 'recall'],
  },
  {
    id: 'false-positive-rate',
    term: 'False positive rate',
    short: 'P(positive | no condition): the share of negatives that a test or model wrongly flags. With a rare condition it decides how many alerts are false alarms.',
    introducedIn: 'stats/probability/conditional-probability',
    aliases: ['false alarm rate'],
  },
  {
    id: 'pmf',
    term: 'Probability mass function (PMF)',
    short: 'For a random variable with separate values (counts, dice), the table of each value and its probability. The probabilities add up to 1.',
    introducedIn: 'stats/probability/random-variables',
  },
] satisfies GlossaryTerm[];
