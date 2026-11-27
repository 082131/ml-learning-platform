// Code for "Designing an A/B test". The sample size program is linked to the explorer (baseline, MDE, α, power and
// traffic come from the controls); src/lib/stats/experiments.ts (samplePerGroup) computes the same n for the chart and
// readout. The runnable examples were run with CPython 3.13 and their output copied; python-outputs.test.ts re-runs them.
import { lineOf, span } from '@/lib/foundations/annotate';
import { designExperiment, type DesignState } from '@/lib/stats/experiments';
import type { CodeExample } from '@/lib/types';

export const design = designExperiment('stats-design');

const SIZE = `import math
from statistics import NormalDist

p1 = {{p1}}                    # baseline conversion rate
p2 = p1 * (1 + {{mde}})        # the rate we want to be able to detect
alpha, power = {{alpha}}, {{power}}

z = NormalDist().inv_cdf(1 - alpha / 2) + NormalDist().inv_cdf(power)
n = math.ceil(z**2 * (p1 * (1 - p1) + p2 * (1 - p2)) / (p2 - p1) ** 2)
days = math.ceil(2 * n / {{traffic}})          # both groups share the daily traffic
print(f"{n:,} visitors per group, {days} days")`;

const st = (s: unknown) => s as DesignState;

export const sizeCode: CodeExample = {
  id: 'stats-ab-size',
  language: 'python',
  source: SIZE,
  slots: {
    p1: (s) => String(st(s).baseline / 100),
    mde: (s) => String(st(s).mde / 100),
    alpha: (s) => String(st(s).alpha),
    power: (s) => String(st(s).power),
    traffic: (s) => String(st(s).traffic),
  },
  annotations: [
    {
      id: 'p2',
      ...span(SIZE, 5, 'p1 * (1 + {{mde}})'),
      kind: 'variable',
      title: 'The minimum detectable effect',
      what: 'The smallest improvement worth detecting, as a relative lift on the baseline.',
      why: 'This is a business decision, not a statistical one: the smallest lift that would change what you ship. Everything else follows from it.',
      inputs: 'baseline and lift from the sliders',
    },
    {
      id: 'z',
      ...span(SIZE, 8, 'NormalDist().inv_cdf(1 - alpha / 2) + NormalDist().inv_cdf(power)'),
      kind: 'math',
      title: 'How many SEs apart the groups must be',
      what: '1.96 + 0.84 = 2.80 for a two-sided 5% test with 80% power.',
      why: 'The same "z_crit + z_power" as in the power lesson: the true difference must be this many standard errors to be caught 80% of the time.',
    },
    {
      id: 'n',
      ...span(SIZE, 9, 'z**2 * (p1 * (1 - p1) + p2 * (1 - p2)) / (p2 - p1) ** 2'),
      kind: 'math',
      title: 'Solve for n',
      what: 'The SE of the difference is √((p1(1−p1) + p2(1−p2)) / n). Setting (p2 − p1) / SE = z and solving for n gives this.',
      why: 'The (p2 − p1)² underneath is why small lifts are so expensive: half the lift, four times the visitors.',
      output: 'visitors per group',
    },
  ],
};

const TABLE = `import math
from statistics import NormalDist

def n_per_group(p1, rel_lift, alpha=0.05, power=0.8):
    p2 = p1 * (1 + rel_lift)
    z = NormalDist().inv_cdf(1 - alpha / 2) + NormalDist().inv_cdf(power)
    return math.ceil(z**2 * (p1 * (1 - p1) + p2 * (1 - p2)) / (p2 - p1) ** 2)

print("visitors per group to detect a relative lift (alpha 0.05 two-sided, power 80%)")
print("baseline       +5%      +10%      +20%")
for p1 in (0.01, 0.05, 0.20):
    print(f"{p1:>8.0%}" + "".join(f"{n_per_group(p1, m):>10,}" for m in (0.05, 0.10, 0.20)))`;

export const tableRunner: CodeExample = {
  id: 'stats-ab-size-table',
  language: 'python',
  run: 'pyodide',
  source: TABLE,
  annotations: [
    {
      id: 'loop',
      ...span(TABLE, lineOf(TABLE, 'for p1 in'), 'for p1 in (0.01, 0.05, 0.20):'),
      kind: 'syntax',
      title: 'Three baselines',
      what: 'A rare action (1%), a typical checkout rate (5%) and a common one (20%).',
      why: 'Read across a row for the cost of smaller lifts, and down a column for the cost of rarer actions.',
    },
  ],
  expectedOutput: `visitors per group to detect a relative lift (alpha 0.05 two-sided, power 80%)
baseline       +5%      +10%      +20%
      1%   637,008   163,092    42,691
      5%   122,121    31,231     8,155
     20%    25,580     6,507     1,680`,
};

const ASSIGN = `import hashlib
from collections import Counter

def assign(user_id, experiment="checkout-v2"):
    """Deterministic 50/50 split: the same user always gets the same group."""
    digest = hashlib.sha256(f"{experiment}:{user_id}".encode()).hexdigest()
    return "B" if int(digest[:8], 16) % 2 else "A"

print(assign("user-42"), assign("user-42"), assign("user-42", experiment="search-ranking"))
split = Counter(assign(f"user-{i}") for i in range(100_000))
print(f"A: {split['A']:,}  B: {split['B']:,}")`;

export const assignRunner: CodeExample = {
  id: 'stats-ab-assign',
  language: 'python',
  run: 'pyodide',
  source: ASSIGN,
  annotations: [
    {
      id: 'salt',
      ...span(ASSIGN, lineOf(ASSIGN, 'f"{experiment}:{user_id}"'), 'f"{experiment}:{user_id}"'),
      kind: 'syntax',
      title: 'Salt with the experiment name',
      what: 'Hashes the experiment name together with the user id.',
      why: 'Without the salt, the same users would be in group B of every experiment, and experiments would contaminate each other. With it, each experiment gets an independent split (user-42 is B here and A in search-ranking).',
    },
    {
      id: 'bucket',
      ...span(ASSIGN, lineOf(ASSIGN, 'int(digest[:8], 16) % 2'), 'int(digest[:8], 16) % 2'),
      kind: 'math',
      title: 'From hash to group',
      what: 'The first 8 hex digits as a number, odd or even.',
      why: 'A good hash behaves like a fair coin, but a reproducible one: no table of assignments to store, and a user who returns tomorrow sees the same version.',
    },
  ],
  expectedOutput: `B B A
A: 49,998  B: 50,002`,
};
