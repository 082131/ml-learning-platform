import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'what-becomes-normal',
    type: 'choice',
    prompt: 'You collect 10,000 support wait times, which are strongly skewed. According to the central limit theorem, what becomes approximately normal?',
    options: [
      { text: 'The histogram of the 10,000 wait times', correct: false, explain: 'The data keep their skewed shape however many you collect: more data just shows that shape more clearly.' },
      { text: 'The distribution of the average wait, across repeated samples of 10,000', correct: true, explain: 'The theorem is about the sample mean (or sum). Its sampling distribution is close to N(μ, σ/√n) even though single waits are skewed.' },
      { text: 'Both', correct: false, explain: 'Only the average. Confusing the two leads to "the CLT says my data are normal", which it never does.' },
    ],
  },
  {
    id: 'rare-events',
    type: 'choice',
    prompt: 'A conversion rate is about 0.5%. You estimate it from n = 200 visitors. Is the normal curve a good model for the estimated rate?',
    options: [
      { text: 'Yes, n = 30 is always enough', correct: false, explain: '"30" is a rule of thumb for moderately skewed data. With rare events, most samples of 200 contain 0, 1 or 2 conversions: a lumpy, skewed distribution.' },
      { text: 'No: with about 1 expected conversion the distribution is lumpy and skewed; you need many more visitors', correct: true, explain: 'n · p = 200 × 0.005 = 1. A common check is at least about 10 expected successes and 10 failures before trusting the normal approximation.' },
      { text: 'Yes, because proportions are always normal', correct: false, explain: 'A proportion is a mean of 0/1 values, so the CLT applies, but only once n · p is large enough.' },
    ],
  },
  {
    id: 'z-of-mean',
    type: 'numeric',
    prompt: 'Heights have μ = 170 cm and σ = 10 cm. A random sample of 25 people has mean 174 cm. How many standard errors above μ is that?',
    answer: 2,
    tolerance: 0.001,
    hint: 'The SE of a mean of 25 is σ / √25.',
    explain: 'SE = 10 / 5 = 2 cm, so z = (174 − 170) / 2 = 2. A single 174 cm person is unremarkable (z = 0.4), but a group of 25 averaging that is unusual: averages vary much less than individuals.',
  },
  {
    id: 'why-bell',
    type: 'choice',
    prompt: 'Which explanation best captures WHY averages tend toward a bell shape?',
    options: [
      { text: 'Extreme averages need many values to be extreme in the same direction at once, which is rare, while there are many ways to land near the middle', correct: true, explain: 'An average of 30 is only extreme if most of the 30 are extreme the same way. Middle averages can be reached by countless mixes of high and low values, so they pile up.' },
      { text: 'Random samples remove the outliers before averaging', correct: false, explain: 'Nothing is removed. Outliers are diluted by being averaged with ordinary values, not dropped.' },
      { text: 'Data become normal when you collect enough of them', correct: false, explain: 'That is the common misreading: data keep their shape; their averages change shape.' },
    ],
  },
  {
    id: 'sum',
    type: 'choice',
    prompt: 'A server handles 400 independent requests a minute, each taking a skewed time with mean 50 ms and SD 80 ms. What is roughly true of the total CPU time per minute?',
    options: [
      { text: 'Approximately normal with mean 20 s and SD 1.6 s', correct: true, explain: 'The CLT covers sums too. Mean 400 × 50 ms = 20 s; variance adds to 400 × 80² ms², so SD = 20 × 80 ms = 1.6 s.' },
      { text: 'Skewed like the single requests, with SD 400 × 80 ms = 32 s', correct: false, explain: 'Standard deviations do not add; variances do. And the sum of many independent values is close to normal.' },
      { text: 'Impossible to say without knowing the exact distribution of one request', correct: false, explain: 'For a sum of 400 independent values, the mean and SD are enough for a good normal approximation.' },
    ],
  },
];

export const cltExercise: Exercise = {
  id: 'clt-range',
  prompt:
    'Write `mean_range(mu, sigma, n, coverage=0.95)` that returns `(low, high)`: the central range that sample means of size n fall in with the given probability, according to the central limit theorem. Use `statistics.NormalDist`.',
  starter: `from statistics import NormalDist

def mean_range(mu, sigma, n, coverage=0.95):
    return (0.0, 0.0)`,
  hints: [
    'The sample mean is approximately NormalDist(mu, sigma / n ** 0.5).',
    'The central 95% runs from the 2.5% point to the 97.5% point: inv_cdf((1 - coverage) / 2) and inv_cdf(1 - (1 - coverage) / 2).',
  ],
  solution: `from statistics import NormalDist

def mean_range(mu, sigma, n, coverage=0.95):
    means = NormalDist(mu, sigma / n ** 0.5)
    tail = (1 - coverage) / 2
    return (means.inv_cdf(tail), means.inv_cdf(1 - tail))`,
  explanation:
    'This is the CLT in one line: a normal curve for the mean, centred on μ, with the standard error as its width. The confidence interval in the next lesson turns this range around, from "where will the sample mean land" to "where could μ be".',
  tests: `lo, hi = mean_range(20, 20, 400)
assert abs(lo - (20 - 1.959963984540054)) < 1e-9 and abs(hi - (20 + 1.959963984540054)) < 1e-9
lo, hi = mean_range(170, 10, 25, coverage=0.68)
assert abs((hi - lo) / 2 - 2 * 0.994457883) < 1e-6
lo, hi = mean_range(0, 1, 1, coverage=0.99)
assert abs(hi - 2.5758293035489) < 1e-9 and abs(lo + hi) < 1e-12`,
};
