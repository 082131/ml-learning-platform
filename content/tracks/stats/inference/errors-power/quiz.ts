import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'alpha-down',
    type: 'choice',
    prompt: 'You lower α from 0.05 to 0.01 and keep n and the true effect fixed. What happens to the two error rates?',
    options: [
      { text: 'Both go down', correct: false, explain: 'With the same data, moving the rejection line can only trade one error for the other.' },
      { text: 'False alarms (α) go down, missed effects (β) go up', correct: true, explain: 'The line moves further out, so fewer null results cross it, but fewer real-effect results cross it too. In the explorer, power for d = 0.3, n = 50 drops from 68% to 42%.' },
      { text: 'α goes down; β is unchanged because it depends only on n', correct: false, explain: 'β is the area of the H1 curve on the "keep H0" side of the line, so it moves with the line.' },
    ],
  },
  {
    id: 'n-for-half',
    type: 'choice',
    prompt: 'A study needs n = 69 for 80% power to detect d = 0.3. Roughly what n is needed to detect d = 0.15 with the same power and α?',
    options: [
      { text: 'About 138, twice as many', correct: false, explain: 'Power depends on d·√n. Halving d needs √n to double.' },
      { text: 'About 275, four times as many', correct: true, explain: 'd·√n must stay the same, so n scales with 1/d²: halving the effect quadruples the sample. The explorer gives 275.' },
      { text: 'About 35, half as many', correct: false, explain: 'Smaller effects are harder to see, not easier.' },
    ],
  },
  {
    id: 'which-error',
    type: 'choice',
    prompt: 'An A/B test of a genuinely better checkout page finds p = 0.21 and the team concludes "no improvement". Which error is this?',
    options: [
      { text: 'A Type I error', correct: false, explain: 'Type I is rejecting a true null (a false alarm). Here the null was false and was not rejected.' },
      { text: 'A Type II error', correct: true, explain: 'A real effect was missed: the null is false but was not rejected. Its rate is β, and an underpowered test makes it common.' },
      { text: 'No error, because p > 0.05 means the null is true', correct: false, explain: 'A non-significant result never shows the null is true; it fails to show it is false.' },
    ],
  },
  {
    id: 'winner-curse',
    type: 'choice',
    prompt: 'Many small, underpowered experiments are run on ideas with modest real effects. You look only at the ones that came out significant. What is typical of their measured effects?',
    options: [
      { text: 'They are accurate, because significance means the effect is real', correct: false, explain: 'The effect may be real, but its size is not measured accurately.' },
      { text: 'They are exaggerated: only the lucky overestimates crossed the line', correct: true, explain: 'With low power, a result only reaches significance if noise pushed it well above the true effect. Filtering on significance keeps those overestimates (a Type M, magnitude, error).' },
      { text: 'They are underestimated, because small samples shrink effects', correct: false, explain: 'Small samples add noise in both directions; selecting the significant ones keeps the high side.' },
    ],
  },
  {
    id: 'power-value',
    type: 'numeric',
    prompt: 'A one-sided z-test with α = 0.05 (critical value 1.645). The true effect puts z at 2.5 on average (d·√n = 2.5). What is the power? Give 3 decimals.',
    answer: 0.804,
    tolerance: 0.002,
    hint: 'Under H1, z ~ N(2.5, 1). Power = P(z > 1.645).',
    explain: 'P(z > 1.645) when z ~ N(2.5, 1) is 1 − Φ(1.645 − 2.5) = 1 − Φ(−0.855) = 0.804. That is why d·√n ≈ 2.49 is the usual "80% power" target for one-sided 5% tests.',
  },
];

export const powerExercise: Exercise = {
  id: 'power-calc',
  prompt:
    'Write `power(d, n, alpha=0.05, two_sided=True)` for a z-test: the probability of rejecting H0 when the true effect is d standard deviations. Then `n_for_power(d, target=0.8, alpha=0.05, two_sided=True)`: the smallest whole n reaching the target, using the approximation n = ((z_crit + z_target) / d)².',
  starter: `from statistics import NormalDist
import math

def power(d, n, alpha=0.05, two_sided=True):
    return 0.0

def n_for_power(d, target=0.8, alpha=0.05, two_sided=True):
    return 0`,
  hints: [
    'crit = Z.inv_cdf(1 - alpha / 2) if two_sided else Z.inv_cdf(1 - alpha); shift = d * math.sqrt(n).',
    'Two-sided power adds both tails: 1 - Z.cdf(crit - shift) + Z.cdf(-crit - shift).',
  ],
  solution: `from statistics import NormalDist
import math

Z = NormalDist()

def power(d, n, alpha=0.05, two_sided=True):
    crit = Z.inv_cdf(1 - alpha / 2) if two_sided else Z.inv_cdf(1 - alpha)
    shift = d * math.sqrt(n)
    p = 1 - Z.cdf(crit - shift)
    if two_sided:
        p += Z.cdf(-crit - shift)
    return p

def n_for_power(d, target=0.8, alpha=0.05, two_sided=True):
    crit = Z.inv_cdf(1 - alpha / 2) if two_sided else Z.inv_cdf(1 - alpha)
    return math.ceil(((crit + Z.inv_cdf(target)) / d) ** 2)`,
  explanation:
    'Power is the area of the H1 curve beyond the rejection line(s). n_for_power solves "d·√n = crit + z_target" for n; it ignores the tiny far tail of a two-sided test, which is why it is called an approximation.',
  tests: `assert abs(power(0.3, 50, two_sided=False) - 0.6831290430800074) < 1e-9
assert abs(power(0.0, 50) - 0.05) < 1e-12
assert abs(power(0.3, 88) - 0.804) < 0.001
assert n_for_power(0.3, two_sided=False) == 69
assert n_for_power(0.3) == 88
assert n_for_power(0.15, two_sided=False) == 275
assert n_for_power(0.5, target=0.9) == 43`,
};
