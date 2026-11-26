// Code for "Probability: counting what could happen". The counting program is the explorer's code: its event lines are
// filled from the selected events, and src/lib/stats/experiments.ts (diceResult) computes the same counts for the
// grid and the readout. The simulation was run with CPython 3.13 and NumPy 2.5.3 and its output copied;
// content/tracks/stats/python-outputs.test.ts re-runs it.
import { lineOf, span } from '@/lib/foundations/annotate';
import { DICE_EVENTS, diceExperiment, type DiceState } from '@/lib/stats/experiments';
import type { CodeExample } from '@/lib/types';

export const dice = diceExperiment('stats-dice');

const COUNT = `from fractions import Fraction
from itertools import product

outcomes = list(product(range(1, 7), repeat=2))   # all 36 pairs (a, b)

def P(event):
    hits = [o for o in outcomes if event(*o)]
    return Fraction(len(hits), len(outcomes))

A = lambda a, b: {{A}}
B = lambda a, b: {{B}}
both = lambda a, b: A(a, b) and B(a, b)
either = lambda a, b: A(a, b) or B(a, b)

print("P(A)       =", P(A))
print("P(B)       =", P(B))
print("P(A and B) =", P(both))
print("P(A or B)  =", P(either), "=", P(A) + P(B) - P(both))
print("independent:", P(both) == P(A) * P(B))`;

export const countCode: CodeExample = {
  id: 'stats-dice-count',
  language: 'python',
  source: COUNT,
  slots: {
    A: (s) => DICE_EVENTS[(s as DiceState).a]!.py,
    B: (s) => DICE_EVENTS[(s as DiceState).b]!.py,
  },
  annotations: [
    {
      id: 'space',
      ...span(COUNT, 4, 'list(product(range(1, 7), repeat=2))'),
      kind: 'function',
      title: 'The sample space',
      what: 'Every pair (first die, second die): (1, 1), (1, 2), ... (6, 6). 6 × 6 = 36 pairs.',
      why: 'Probability by counting only works when we list outcomes that are equally likely. (3, 4) and (4, 3) are different outcomes; treating "a 3 and a 4" as one outcome would break that.',
      output: '36 tuples',
    },
    {
      id: 'P',
      ...span(COUNT, 8, 'Fraction(len(hits), len(outcomes))'),
      kind: 'math',
      title: 'Favourable over possible',
      what: 'The number of outcomes where the event is true, divided by the number of outcomes.',
      why: 'With equally likely outcomes, that share is the probability. Fraction keeps it exact: 6/36 prints as 1/6, with no rounding.',
    },
    {
      id: 'A',
      ...span(COUNT, 10, '{{A}}'),
      kind: 'variable',
      title: 'Event A',
      what: 'A rule that says, for each outcome (a, b), whether A happened.',
      why: 'An event is just a yes/no question about the outcome. It comes from the "Event A" menu above.',
      inputs: 'the event chosen above',
    },
    {
      id: 'or',
      ...span(COUNT, 18, 'P(A) + P(B) - P(both)'),
      kind: 'math',
      title: 'The addition rule',
      what: 'Adds the two probabilities and takes away the overlap once.',
      why: 'Outcomes in both A and B were counted twice, once in each. The printed line shows both sides agree for every pair of events.',
    },
    {
      id: 'indep',
      ...span(COUNT, 19, 'P(both) == P(A) * P(B)'),
      kind: 'math',
      title: 'The independence test',
      what: 'Checks whether the chance of both equals the product of the separate chances.',
      why: 'This holds exactly when knowing A does not change the chance of B. Exact fractions make the equality test safe; with floats you would compare with a tolerance.',
    },
  ],
};

const SIM = `import numpy as np

rng = np.random.default_rng(7)
for n in (100, 10_000, 1_000_000):
    a = rng.integers(1, 7, size=n)          # first die, n rolls
    b = rng.integers(1, 7, size=n)          # second die
    share = np.mean(a + b == 7)
    print(f"n={n:>9,}: share of sum 7 = {share:.4f}   (exact 1/6 = {1/6:.4f})")`;

export const simRunner: CodeExample = {
  id: 'stats-dice-sim',
  language: 'python',
  run: 'pyodide',
  source: SIM,
  annotations: [
    {
      id: 'int',
      ...span(SIM, lineOf(SIM, 'rng.integers'), 'rng.integers(1, 7, size=n)'),
      kind: 'function',
      title: 'Roll n dice at once',
      what: 'n random whole numbers from 1 up to, but not including, 7.',
      why: 'The upper bound is exclusive, like range(1, 7). Writing 6 here is a classic off-by-one bug: you would never roll a 6.',
    },
    {
      id: 'mean',
      ...span(SIM, lineOf(SIM, 'np.mean'), 'np.mean(a + b == 7)'),
      kind: 'math',
      title: 'Share of rolls where the event happened',
      what: 'a + b == 7 is an array of True/False; the mean of True/False is the share of True.',
      why: 'This is the frequency definition of probability made concrete: the share of trials in which the event happens.',
    },
  ],
  expectedOutput: `n=      100: share of sum 7 = 0.1600   (exact 1/6 = 0.1667)
n=   10,000: share of sum 7 = 0.1618   (exact 1/6 = 0.1667)
n=1,000,000: share of sum 7 = 0.1664   (exact 1/6 = 0.1667)`,
};
