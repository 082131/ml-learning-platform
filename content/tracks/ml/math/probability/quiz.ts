import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'event',
    type: 'numeric',
    prompt: 'A fair die is rolled once. What is the probability of rolling a number greater than 4? (Give a decimal.)',
    answer: 1 / 3,
    tolerance: 0.005,
    hint: 'Count the outcomes that qualify and divide by the number of equally likely outcomes.',
    explain: '5 and 6 qualify: 2 of 6 outcomes, so 2/6 = 1/3 ≈ 0.333.',
  },
  {
    id: 'expected',
    type: 'numeric',
    prompt: 'A loaded die shows 6 with probability 0.5 and each of 1 to 5 with probability 0.1. What is E[X]?',
    answer: 4.5,
    tolerance: 0,
    hint: 'E[X] = Σ x · P(X = x). The faces 1 to 5 contribute 0.1 · (1 + 2 + 3 + 4 + 5).',
    explain: '0.1 · 15 + 0.5 · 6 = 1.5 + 3 = 4.5.',
  },
  {
    id: 'lln',
    type: 'choice',
    prompt: 'You roll a fair die 10 times and get a mean of 4.2. What happens to the sample mean as you keep rolling to 10,000?',
    options: [
      {
        text: 'It tends to get closer to 3.5, although any particular sample can still be off a little',
        correct: true,
        explain: 'The law of large numbers: the sample mean settles near E[X] as n grows. Its typical error shrinks like 1/√n.',
      },
      {
        text: 'It drops below 3.5 to make up for the high start',
        correct: false,
        explain: 'Rolls are independent; the die does not compensate. The early excess is simply diluted by many more rolls (the gambler’s fallacy).',
      },
      {
        text: 'It stays near 4.2, because the first rolls set the trend',
        correct: false,
        explain: 'Ten rolls carry little weight among 10,000.',
      },
    ],
  },
  {
    id: 'seed',
    type: 'choice',
    prompt: 'Why do ML experiments set a random seed?',
    options: [
      {
        text: 'So a run that uses randomness (shuffling, initial weights, sampling) can be repeated exactly',
        correct: true,
        explain: 'A seeded generator produces the same sequence each time, so results can be reproduced and compared.',
      },
      {
        text: 'To make the random numbers more random',
        correct: false,
        explain: 'A seed only chooses the starting point of a deterministic sequence; it does not change its quality.',
      },
      {
        text: 'To guarantee the model reaches the best possible accuracy',
        correct: false,
        explain: 'A seed fixes which result you get, not how good it is. Reporting several seeds shows how much results vary.',
      },
    ],
  },
];

export const expectedValueExercise: Exercise = {
  id: 'expected-value',
  prompt: 'Write `expected_value(values, probs)` that returns Σ x · P(X = x), and raises ValueError if the probabilities do not sum to 1.',
  starter: `def expected_value(values, probs):
    # check that probs sums to 1 (allow a tiny rounding error)
    # then return the probability-weighted sum of the values
    pass`,
  hints: [
    'Rounding means a sum of probabilities can miss 1 by a hair: `sum([1/49] * 49)` is 0.9999999999999999. Use `abs(sum(probs) - 1) > 1e-9` as the test.',
    '`raise ValueError("probabilities must sum to 1")` when the check fails.',
    'Return `sum(x * p for x, p in zip(values, probs))`.',
  ],
  solution: `def expected_value(values, probs):
    if abs(sum(probs) - 1) > 1e-9:
        raise ValueError("probabilities must sum to 1")
    return sum(x * p for x, p in zip(values, probs))`,
  explanation:
    'Each outcome contributes its value times its probability. The tolerance matters: 49 probabilities of 1/49 add up to 0.9999999999999999 in floating point, which an exact == 1 test would reject.',
  tests: `assert abs(expected_value([1, 2, 3, 4, 5, 6], [1/6] * 6) - 3.5) < 1e-12, 'a fair die has E[X] = 3.5'
assert abs(expected_value([1, 2, 3, 4, 5, 6], [0.1] * 5 + [0.5]) - 4.5) < 1e-12, 'the loaded die has E[X] = 4.5'
assert abs(expected_value(list(range(49)), [1/49] * 49) - 24) < 1e-9, '49 probabilities of 1/49 sum to 0.9999999999999999, which must be accepted'
try:
    expected_value([1, 2, 3], [0.5, 0.3, 0.3])
    raise AssertionError('probabilities summing to 1.1 should raise ValueError')
except ValueError:
    pass`,
};
