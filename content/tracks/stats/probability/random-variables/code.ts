// Code for "Random variables, expected value and variance". The formula program is linked to the explorer: the values
// and probabilities come from the selected random variable, and src/lib/stats/experiments.ts (gambleStats) computes
// the same E[X], Var and SD for the readout. The simulation was run with CPython 3.13 and NumPy 2.5.3 and its output
// copied; content/tracks/stats/python-outputs.test.ts re-runs it.
import { lineOf, span } from '@/lib/foundations/annotate';
import { GAMBLES, gambleExperiment, type GambleState } from '@/lib/stats/experiments';
import type { CodeExample } from '@/lib/types';

export const gamble = gambleExperiment('stats-gamble');

const FORMULA = `values = {{values}}
probs = {{probs}}

mean = sum(x * p for x, p in zip(values, probs))              # E[X]
var = sum((x - mean) ** 2 * p for x, p in zip(values, probs))  # Var(X)
sd = var ** 0.5                                                # SD(X)
print(f"E[X] = {mean:.3f}, Var(X) = {var:.3f}, SD(X) = {sd:.3f}")`;

const game = (s: unknown) => GAMBLES[(s as GambleState).game] ?? GAMBLES.die!;

export const formulaCode: CodeExample = {
  id: 'stats-ev-formula',
  language: 'python',
  source: FORMULA,
  slots: {
    values: (s) => `[${game(s).values.join(', ')}]`,
    probs: (s) => `[${game(s).probs.map((p) => Number(p.toFixed(4))).join(', ')}]`,
  },
  annotations: [
    {
      id: 'table',
      range: { line: 1 },
      kind: 'variable',
      title: 'The distribution as two lists',
      what: 'Every value the random variable can take, and (next line) the probability of each.',
      why: 'This table is the whole random variable: anything we want to know (average, spread, chance of a loss) is computed from it.',
      inputs: 'the random variable chosen above',
    },
    {
      id: 'mean',
      ...span(FORMULA, 4, 'sum(x * p for x, p in zip(values, probs))'),
      kind: 'math',
      title: 'Expected value: a weighted average',
      what: 'Each value times its probability, added up.',
      why: 'Values that happen more often should count more. Weighting by probability is exactly what the long-run average of many plays does.',
    },
    {
      id: 'var',
      ...span(FORMULA, 5, '(x - mean) ** 2 * p'),
      kind: 'math',
      title: 'Variance: the average squared distance',
      what: 'How far each value is from the mean, squared, weighted by its probability.',
      why: 'Squaring makes every distance positive (so +3 and −3 do not cancel) and weighs big misses more than small ones.',
    },
    {
      id: 'sd',
      ...span(FORMULA, 6, 'var ** 0.5'),
      kind: 'math',
      title: 'Back to the original units',
      what: 'The square root of the variance.',
      why: 'Variance is in squared units (dollars²), which nobody can picture. The SD is in dollars again: a typical distance from the mean.',
    },
  ],
};

const SIM = `import numpy as np

values = np.array([-1, 1, 4])          # lose $1, win $1, win $4
probs = np.array([0.5, 0.3, 0.2])
mean = np.sum(values * probs)
sd = np.sqrt(np.sum((values - mean) ** 2 * probs))
print(f"E[X] = {mean:.2f} dollars, SD = {sd:.3f} dollars")

rng = np.random.default_rng(11)
plays = rng.choice(values, size=(5, 1000), p=probs)   # 5 players, 1,000 spins each
for i, spins in enumerate(plays, start=1):
    print(f"player {i}: average {spins.mean():.3f}, SD of single spins {spins.std(ddof=1):.3f}")`;

export const simRunner: CodeExample = {
  id: 'stats-ev-sim',
  language: 'python',
  run: 'pyodide',
  source: SIM,
  annotations: [
    {
      id: 'choice',
      ...span(SIM, lineOf(SIM, 'rng.choice'), 'rng.choice(values, size=(5, 1000), p=probs)'),
      kind: 'function',
      title: 'Draw from the distribution',
      what: 'A 5 × 1,000 array: each row is one player’s 1,000 spins, drawn with the given probabilities.',
      why: 'Several players let you compare: their averages should all be near E[X] = 0.6, but not exactly.',
      output: 'shape (5, 1000)',
    },
    {
      id: 'ddof',
      ...span(SIM, lineOf(SIM, 'spins.std'), 'spins.std(ddof=1)'),
      kind: 'parameter',
      title: 'The spread of single spins',
      what: 'The sample standard deviation of one player’s 1,000 spins (ddof=1 divides by n − 1).',
      why: 'It stays near 1.9 however many spins you take: it describes one spin, not the average. The sampling chapter explains the n − 1.',
    },
  ],
  expectedOutput: `E[X] = 0.60 dollars, SD = 1.908 dollars
player 1: average 0.506, SD of single spins 1.865
player 2: average 0.545, SD of single spins 1.882
player 3: average 0.567, SD of single spins 1.867
player 4: average 0.559, SD of single spins 1.894
player 5: average 0.633, SD of single spins 1.926`,
};
