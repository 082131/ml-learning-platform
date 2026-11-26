// Code for "Hypothesis tests and p-values". The exact test program is linked to the explorer (n, k, the null rate
// and the alternative come from the controls); src/lib/stats/experiments.ts (binomialTest) computes the same p-value
// for the chart and readout, checked against scipy.stats.binomtest 1.18.1 in stats.test.ts. The runnable example was
// run with CPython 3.13 and NumPy 2.5.3 and its output copied; python-outputs.test.ts re-runs it.
import { lineOf, span } from '@/lib/foundations/annotate';
import { testExperiment, type TestState } from '@/lib/stats/experiments';
import type { CodeExample } from '@/lib/types';

export const test = testExperiment('stats-test');

const EXACT = `import math

n, k, p0 = {{n}}, {{k}}, {{p0}}         # tickets labelled, labelled right, accuracy under the null

def pmf(i):
    return math.comb(n, i) * p0**i * (1 - p0) ** (n - i)

probs = [pmf(i) for i in range(n + 1)]                  # the null distribution
{{rule}}
p_value = sum(p for i, p in enumerate(probs) if extreme(i))
print(f"p-value = {p_value:.4f}")`;

const st = (s: unknown) => s as TestState;

export const exactCode: CodeExample = {
  id: 'stats-binom-test',
  language: 'python',
  source: EXACT,
  slots: {
    n: (s) => String(st(s).n),
    k: (s) => String(Math.min(st(s).k, st(s).n)),
    p0: (s) => String(st(s).p0 / 100),
    rule: (s) =>
      st(s).sides === 'greater'
        ? 'extreme = lambda i: i >= k                         # one-sided: at least as many right'
        : 'extreme = lambda i: probs[i] <= probs[k] * (1 + 1e-7)   # two-sided: no more likely than k',
  },
  annotations: [
    {
      id: 'null',
      ...span(EXACT, 8, '[pmf(i) for i in range(n + 1)]'),
      kind: 'math',
      title: 'The world where nothing changed',
      what: 'The chance of every possible number of correct labels, if the new model were really only as accurate as p0.',
      why: 'This is what "assume the null hypothesis" means in practice: a full distribution of what results would look like if there were no improvement.',
      output: 'n + 1 probabilities, the bars in the chart',
    },
    {
      id: 'rule',
      range: { line: 9 },
      kind: 'syntax',
      title: 'What counts as "at least as extreme"',
      what: 'One-sided: k or more right. Two-sided: every outcome no more likely than k, on either side (SciPy’s binomtest uses this rule).',
      why: 'The alternative hypothesis decides which surprises count. It must be chosen before looking at the data.',
      inputs: 'the alternative chosen above',
    },
    {
      id: 'p',
      ...span(EXACT, 10, 'sum(p for i, p in enumerate(probs) if extreme(i))'),
      kind: 'math',
      title: 'The p-value',
      what: 'The total null probability of results at least as extreme as the one observed.',
      why: 'It answers: if nothing had changed, how often would we see a result this far from expectation? Small means the data are hard to explain by luck alone.',
    },
  ],
};

const RUN = `import math
import numpy as np

n, k, p0 = 100, 78, 0.70          # 78 of 100 tickets right; the old model is right 70% of the time

def pmf(i):
    return math.comb(n, i) * p0**i * (1 - p0) ** (n - i)

p_one_sided = sum(pmf(i) for i in range(k, n + 1))
print(f"exact one-sided p-value: P(X >= {k} | p = {p0}) = {p_one_sided:.4f}")

rng = np.random.default_rng(42)
null_world = rng.binomial(n, p0, size=100_000)   # 100,000 test sets labelled by a model that is really 70% right
print(f"simulated: share of null test sets with {k} or more right = {np.mean(null_world >= k):.4f}")

z = (k - n * p0) / math.sqrt(n * p0 * (1 - p0))
print(f"z = {z:.2f}, normal approximation p = {0.5 * math.erfc(z / math.sqrt(2)):.4f}")`;

export const testRunner: CodeExample = {
  id: 'stats-test-three-ways',
  language: 'python',
  run: 'pyodide',
  source: RUN,
  annotations: [
    {
      id: 'sim',
      ...span(RUN, lineOf(RUN, 'rng.binomial'), 'rng.binomial(n, p0, size=100_000)'),
      kind: 'function',
      title: 'Simulate the null world',
      what: '100,000 imaginary test sets, each labelled by a model whose true accuracy is exactly 70%.',
      why: 'The share of them that score 78 or more is the p-value, found by brute force. It agrees with the exact sum to three decimals.',
    },
    {
      id: 'z',
      ...span(RUN, lineOf(RUN, 'z = (k'), '(k - n * p0) / math.sqrt(n * p0 * (1 - p0))'),
      kind: 'math',
      title: 'The z statistic',
      what: 'How many standard deviations the observed count is above the count expected under the null.',
      why: 'The CLT shortcut: for large n the null distribution is close to normal, so the tail area of a normal curve approximates the p-value. With n = 100 it is a bit off (0.040 vs 0.048).',
    },
  ],
  expectedOutput: `exact one-sided p-value: P(X >= 78 | p = 0.7) = 0.0479
simulated: share of null test sets with 78 or more right = 0.0478
z = 1.75, normal approximation p = 0.0404`,
};
