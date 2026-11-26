import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'meaning',
    type: 'choice',
    prompt: 'A 95% confidence interval for the average order value is $27.90 to $50.98. Which statement is correct?',
    options: [
      { text: 'There is a 95% chance that the true average is between $27.90 and $50.98', correct: false, explain: 'In the frequentist view the true average is a fixed number: it is in this interval or not. The 95% describes the method, not this one interval. (A Bayesian credible interval does make this kind of statement; see the last chapter.)' },
      { text: '95% of orders are between $27.90 and $50.98', correct: false, explain: 'The interval is about the average, not single orders. Single orders vary far more (one in the sample was $77.90).' },
      { text: 'The procedure that produced it catches the true average in 95% of samples', correct: true, explain: 'That is exactly what the simulation shows: across many samples, about 95% of the intervals built this way contain μ.' },
    ],
  },
  {
    id: 'width-n',
    type: 'numeric',
    prompt: 'A 95% interval from 400 users is ±2.0 minutes wide. Roughly how wide (±) would it be with 1,600 users and the same spread?',
    answer: 1,
    tolerance: 0.05,
    hint: 'The margin of error is critical value × s / √n.',
    explain: 'Four times the users doubles √n, which halves the margin: ±1.0 minute.',
  },
  {
    id: 'level-tradeoff',
    type: 'choice',
    prompt: 'You switch from a 95% to a 99% interval on the same data. What happens?',
    options: [
      { text: 'The interval gets narrower, because you are more confident', correct: false, explain: 'More confidence of catching μ needs a wider net. The critical value rises from 1.96 to 2.58.' },
      { text: 'The interval gets wider, by a factor of about 2.58 / 1.96 ≈ 1.3', correct: true, explain: 'Same data, same SE; only the critical value changes. Higher confidence is bought with width, not with data.' },
      { text: 'Nothing changes; confidence only affects the p-value', correct: false, explain: 'The confidence level sets the critical value, which sets the width directly.' },
    ],
  },
  {
    id: 't-why',
    type: 'choice',
    prompt: 'With n = 5, why does a z interval that plugs in the sample SD catch μ only about 88% of the time instead of 95% (for normal data)?',
    options: [
      { text: 'Because the sample mean is biased for small n', correct: false, explain: 'The sample mean is unbiased at every n. The problem is in the width, not the centre.' },
      { text: 'Because s from 5 values is itself uncertain, often too small, so the interval is often too narrow; the t critical value (2.78 instead of 1.96) pays for that', correct: true, explain: 'The z interval treats s as if it were the true σ. With 4 degrees of freedom, s varies a lot; the t distribution’s heavier tails widen the interval just enough to restore 95%.' },
      { text: 'Because the data are not normal', correct: false, explain: 'It happens with normal data too: try heights (which are normal) with n = 3 to 5 in the explorer.' },
    ],
  },
  {
    id: 'overlap',
    type: 'choice',
    prompt: 'Group A’s 95% interval is 10.0 to 12.0 and group B’s is 11.5 to 13.5. They overlap. Can you conclude the groups do not differ?',
    options: [
      { text: 'Yes: overlapping intervals mean no significant difference', correct: false, explain: 'A common rule of thumb, and wrong. Two intervals can overlap a little while the difference between the groups is still clearly non-zero.' },
      { text: 'No: you need the interval for the difference itself, whose SE is √(SE_A² + SE_B²), smaller than SE_A + SE_B', correct: true, explain: 'Here SE ≈ 0.51 each, so the difference 1.5 has SE ≈ 0.72 and a 95% interval of about 0.1 to 2.9, which excludes 0. Variances add; widths do not.' },
      { text: 'No: overlapping intervals mean B is definitely larger', correct: false, explain: 'Overlap alone tells you neither. Compute the interval for B − A.' },
    ],
  },
];

export const ciExercise: Exercise = {
  id: 'mean-ci',
  prompt:
    'Write `mean_ci(sample, crit)` that returns `(low, high)`: the sample mean ± crit × (sample SD with n − 1) / √n. Then write `margin_n(s, margin, crit=1.96)` that returns the smallest whole n whose margin of error is at most `margin` when the SD is `s`.',
  starter: `import math
import statistics

def mean_ci(sample, crit):
    return (0.0, 0.0)

def margin_n(s, margin, crit=1.96):
    return 0`,
  hints: [
    'mean_ci: m = statistics.fmean(sample); half = crit * statistics.stdev(sample) / math.sqrt(len(sample)).',
    'margin_n: crit · s / √n ≤ margin gives n ≥ (crit · s / margin)². Round up.',
  ],
  solution: `import math
import statistics

def mean_ci(sample, crit):
    m = statistics.fmean(sample)
    half = crit * statistics.stdev(sample) / math.sqrt(len(sample))
    return (m - half, m + half)

def margin_n(s, margin, crit=1.96):
    return math.ceil((crit * s / margin) ** 2)`,
  explanation:
    'Every interval in this track has this shape: estimate ± critical value × standard error. Planning n from a target margin is the same formula solved the other way, and it is how you size a survey or an A/B test before collecting any data.',
  tests: `orders = [23.5, 41.0, 18.2, 77.9, 35.4, 29.9, 52.3, 19.8, 64.1, 38.7, 27.5, 45.0]
lo, hi = mean_ci(orders, 2.201)
assert abs(lo - 27.90) < 0.01 and abs(hi - 50.98) < 0.01
lo, hi = mean_ci([10, 12], 1.0)
assert abs(lo - 10.0) < 1e-12 and abs(hi - 12.0) < 1e-12
assert margin_n(20, 2) == 385
assert margin_n(20, 1) == 1537
assert margin_n(10, 1, crit=2.576) == 664`,
};
