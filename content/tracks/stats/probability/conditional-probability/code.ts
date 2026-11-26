// Code for "Conditional probability and Bayes' rule". The Bayes program is linked to the explorer: its three inputs
// are filled from the sliders, and src/lib/stats/experiments.ts (screenResult) computes the same counts for the tree
// and the readout. The runnable example was run with CPython 3.13 and its output copied;
// content/tracks/stats/python-outputs.test.ts re-runs it.
import { lineOf, span } from '@/lib/foundations/annotate';
import { screenExperiment, type ScreenState } from '@/lib/stats/experiments';
import type { CodeExample } from '@/lib/types';

export const screen = screenExperiment('stats-screen');

const BAYES = `def p_fraud_given_flag(base_rate, caught, false_alarm):
    """P(fraud | flagged) from the base rate and the model's two error rates."""
    flagged_fraud = base_rate * caught                 # P(fraud and flagged)
    flagged_legit = (1 - base_rate) * false_alarm      # P(legit and flagged)
    return flagged_fraud / (flagged_fraud + flagged_legit)

p = p_fraud_given_flag(base_rate={{base}}, caught={{caught}}, false_alarm={{fpr}})
print(f"P(fraud | flagged) = {p:.3f}")`;

const frac = (x: number) => String(Number((x / 100).toFixed(4)));

export const bayesCode: CodeExample = {
  id: 'stats-bayes-flag',
  language: 'python',
  source: BAYES,
  slots: {
    base: (s) => frac((s as ScreenState).prevalence),
    caught: (s) => frac((s as ScreenState).sensitivity),
    fpr: (s) => frac((s as ScreenState).fpr),
  },
  annotations: [
    {
      id: 'tp',
      ...span(BAYES, 3, 'base_rate * caught'),
      kind: 'math',
      title: 'Fraud AND flagged',
      what: 'The share of all transactions that are fraud, times the share of fraud the model catches.',
      why: 'This is the multiplication rule for dependent events: P(fraud and flag) = P(fraud) · P(flag | fraud). In the tree it is the "fraud, flagged" box divided by 100,000.',
    },
    {
      id: 'fp',
      ...span(BAYES, 4, '(1 - base_rate) * false_alarm'),
      kind: 'math',
      title: 'Legit AND flagged',
      what: 'The share of transactions that are legitimate, times the share of those the model flags by mistake.',
      why: 'The false alarms. Because legitimate transactions are so many, a small false alarm rate still produces a large number of them.',
    },
    {
      id: 'ratio',
      ...span(BAYES, 5, 'flagged_fraud / (flagged_fraud + flagged_legit)'),
      kind: 'math',
      title: "Bayes' rule",
      what: 'Of everything that is flagged (the denominator), the part that is really fraud (the numerator).',
      why: 'Conditioning on "flagged" means we only look at the flagged cases and ask what share of them are fraud.',
      output: 'P(fraud | flagged)',
    },
    {
      id: 'inputs',
      ...span(BAYES, 7, 'base_rate={{base}}'),
      kind: 'variable',
      title: 'The base rate',
      what: 'How common fraud is before the model says anything.',
      why: 'The input people forget, and the one that moves the answer most. Try 0.1% and 20% in the explorer.',
      inputs: 'the sliders above',
    },
  ],
};

const SWEEP = `def p_fraud_given_flag(base_rate, caught=0.95, false_alarm=0.05):
    flagged_fraud = base_rate * caught
    flagged_legit = (1 - base_rate) * false_alarm
    return flagged_fraud / (flagged_fraud + flagged_legit)

# The same model applied where fraud is rare, uncommon, common and very common.
for base_rate in (0.001, 0.01, 0.1, 0.5):
    p = p_fraud_given_flag(base_rate)
    print(f"base rate {base_rate:>6.1%}: P(fraud | flagged) = {p:6.1%}, P(flagged | fraud) = 95.0%")`;

export const sweepRunner: CodeExample = {
  id: 'stats-bayes-sweep',
  language: 'python',
  run: 'pyodide',
  source: SWEEP,
  annotations: [
    {
      id: 'loop',
      ...span(SWEEP, lineOf(SWEEP, 'for base_rate'), 'for base_rate in (0.001, 0.01, 0.1, 0.5):'),
      kind: 'syntax',
      title: 'Only the base rate changes',
      what: 'The model (95% caught, 5% false alarms) stays the same in every line.',
      why: 'So any change in P(fraud | flagged) comes from how common fraud is, not from the model.',
    },
  ],
  expectedOutput: `base rate   0.1%: P(fraud | flagged) =   1.9%, P(flagged | fraud) = 95.0%
base rate   1.0%: P(fraud | flagged) =  16.1%, P(flagged | fraud) = 95.0%
base rate  10.0%: P(fraud | flagged) =  67.9%, P(flagged | fraud) = 95.0%
base rate  50.0%: P(fraud | flagged) =  95.0%, P(flagged | fraud) = 95.0%`,
};
