import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'height-not-prob',
    type: 'choice',
    prompt: 'A normal curve for a measurement in kilograms has a peak height of 4.0 at its mean. What does the 4.0 mean?',
    options: [
      { text: 'The chance of exactly the mean value is 4.0', correct: false, explain: 'Probabilities cannot exceed 1, and any single exact value of a continuous variable has probability 0.' },
      { text: 'Near the mean, values are about 4.0 per kilogram dense: a 0.01 kg window there holds about 0.04 of the probability', correct: true, explain: 'A density is probability per unit. Multiply it by a small width to get an (approximate) probability. A tall peak just means the distribution is narrow (σ ≈ 0.1 kg here).' },
      { text: 'Nothing, because the vertical axis of a normal curve has no units', correct: false, explain: 'It has units: probability per unit of x (here, per kilogram).' },
    ],
  },
  {
    id: 'z-compare',
    type: 'choice',
    prompt: 'Store A’s daily orders: mean 500, SD 40. Store B’s: mean 120, SD 10. Yesterday A had 580 and B had 140. Which day was more unusual for its store?',
    options: [
      { text: 'A, because it was 80 orders above its mean, versus 20 for B', correct: false, explain: 'Raw differences cannot be compared across stores with different spreads.' },
      { text: 'Equally unusual: both are z = 2', correct: true, explain: '(580 − 500) / 40 = 2 and (140 − 120) / 10 = 2. Both are 2 standard deviations above their store’s mean, so (if both are normal) both are about as rare as each other.' },
      { text: 'B, because 140 is 17% above its mean and 580 is only 16% above', correct: false, explain: 'Percentages ignore how much each store normally varies. The z-score measures distance in units of typical variation.' },
    ],
  },
  {
    id: 'tail-15',
    type: 'numeric',
    prompt: 'For a standard normal (mean 0, SD 1), what is P(Z > 1.5)? Give 4 decimals.',
    answer: 0.0668,
    tolerance: 0.0005,
    hint: 'NormalDist().cdf(1.5) is the area to the left. You want the area to the right.',
    explain: 'P(Z > 1.5) = 1 − Φ(1.5) = 1 − 0.9332 = 0.0668. With orders ~ N(500, 40), that is the chance of more than 500 + 1.5 × 40 = 560 orders.',
  },
  {
    id: 'percentile',
    type: 'choice',
    prompt: 'You must provision for "all but the busiest 1% of days" with orders ~ N(500, 40). Which question are you asking, and what is the answer?',
    options: [
      { text: 'cdf(0.99): about 0.84', correct: false, explain: 'cdf takes a value and returns a probability. 0.99 is a probability, not a number of orders.' },
      { text: 'inv_cdf(0.99): about 593 orders', correct: true, explain: 'You know the probability (99% below) and want the value: the inverse CDF. 500 + 2.326 × 40 ≈ 593.' },
      { text: '500 + 3 × 40 = 620 orders', correct: false, explain: '620 is the 99.87th percentile (z = 3). It over-provisions; the 99th percentile is z ≈ 2.33.' },
    ],
  },
  {
    id: 'not-normal',
    type: 'choice',
    prompt: 'Support wait times have mean 20 minutes and SD 20 minutes. A colleague uses a normal curve and reports "2.3% of customers wait less than −20 minutes". What went wrong?',
    options: [
      { text: 'Nothing: the normal curve has tails on both sides', correct: false, explain: 'The model gives impossible negative waits real probability, which is a sign it does not fit.' },
      { text: 'Wait times cannot be negative and are skewed to the right, so a normal model does not fit them', correct: true, explain: 'When the SD is as large as the mean for a quantity that cannot go below 0, the data must be lopsided with a long right tail (here, close to exponential). Use a skewed distribution or the empirical quantiles.' },
      { text: 'The SD is too small for a normal curve', correct: false, explain: 'Any positive SD is allowed. The problem is the shape of the data, not the size of the SD.' },
    ],
  },
];

export const normalExercise: Exercise = {
  id: 'normal-between',
  prompt:
    'Write `prob_between(a, b, mu, sigma)` that returns P(a < X < b) for X ~ Normal(mu, sigma) using only `math.erf`, and `z_score(x, mu, sigma)`. The standard normal CDF is Φ(z) = (1 + erf(z / √2)) / 2.',
  starter: `import math

def z_score(x, mu, sigma):
    return 0.0

def prob_between(a, b, mu, sigma):
    return 0.0`,
  hints: [
    'z_score: (x − mu) / sigma.',
    'Write phi(z) = (1 + math.erf(z / math.sqrt(2))) / 2, then return phi(z_score(b, ...)) − phi(z_score(a, ...)).',
  ],
  solution: `import math

def z_score(x, mu, sigma):
    return (x - mu) / sigma

def phi(z):
    return (1 + math.erf(z / math.sqrt(2))) / 2

def prob_between(a, b, mu, sigma):
    return phi(z_score(b, mu, sigma)) - phi(z_score(a, mu, sigma))`,
  explanation:
    'Standardising first (the z-score) means one function, Φ, answers questions about every normal distribution. The area between a and b is the area left of b minus the area left of a.',
  tests: `assert z_score(580, 500, 40) == 2.0
assert abs(prob_between(460, 540, 500, 40) - 0.682689492) < 1e-8
assert abs(prob_between(-1.96, 1.96, 0, 1) - 0.95) < 1e-3
assert abs(prob_between(600, float("inf"), 500, 40) - 0.0062096653) < 1e-8
assert prob_between(500, 500, 500, 40) == 0.0`,
};
