// Code for "Confidence intervals, permutation tests and A/B tests". Runnable examples were run with CPython 3.13
// and NumPy 2.5 and their output copied; content/tracks/python/python-outputs.test.ts re-runs them. The test
// explorer (p-values, intervals and the shuffled differences) was recorded by
// src/lib/pycourse/fixtures/permutation.py. No SciPy is needed: tests use shuffling or math.erfc.
import { lineOf, span } from '@/lib/foundations/annotate';
import { recordedExperiment, recordedSlots, type RecordedFixture } from '@/lib/pycourse/recorded';
import fixture from '@/lib/pycourse/fixtures/permutation.json';
import type { CodeExample } from '@/lib/types';

const perm = fixture as RecordedFixture;
const SRC = perm.template;

export const experiment = recordedExperiment(
  'py-permutation',
  perm,
  'Sample size and true effect',
  'n100-e05',
);

export const permCode: CodeExample = {
  id: 'py-permutation-code',
  language: 'python',
  source: SRC,
  slots: recordedSlots(perm),
  annotations: [
    {
      id: 'n',
      ...span(SRC, 4, '{{n}}'),
      kind: 'variable',
      title: 'Sample size per group',
      what: 'How many visits each group has.',
      why: 'Larger samples make the shuffled differences cluster more tightly around 0, so a real effect stands out.',
      inputs: 'the sample size chosen above',
    },
    {
      id: 'effect',
      ...span(SRC, 6, '{{effect}}'),
      kind: 'variable',
      title: 'The true effect',
      what: 'How many minutes longer the variant’s visits really are. In real tests you never know this number; here we set it, so you can see whether the test finds it.',
      why: 'An effect of 0 shows how the test behaves when there is nothing to find.',
      inputs: 'the effect chosen above',
    },
    {
      id: 'shuffle',
      ...span(SRC, lineOf(SRC, 'rng.shuffle(pooled)'), 'rng.shuffle(pooled)'),
      kind: 'function',
      title: 'Shuffle the labels',
      what: 'Mixes all visits together and deals them back into two groups at random.',
      why: 'If the variant had no effect, labels would be arbitrary, and any difference is what chance alone produces.',
    },
    {
      id: 'pvalue',
      ...span(SRC, lineOf(SRC, 'p = np.mean'), 'np.mean(np.abs(diffs) >= abs(observed))'),
      kind: 'math',
      title: 'The p-value',
      what: 'The share of shuffles whose difference is at least as large, in either direction, as the observed one.',
      why: 'Small means: chance alone rarely produces a gap this big.',
      output: 'a number from 0 to 1',
    },
    {
      id: 'boot',
      ...span(SRC, lineOf(SRC, 'rng.choice(b, n)'), 'rng.choice(b, n).mean() - rng.choice(a, n).mean()'),
      kind: 'math',
      title: 'A bootstrap resample',
      what: 'Draws n visits with replacement from each group and takes the difference of means.',
      why: 'Repeating this shows how much the estimate would wobble with a different sample; the middle 95% is the interval.',
    },
  ],
};

/** The standard error, measured by repeated sampling and compared with std / sqrt(n). */
export const seRunner: CodeExample = {
  id: 'py-inference-se',
  language: 'python',
  run: 'pyodide',
  source: `import numpy as np

rng = np.random.default_rng(5)
population = rng.exponential(scale=20.0, size=100_000)   # skewed: wait times in minutes
print(f"population mean {population.mean():.2f}, std {population.std():.2f}")

for n in (10, 100, 1000):
    means = np.array([rng.choice(population, n).mean() for _ in range(3000)])
    print(f"n={n:4d}: means spread (SE) {means.std():.2f}, formula std/sqrt(n) {population.std() / np.sqrt(n):.2f}")`,
  annotations: [],
  expectedOutput: `population mean 19.93, std 19.91
n=  10: means spread (SE) 6.33, formula std/sqrt(n) 6.30
n= 100: means spread (SE) 1.99, formula std/sqrt(n) 1.99
n=1000: means spread (SE) 0.63, formula std/sqrt(n) 0.63`,
};

/** A two-proportion z-test and a sample-size estimate for an A/B test. */
export const abRunner: CodeExample = {
  id: 'py-inference-ab',
  language: 'python',
  run: 'pyodide',
  source: `import math

def two_proportion_test(conv_a, n_a, conv_b, n_b):
    """Two-sided z-test for a difference in conversion rates (normal approximation)."""
    p_a, p_b = conv_a / n_a, conv_b / n_b
    pooled = (conv_a + conv_b) / (n_a + n_b)
    se = math.sqrt(pooled * (1 - pooled) * (1 / n_a + 1 / n_b))
    z = (p_b - p_a) / se
    p_value = math.erfc(abs(z) / math.sqrt(2))   # = 2 * (1 - Phi(|z|))
    return p_b - p_a, z, p_value

diff, z, p = two_proportion_test(conv_a=200, n_a=4000, conv_b=248, n_b=4000)
print(f"lift {diff:.4f} ({diff / 0.05:.0%} relative), z = {z:.2f}, p = {p:.4f}")

def n_per_group(p_base, lift, z_alpha=1.96, z_power=0.84):
    """Approximate sample size per group for 5% two-sided significance and 80% power."""
    p_new = p_base + lift
    var = p_base * (1 - p_base) + p_new * (1 - p_new)
    return math.ceil((z_alpha + z_power) ** 2 * var / lift ** 2)

print(n_per_group(0.05, 0.01), n_per_group(0.05, 0.005))`,
  annotations: [],
  expectedOutput: `lift 0.0120 (24% relative), z = 2.33, p = 0.0196
8146 31196`,
};

/** 200 A/A comparisons: how many look significant by chance, and Bonferroni. */
export const multipleRunner: CodeExample = {
  id: 'py-inference-multiple',
  language: 'python',
  run: 'pyodide',
  source: `import math
import numpy as np

rng = np.random.default_rng(11)

def p_value(a, b):
    """Two-sided test for a difference in means (normal approximation, fine for n = 50)."""
    se = math.sqrt(a.var(ddof=1) / len(a) + b.var(ddof=1) / len(b))
    z = (b.mean() - a.mean()) / se
    return math.erfc(abs(z) / math.sqrt(2))

# 200 metrics compared between two groups drawn from the SAME distribution (A/A tests)
p_values = np.array([p_value(rng.normal(0, 1, 50), rng.normal(0, 1, 50)) for _ in range(200)])
print((p_values < 0.05).sum(), "of 200 'significant' at 0.05")
print((p_values < 0.05 / 200).sum(), "significant after Bonferroni (0.05 / 200)")`,
  annotations: [],
  expectedOutput: `10 of 200 'significant' at 0.05
0 significant after Bonferroni (0.05 / 200)`,
};
