import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'not-sig-lift',
    type: 'choice',
    prompt: 'After the planned two weeks: B − A = +0.6 points (a 12% relative lift), 95% CI −0.02 to +1.22 points, p = 0.058. What is the best summary?',
    options: [
      { text: 'B has no effect', correct: false, explain: 'The interval runs up to +1.22 points: a large lift is still quite plausible. "Not significant" is not "no effect".' },
      { text: 'B is 12% better', correct: false, explain: 'The point estimate is 12%, but the interval also includes 0. Reporting the point alone overstates what the test showed.' },
      { text: 'The data are consistent with anything from no change to a sizeable lift; this test cannot decide', correct: true, explain: 'That is what the interval says. Whether to ship then depends on the cost of being wrong in each direction, which the Bayesian lessons make explicit.' },
    ],
  },
  {
    id: 'peek-why',
    type: 'choice',
    prompt: 'Why does checking an A/A test daily and stopping at the first p below 0.05 give far more than 5% false positives?',
    options: [
      { text: 'Because the p-value is computed wrongly on partial data', correct: false, explain: 'Each daily p-value is computed correctly for the data so far. The problem is how many of them you look at.' },
      { text: 'Because every look is another chance for a random fluctuation to cross 0.05, and you stop on the one that does', correct: true, explain: 'Each look alone has a 5% false alarm rate, and the looks are correlated, but with 20 looks the chance that at least one crosses is about 24%. Stopping there locks in the false alarm.' },
      { text: 'Because conversion rates change over time', correct: false, explain: 'In the simulation the rates never change, and the inflation still happens.' },
    ],
  },
  {
    id: 'pooled-why',
    type: 'choice',
    prompt: 'The z-test uses a pooled conversion rate, but the confidence interval uses each group’s own rate. Why the difference?',
    options: [
      { text: 'The test assumes H0 (no difference), so both groups share one rate; the interval must not assume anything about the difference', correct: true, explain: 'A p-value is computed in the world where H0 is true, and in that world the best estimate of the common rate pools both groups. An interval describes plausible differences, so it uses the observed rates.' },
      { text: 'Pooling makes the test more significant', correct: false, explain: 'It can go either way slightly; that is not the reason.' },
      { text: 'There is no reason; they are interchangeable', correct: false, explain: 'With large samples they give nearly the same SE, but they answer different questions, and with small or unequal samples the difference shows.' },
    ],
  },
  {
    id: 'segments',
    type: 'numeric',
    prompt: 'The overall result is flat. An analyst checks 20 segments (country, device, ...) at α = 0.05 and finds one "significant win". If B truly has no effect in any segment, what is the chance of at least one such win among 20 independent segments? Give 2 decimals.',
    answer: 0.64,
    tolerance: 0.01,
    hint: 'Complement rule: P(no false alarm in 20) = 0.95²⁰.',
    explain: '1 − 0.95²⁰ = 1 − 0.358 = 0.64. A single significant segment among 20 is what you expect from pure noise. Correct for multiple comparisons (for example Bonferroni: use 0.05 / 20 = 0.0025) or treat it as a hypothesis for a new test.',
  },
  {
    id: 'rel-vs-abs',
    type: 'choice',
    prompt: 'A report says "B lifted conversion by 20%". Baseline was 2.0%. What is the most likely absolute change?',
    options: [
      { text: 'From 2.0% to 22.0%', correct: false, explain: 'That would be +20 percentage points, an 11-fold increase.' },
      { text: 'From 2.0% to 2.4%', correct: true, explain: 'A 20% relative lift on 2.0% is 2.0 × 1.2 = 2.4%: +0.4 percentage points. Always say whether a lift is relative or in percentage points.' },
      { text: 'From 2.0% to 4.0%', correct: false, explain: 'That is a 100% relative lift, or +2 points.' },
    ],
  },
];

export const abExercise: Exercise = {
  id: 'two-proportion',
  prompt:
    'Write `ab_summary(conv_a, n_a, conv_b, n_b, confidence=0.95)` returning a dict with keys `diff` (B − A), `rel_lift` (diff / rate A), `low`, `high` (the interval, unpooled SE) and `p` (two-sided p-value of the pooled z-test).',
  starter: `import math
from statistics import NormalDist

def ab_summary(conv_a, n_a, conv_b, n_b, confidence=0.95):
    return {"diff": 0.0, "rel_lift": 0.0, "low": 0.0, "high": 0.0, "p": 1.0}`,
  hints: [
    'Interval: se = sqrt(pa(1 − pa)/n_a + pb(1 − pb)/n_b); critical value NormalDist().inv_cdf(1 − (1 − confidence)/2).',
    'Test: pooled = (conv_a + conv_b)/(n_a + n_b); se0 = sqrt(pooled(1 − pooled)(1/n_a + 1/n_b)); p = 2·(1 − Φ(|diff / se0|)).',
  ],
  solution: `import math
from statistics import NormalDist

def ab_summary(conv_a, n_a, conv_b, n_b, confidence=0.95):
    Z = NormalDist()
    pa, pb = conv_a / n_a, conv_b / n_b
    diff = pb - pa
    se = math.sqrt(pa * (1 - pa) / n_a + pb * (1 - pb) / n_b)
    zc = Z.inv_cdf(1 - (1 - confidence) / 2)
    pooled = (conv_a + conv_b) / (n_a + n_b)
    se0 = math.sqrt(pooled * (1 - pooled) * (1 / n_a + 1 / n_b))
    p = 2 * (1 - Z.cdf(abs(diff / se0)))
    return {"diff": diff, "rel_lift": diff / pa, "low": diff - zc * se, "high": diff + zc * se, "p": p}`,
  explanation:
    'This is the summary every A/B dashboard shows. Report the lift with its interval first; the p-value is a secondary check that the interval excludes zero.',
  tests: `r = ab_summary(500, 10_000, 560, 10_000)
assert abs(r["diff"] - 0.006) < 1e-12 and abs(r["rel_lift"] - 0.12) < 1e-9
assert abs(r["low"] - (-0.000209220346)) < 1e-9 and abs(r["high"] - 0.012209220346) < 1e-9
assert abs(r["p"] - 0.058257806) < 1e-6
r = ab_summary(1000, 20_000, 1120, 20_000)
assert r["low"] > 0 and abs(r["p"] - 0.0074025) < 1e-6
assert ab_summary(100, 1000, 100, 1000)["p"] == 1.0`,
};
