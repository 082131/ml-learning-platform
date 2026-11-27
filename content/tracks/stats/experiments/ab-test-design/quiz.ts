import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'why-random',
    type: 'choice',
    prompt: 'Users who opted in to the new dashboard spend 30% more time in the app than those who did not. Why is that not evidence the dashboard causes more engagement?',
    options: [
      { text: 'Because 30% might not be statistically significant', correct: false, explain: 'Even a highly significant difference would not settle it. The problem is who chose the dashboard, not the size of the sample.' },
      { text: 'Because the most engaged users are the ones most likely to opt in, so the groups differed before the dashboard', correct: true, explain: 'Self-selection: the groups differ in ways that also drive engagement. Random assignment breaks that link, so the only systematic difference between groups is the treatment.' },
      { text: 'Because time in app is not a good metric', correct: false, explain: 'Maybe, but a better metric would have the same self-selection problem.' },
    ],
  },
  {
    id: 'unit',
    type: 'choice',
    prompt: 'You test a new search ranking and randomize by page view, so the same user sees old and new rankings in one session. What goes wrong?',
    options: [
      { text: 'Nothing, more units means more power', correct: false, explain: 'Page views from one user are not independent, and the user’s experience mixes both versions.' },
      { text: 'Users experience both versions, and their page views are correlated, so the effect is blurred and the SE is too small', correct: true, explain: 'The randomization unit should usually be the user: it matches the experience and keeps units independent. If you analyse per page view anyway, the variance must account for clustering by user.' },
      { text: 'The split will not be 50/50', correct: false, explain: 'Hashing page views splits them evenly; the problem is what that split means.' },
    ],
  },
  {
    id: 'halve-mde',
    type: 'numeric',
    prompt: 'At a 5% baseline you need 31,231 visitors per group to detect a +10% relative lift. About how many per group to detect +5%? (Round to the nearest thousand.)',
    answer: 122000,
    tolerance: 1000,
    hint: 'n is proportional to 1 / (p2 − p1)². Halving the lift roughly quadruples n (a bit less, because p2 also changes).',
    explain: 'The formula gives 122,121: about 3.9 times as many. Halving the detectable lift roughly quadruples the cost of the test.',
  },
  {
    id: 'mde-choice',
    type: 'choice',
    prompt: 'Your site gets 4,000 visitors a day. Detecting a +2% relative lift on a 5% baseline needs about 750,000 per group. What is the best response?',
    options: [
      { text: 'Run the test for a year', correct: false, explain: 'Possible but rarely sensible: seasonality, other changes and novelty all drift over a year, and you learn nothing until it ends.' },
      { text: 'Run it for two weeks and use α = 0.20 to get significance', correct: false, explain: 'That changes the false alarm rate to 20%, which makes the result nearly meaningless.' },
      { text: 'Accept that this test can only detect larger lifts, test a bolder change, or use a metric closer to the change with more events', correct: true, explain: 'The minimum detectable effect is set by your traffic. Small sites should test bigger changes or more sensitive metrics (for example clicks on the changed element) rather than pretend to detect tiny lifts.' },
    ],
  },
  {
    id: 'guardrail',
    type: 'choice',
    prompt: 'A new recommendation widget raises clicks per visit by 8%. What is a guardrail metric for, in this test?',
    options: [
      { text: 'To make the primary metric significant faster', correct: false, explain: 'Guardrails do not change the primary test; they watch for harm.' },
      { text: 'To catch harm the primary metric would hide, such as slower page loads or lower revenue per visit', correct: true, explain: 'A change can win on its target metric while hurting something you care about. Guardrails are decided in advance, and a significant breach blocks the launch even if the primary metric wins.' },
      { text: 'To replace the primary metric if it is not significant', correct: false, explain: 'Switching metrics after the fact is a form of p-hacking: with enough metrics, one will look significant by chance.' },
    ],
  },
];

export const sizeExercise: Exercise = {
  id: 'ab-sample-size',
  prompt:
    'Write `n_per_group(p1, rel_lift, alpha=0.05, power=0.8)` that returns the visitors per group for a two-sided two-proportion test, using n = (z₁₋α/₂ + z_power)² · (p1(1−p1) + p2(1−p2)) / (p2 − p1)² with p2 = p1·(1 + rel_lift). Then `days_needed(n, daily_visitors)`: whole days to collect n per group when traffic is split 50/50.',
  starter: `import math
from statistics import NormalDist

def n_per_group(p1, rel_lift, alpha=0.05, power=0.8):
    return 0

def days_needed(n, daily_visitors):
    return 0`,
  hints: [
    'z = NormalDist().inv_cdf(1 - alpha / 2) + NormalDist().inv_cdf(power). Round n up with math.ceil.',
    'Both groups together need 2·n visitors: math.ceil(2 * n / daily_visitors).',
  ],
  solution: `import math
from statistics import NormalDist

def n_per_group(p1, rel_lift, alpha=0.05, power=0.8):
    p2 = p1 * (1 + rel_lift)
    z = NormalDist().inv_cdf(1 - alpha / 2) + NormalDist().inv_cdf(power)
    return math.ceil(z**2 * (p1 * (1 - p1) + p2 * (1 - p2)) / (p2 - p1) ** 2)

def days_needed(n, daily_visitors):
    return math.ceil(2 * n / daily_visitors)`,
  explanation:
    'The formula is the power lesson’s n = ((z_crit + z_power) / d)² with the conversion-rate variance p(1 − p) in place of σ². Turning n into days is where a design meets reality: if the answer is 300 days, the test as designed is not feasible.',
  tests: `assert n_per_group(0.05, 0.10) == 31231
assert n_per_group(0.05, 0.20) == 8155
assert n_per_group(0.20, 0.10) == 6507
assert n_per_group(0.05, 0.10, power=0.9) > n_per_group(0.05, 0.10)
assert days_needed(31231, 4000) == 16
assert days_needed(1000, 2000) == 1`,
};
