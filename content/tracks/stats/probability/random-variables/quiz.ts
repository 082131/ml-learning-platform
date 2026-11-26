import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'ev-not-outcome',
    type: 'choice',
    prompt: 'A fair die has E[X] = 3.5. What does that number promise?',
    options: [
      { text: 'Over many rolls, the average roll gets close to 3.5', correct: true, explain: 'The expected value is a long-run average. No single roll can be 3.5.' },
      { text: '3.5 is the most likely single roll', correct: false, explain: 'Every face is equally likely, and 3.5 is not a face at all. The most likely value (the mode) and the expected value are different ideas.' },
      { text: 'Half the rolls are above 3.5, so 3.5 is the median', correct: false, explain: 'True for a fair die by symmetry, but not what E[X] means. For the insurance claims, the median is $0 while E[X] is $140.' },
    ],
  },
  {
    id: 'claims-median',
    type: 'choice',
    prompt: 'Insurance claims: $0 with probability 0.9, $500 with 0.08, $5,000 with 0.02. E[X] = $140. Why should the insurer care about E[X] rather than the typical (median) claim of $0?',
    options: [
      { text: 'Because E[X] is always closer to the typical value', correct: false, explain: 'Here it is far from the typical value: 90% of policies pay nothing.' },
      { text: 'Because premiums are summed over many policies, and the total is about (number of policies) × E[X]', correct: true, explain: 'With 10,000 policies the insurer pays out about 10,000 × $140 = $1.4 million. The rare big claims are a large part of that, and the median ignores them completely.' },
      { text: 'Because the SD is small', correct: false, explain: 'The SD is $707, five times the mean. Large spread is exactly why one policy is unpredictable while the total of many is not.' },
    ],
  },
  {
    id: 'rescale',
    type: 'numeric',
    prompt: 'X is a delivery time in hours with E[X] = 2 and SD(X) = 0.5. You report it in minutes plus a fixed 10-minute handling time: Y = 60X + 10. What is SD(Y), in minutes?',
    answer: 30,
    tolerance: 0,
    hint: 'Adding a constant shifts every value by the same amount. Multiplying stretches every distance.',
    explain: 'Var(aX + b) = a²·Var(X), so SD(Y) = |a|·SD(X) = 60 × 0.5 = 30 minutes. The +10 moves the mean (to 130) but not the spread.',
  },
  {
    id: 'sum-var',
    type: 'choice',
    prompt: 'X and Y are independent, each with SD 3. What is the SD of X + Y?',
    options: [
      { text: '6', correct: false, explain: 'Standard deviations do not add. Variances do (for independent variables), and the SD is the square root of the variance.' },
      { text: 'About 4.24', correct: true, explain: 'Var(X + Y) = 9 + 9 = 18, so SD = √18 ≈ 4.24. Some of X’s high values meet Y’s low ones and partly cancel, so the sum spreads less than 3 + 3.' },
      { text: '3', correct: false, explain: 'That would mean adding a second random variable adds no uncertainty.' },
    ],
  },
  {
    id: 'sd-vs-average',
    type: 'choice',
    prompt: 'In the simulation, each player spins 1,000 times. If they spun 100,000 times instead, what would happen to (a) the SD of single spins and (b) how far their average is from 0.6?',
    options: [
      { text: '(a) shrinks toward 0, (b) shrinks', correct: false, explain: 'The SD of single spins describes one spin. One spin is as unpredictable as ever, so it stays near 1.9.' },
      { text: '(a) stays near 1.9, (b) shrinks', correct: true, explain: 'The spread of one spin is a property of the game. The average of many spins settles toward E[X] (law of large numbers), so its distance from 0.6 shrinks, roughly like 1/√n.' },
      { text: '(a) stays near 1.9, (b) stays the same', correct: false, explain: 'Averages of more spins get closer to the expected value: that is the law of large numbers.' },
    ],
  },
];

export const evExercise: Exercise = {
  id: 'ev-var',
  prompt:
    'Write `describe(dist)` for a distribution given as a dict `{value: probability}`. Return `(mean, variance, sd)`. Raise `ValueError` if the probabilities do not add up to 1 (within 1e-9) or any is negative.',
  starter: `def describe(dist):
    return (0.0, 0.0, 0.0)`,
  hints: [
    'Check the probabilities first: sum(dist.values()) should be 1 and min(...) at least 0.',
    'mean = Σ x·p. variance = Σ (x − mean)²·p. sd = variance ** 0.5.',
  ],
  solution: `def describe(dist):
    probs = dist.values()
    if abs(sum(probs) - 1) > 1e-9 or min(probs) < 0:
        raise ValueError("probabilities must be non-negative and add up to 1")
    mean = sum(x * p for x, p in dist.items())
    variance = sum((x - mean) ** 2 * p for x, p in dist.items())
    return (mean, variance, variance ** 0.5)`,
  explanation:
    'A distribution table is all you need: the mean weights values by how often they happen, and the variance weights squared distances from that mean the same way. The validity check matters in practice: probabilities that do not add up to 1 usually mean a missing outcome.',
  tests: `m, v, s = describe({-1: 0.5, 1: 0.3, 4: 0.2})
assert abs(m - 0.6) < 1e-12 and abs(v - 3.64) < 1e-12 and abs(s - 3.64 ** 0.5) < 1e-12
m, v, s = describe({k: 1 / 6 for k in range(1, 7)})
assert abs(m - 3.5) < 1e-12 and abs(v - 35 / 12) < 1e-12
assert describe({5: 1.0}) == (5.0, 0.0, 0.0)
for bad in [{1: 0.5, 2: 0.4}, {1: 1.2, 2: -0.2}]:
    try:
        describe(bad)
    except ValueError:
        pass
    else:
        raise AssertionError(bad)`,
};
