// Code for "Type I and II errors, power and sample size". The power program is linked to the explorer (d, n, α and
// the sidedness come from the controls); src/lib/stats/experiments.ts (powerResult) computes the same values for the
// chart and readout. The simulation was run with CPython 3.13 and NumPy 2.5.3 and its output copied.
import { lineOf, span } from '@/lib/foundations/annotate';
import { powerExperiment, type PowerState } from '@/lib/stats/experiments';
import type { CodeExample } from '@/lib/types';

export const power = powerExperiment('stats-power');

const POWER = `from statistics import NormalDist
import math

d, n, alpha = {{d}}, {{n}}, {{alpha}}       # true effect in SDs, sample size, false alarm rate
Z = NormalDist()                            # the standard normal curve

crit = Z.inv_cdf({{critP}})                 # reject H0 beyond this z
shift = d * math.sqrt(n)                    # where z is centred if the effect is real
power = {{powerExpr}}
n_80 = math.ceil(((crit + Z.inv_cdf(0.80)) / d) ** 2)
print(f"power = {power:.1%}; n for 80% power = {n_80}")`;

const st = (s: unknown) => s as PowerState;

export const powerCode: CodeExample = {
  id: 'stats-power-formula',
  language: 'python',
  source: POWER,
  slots: {
    d: (s) => String(Math.max(0.01, st(s).effect)),
    n: (s) => String(st(s).n),
    alpha: (s) => String(st(s).alpha),
    critP: (s) => (st(s).sides === 'two' ? '1 - alpha / 2' : '1 - alpha'),
    powerExpr: (s) => (st(s).sides === 'two' ? '1 - Z.cdf(crit - shift) + Z.cdf(-crit - shift)' : '1 - Z.cdf(crit - shift)'),
  },
  annotations: [
    {
      id: 'crit',
      ...span(POWER, 7, 'Z.inv_cdf({{critP}})'),
      kind: 'math',
      title: 'The rejection line',
      what: 'The z beyond which we reject H0: 1.645 one-sided at α = 0.05, 1.960 two-sided.',
      why: 'It is set so that, if H0 is true, z crosses it only α of the time. That is the Type I error rate.',
    },
    {
      id: 'shift',
      ...span(POWER, 8, 'd * math.sqrt(n)'),
      kind: 'math',
      title: 'How far the effect moves z',
      what: 'The effect measured in standard errors: d SDs of one observation, times √n.',
      why: 'z = (sample mean − null value) / (σ/√n). If the true mean is d·σ above the null value, z is centred at d·σ / (σ/√n) = d·√n.',
    },
    {
      id: 'power',
      range: { line: 9 },
      kind: 'math',
      title: 'Power: the area past the line',
      what: 'The share of the H1 curve (centred at the shift) that lies beyond the rejection line.',
      why: 'That is how often we would reject H0 when the effect is real. One minus it is β, the miss rate.',
      output: 'a probability',
    },
    {
      id: 'n80',
      ...span(POWER, 10, '((crit + Z.inv_cdf(0.80)) / d) ** 2'),
      kind: 'math',
      title: 'Solving for n',
      what: 'Power is 80% when the shift d·√n equals crit + 0.842. Solve for n.',
      why: 'This is how a study is sized before it runs: pick the effect worth detecting, α and the power you want.',
    },
  ],
};

const SIM = `import numpy as np
from statistics import NormalDist

rng = np.random.default_rng(3)
sigma, n, alpha = 100, 50, 0.05               # latency gain per request: SD 100 ms; 50 requests per experiment
crit = NormalDist().inv_cdf(1 - alpha)         # one-sided: reject when z > 1.645
for true_gain in (0, 15, 30, 50):
    gains = rng.normal(loc=true_gain, scale=sigma, size=(20_000, n))   # 20,000 experiments
    z = gains.mean(axis=1) / (sigma / np.sqrt(n))
    rejected = np.mean(z > crit)
    formula = 1 - NormalDist().cdf(crit - true_gain / sigma * np.sqrt(n))
    print(f"true gain {true_gain:>2} ms: H0 rejected in {rejected:6.1%} of experiments (formula {formula:6.1%})")`;

export const powerRunner: CodeExample = {
  id: 'stats-power-sim',
  language: 'python',
  run: 'pyodide',
  source: SIM,
  annotations: [
    {
      id: 'loop',
      ...span(SIM, lineOf(SIM, 'for true_gain'), 'for true_gain in (0, 15, 30, 50):'),
      kind: 'syntax',
      title: 'Four true worlds',
      what: 'No effect, then gains of 15, 30 and 50 ms (d = 0.15, 0.3, 0.5).',
      why: 'With no effect, the rejection rate is α (false alarms). With an effect, it is the power.',
    },
    {
      id: 'reject',
      ...span(SIM, lineOf(SIM, 'np.mean(z > crit)'), 'np.mean(z > crit)'),
      kind: 'math',
      title: 'Count the rejections',
      what: 'The share of the 20,000 experiments whose z crossed the line.',
      why: 'Power is literally this share. The formula predicts it without simulating.',
    },
  ],
  expectedOutput: `true gain  0 ms: H0 rejected in   5.2% of experiments (formula   5.0%)
true gain 15 ms: H0 rejected in  27.8% of experiments (formula  28.0%)
true gain 30 ms: H0 rejected in  68.1% of experiments (formula  68.3%)
true gain 50 ms: H0 rejected in  97.2% of experiments (formula  97.1%)`,
};
