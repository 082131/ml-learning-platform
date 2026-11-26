import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'which-dist',
    type: 'choice',
    prompt: 'Which of these counts is best modelled as binomial rather than Poisson?',
    options: [
      { text: 'Errors logged by a server in one hour', correct: false, explain: 'There is no fixed number of tries, only a rate over time: a Poisson setting.' },
      { text: 'How many of today’s 400 email recipients click the link', correct: true, explain: 'A fixed number of tries (400 recipients), each a yes/no with roughly the same chance: binomial.' },
      { text: 'Typos on a page of text', correct: false, explain: 'Events scattered over a space with no natural "number of tries": Poisson.' },
    ],
  },
  {
    id: 'at-least-one',
    type: 'numeric',
    prompt: 'Each of 20 visitors buys with probability 0.1, independently. What is the probability that at least one buys? Give 4 decimals.',
    answer: 0.8784,
    tolerance: 0.0005,
    hint: 'Use the complement: P(at least one) = 1 − P(X = 0).',
    explain: 'P(X = 0) = 0.9²⁰ ≈ 0.1216, so P(X ≥ 1) = 1 − 0.1216 = 0.8784. The binomial formula with k = 0 is just the chance that all 20 fail.',
  },
  {
    id: 'poisson-approx',
    type: 'choice',
    prompt: 'A batch has 50 items, each defective with probability 0.02. Binomial gives P(2 or more defective) = 0.2642. A Poisson with λ = 50 × 0.02 = 1 gives 0.2642 too. Why do they agree so closely?',
    options: [
      { text: 'Because the binomial and Poisson formulas are the same', correct: false, explain: 'They are different formulas; they give different answers for, say, 10 items at p = 0.5.' },
      { text: 'Because there are many tries, each with a small chance, which is the case Poisson is the limit of', correct: true, explain: 'Poisson is the binomial with n → ∞ and p → 0 while n·p = λ stays fixed. With n = 50 and p = 0.02 we are close to that limit.' },
      { text: 'Because λ = 1 is a special value', correct: false, explain: 'The agreement comes from large n and small p, not from the value of λ.' },
    ],
  },
  {
    id: 'clumped',
    type: 'choice',
    prompt: 'Support tickets average 3 per hour, but the hourly counts have variance 12. What does that tell you about using Poisson(3) to plan staffing?',
    options: [
      { text: 'Poisson fits well: the mean is 3', correct: false, explain: 'A Poisson with mean 3 must also have variance 3. Variance 12 means the counts spread far more.' },
      { text: 'The tickets arrive in clumps (outages, launches), so Poisson(3) will underestimate busy hours', correct: true, explain: 'Independence between events is broken: one outage creates many tickets at once. Over-dispersed counts need a model like the negative binomial, or planning from the empirical busy hours.' },
      { text: 'The variance should be 9, the mean squared', correct: false, explain: 'For a Poisson the variance equals the mean (3), not the mean squared.' },
    ],
  },
  {
    id: 'mean-sd',
    type: 'numeric',
    prompt: 'A model labels 400 tickets and is right on each with probability 0.9, independently. What is the standard deviation of the number it gets right?',
    answer: 6,
    tolerance: 0.01,
    hint: 'A binomial count is a sum of n independent Bernoulli trials, each with variance p(1 − p).',
    explain: 'Var = n·p·(1 − p) = 400 × 0.9 × 0.1 = 36, so SD = 6. The expected count is 360, and most runs land within about 348 to 372.',
  },
];

export const binomExercise: Exercise = {
  id: 'binomial-tail',
  prompt:
    'Write `binom_pmf(k, n, p)` and `binom_tail(k, n, p)`, which returns P(X ≥ k) for X ~ Binomial(n, p). Use only the standard library (`math.comb`).',
  starter: `import math

def binom_pmf(k, n, p):
    return 0.0

def binom_tail(k, n, p):
    return 0.0`,
  hints: [
    'binom_pmf: math.comb(n, k) * p**k * (1 - p)**(n - k).',
    'binom_tail: add binom_pmf(i, n, p) for i from k up to n inclusive.',
  ],
  solution: `import math

def binom_pmf(k, n, p):
    if k < 0 or k > n:
        return 0.0
    return math.comb(n, k) * p**k * (1 - p) ** (n - k)

def binom_tail(k, n, p):
    return sum(binom_pmf(i, n, p) for i in range(max(k, 0), n + 1))`,
  explanation:
    'P(X ≥ k) adds the bars from k to n. You will use exactly this sum in the hypothesis testing lesson: "how likely is a result at least this good if the model were no better than before?"',
  tests: `assert abs(binom_pmf(3, 10, 0.5) - 0.1171875) < 1e-12
assert abs(sum(binom_pmf(k, 20, 0.1) for k in range(21)) - 1) < 1e-12
assert abs(binom_tail(8, 10, 0.5) - 0.0546875) < 1e-12
assert abs(binom_tail(0, 7, 0.3) - 1) < 1e-12
assert binom_pmf(11, 10, 0.5) == 0.0
assert abs(binom_tail(1, 20, 0.1) - (1 - 0.9 ** 20)) < 1e-12`,
};
