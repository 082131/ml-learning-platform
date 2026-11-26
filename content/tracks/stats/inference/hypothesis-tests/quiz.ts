import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'p-meaning',
    type: 'choice',
    prompt: 'A test of "the new model is no better than 70%" gives p = 0.03. Which statement is correct?',
    options: [
      { text: 'There is a 3% chance that the null hypothesis is true', correct: false, explain: 'The p-value is computed assuming the null is true, so it cannot be the probability that the null is true. That would need a prior and Bayes’ rule.' },
      { text: 'If the new model were really only 70% accurate, a result at least this good would happen about 3% of the time', correct: true, explain: 'That is the definition: the probability of data at least this extreme, in the world where the null holds.' },
      { text: 'There is a 97% chance the new model is better', correct: false, explain: 'The same reversal as the first option. P(data | no effect) is not P(effect | data), just as P(flag | fraud) was not P(fraud | flag).' },
    ],
  },
  {
    id: 'not-sig',
    type: 'choice',
    prompt: 'On 100 tickets the new model gets 74 right (null: 70%). The one-sided p-value is 0.22. What should you conclude?',
    options: [
      { text: 'The new model is no better than the old one', correct: false, explain: 'Not rejecting the null is not the same as proving it. 74 vs 70 could be a real 4-point gain that 100 tickets are too few to detect.' },
      { text: 'This test cannot tell a small improvement from luck; a larger test set is needed to decide', correct: true, explain: 'Absence of evidence is not evidence of absence. The confidence interval would show it: it contains 70% but also values well above it.' },
      { text: 'The new model is worse, since p is large', correct: false, explain: 'A large p-value means the data are unsurprising under the null. It says nothing about the model being worse.' },
    ],
  },
  {
    id: 'same-rate-more-data',
    type: 'choice',
    prompt: 'The new model scores 78% on 100 tickets (p = 0.048) and, on a different day, 78% on 400 tickets. What happens to the p-value on 400?',
    options: [
      { text: 'It stays about 0.048, because the accuracy is the same', correct: false, explain: 'The p-value depends on how surprising the result is, and a 78% score is far more surprising from a 70% model on 400 tickets than on 100.' },
      { text: 'It falls to about 0.0002', correct: true, explain: 'The SE of an accuracy shrinks with √n, so the same 8-point gap is now about 3.5 SEs instead of 1.75. The explorer gives 0.0002.' },
      { text: 'It rises, because more data means more noise', correct: false, explain: 'More data means less noise in the average, not more.' },
    ],
  },
  {
    id: 'two-sided-switch',
    type: 'choice',
    prompt: 'Your pre-registered two-sided test gives p = 0.08. A colleague says: "Switch to one-sided, the new model is obviously not worse, and you get p = 0.04." Why is that a problem?',
    options: [
      { text: 'It is fine: one-sided tests are more powerful', correct: false, explain: 'They are more powerful when chosen in advance for a reason. Choosing them after seeing the direction of the data is a way of halving the p-value at will.' },
      { text: 'Choosing the sidedness after seeing the data inflates the false positive rate', correct: true, explain: 'If you always pick the side the data went, you effectively run a two-sided test at α = 0.10 while reporting α = 0.05. Decide the hypothesis before the data.' },
      { text: 'One-sided p-values are always larger', correct: false, explain: 'For a result in the expected direction the one-sided p is about half the two-sided p.' },
    ],
  },
  {
    id: 'ci-link',
    type: 'choice',
    prompt: 'A 95% confidence interval for the new model’s accuracy is 69.6% to 85.0%. Without any further calculation, what does a two-sided test of "accuracy = 70%" at α = 0.05 conclude?',
    options: [
      { text: 'Reject, because the interval is mostly above 70%', correct: false, explain: 'What matters is whether 70% is inside the interval, not how much of the interval is above it.' },
      { text: 'Do not reject, because 70% is inside the interval', correct: true, explain: 'A 95% interval contains exactly the null values a two-sided 5% test would not reject (for matching methods). 70% is inside, so it is still plausible.' },
      { text: 'It cannot be known without the p-value', correct: false, explain: 'Intervals and tests are two views of the same calculation; one answers the other.' },
    ],
  },
];

export const testExercise: Exercise = {
  id: 'binom-two-sided',
  prompt:
    'Write `binom_test(k, n, p0, alternative)` that returns the exact p-value of a binomial test. `alternative` is "greater" (P(X ≥ k)), "less" (P(X ≤ k)) or "two-sided" (the total probability of outcomes no more likely than k, with a relative tolerance of 1e-7 for ties).',
  starter: `import math

def binom_test(k, n, p0, alternative="two-sided"):
    return 1.0`,
  hints: [
    'Build probs = [math.comb(n, i) * p0**i * (1 - p0)**(n - i) for i in range(n + 1)].',
    'two-sided: sum(p for p in probs if p <= probs[k] * (1 + 1e-7)). Cap the result at 1.',
  ],
  solution: `import math

def binom_test(k, n, p0, alternative="two-sided"):
    probs = [math.comb(n, i) * p0**i * (1 - p0) ** (n - i) for i in range(n + 1)]
    if alternative == "greater":
        p = sum(probs[k:])
    elif alternative == "less":
        p = sum(probs[: k + 1])
    else:
        p = sum(q for q in probs if q <= probs[k] * (1 + 1e-7))
    return min(1.0, p)`,
  explanation:
    'The three alternatives share one null distribution and differ only in which outcomes count as "at least as extreme". The two-sided rule (outcomes no more likely than the observed one) is the one scipy.stats.binomtest uses, which matters when the null distribution is not symmetric.',
  tests: `assert abs(binom_test(78, 100, 0.7, "greater") - 0.047865738648274) < 1e-9
assert abs(binom_test(78, 100, 0.7) - 0.081844736917205) < 1e-9
assert abs(binom_test(9, 10, 0.5, "greater") - 0.0107421875) < 1e-12
assert abs(binom_test(60, 100, 0.5) - 0.056887933640981) < 1e-9
assert abs(binom_test(2, 10, 0.5, "less") - 0.0546875) < 1e-12
assert binom_test(5, 10, 0.5) == 1.0`,
};
