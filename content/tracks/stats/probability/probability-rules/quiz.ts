import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'exclusive-independent',
    type: 'choice',
    prompt: 'A and B are mutually exclusive (they can never happen together) and each has probability 0.3. Are they independent?',
    options: [
      { text: 'Yes, because one does not cause the other', correct: false, explain: 'Independence is about information, not cause. Here, learning that A happened tells you for certain that B did not.' },
      { text: 'No, because P(A and B) = 0 but P(A)·P(B) = 0.09', correct: true, explain: 'Independence needs P(A and B) = P(A)·P(B). Mutually exclusive events with positive probabilities always fail that test: knowing one happened rules the other out.' },
      { text: 'It depends on what A and B are', correct: false, explain: 'The numbers already decide it: 0 is not 0.3 × 0.3.' },
      { text: 'Yes, because they share no outcomes', correct: false, explain: 'Sharing no outcomes is the definition of mutually exclusive, which is close to the opposite of independent.' },
    ],
  },
  {
    id: 'or-overlap',
    type: 'numeric',
    prompt: 'In a dataset, 50% of users are on mobile, 40% came from an ad, and 20% are both. What share is on mobile OR came from an ad (as a decimal)?',
    answer: 0.7,
    tolerance: 0.001,
    hint: 'Adding 0.5 and 0.4 counts the 20% who are both twice.',
    explain: 'P(M or Ad) = P(M) + P(Ad) − P(M and Ad) = 0.5 + 0.4 − 0.2 = 0.7.',
  },
  {
    id: 'complement-four',
    type: 'numeric',
    prompt: 'You roll a fair die 4 times. What is the probability of at least one 6? Give 4 decimals.',
    answer: 0.5177,
    tolerance: 0.0005,
    hint: '"At least one" has many cases. Its opposite, "no 6 at all", has one: four rolls that are each not a 6.',
    explain: 'P(no 6) = (5/6)⁴ = 625/1296 ≈ 0.4823 (multiplying is allowed because the rolls are independent). So P(at least one 6) = 1 − 0.4823 = 0.5177.',
  },
  {
    id: 'streak',
    type: 'choice',
    prompt: 'A fair coin lands heads 5 times in a row. What is the probability that the next flip is heads?',
    options: [
      { text: 'Less than 0.5, because tails is "due"', correct: false, explain: 'The gambler’s fallacy. The coin has no memory: the flips are independent, so the past does not change the next one.' },
      { text: 'Exactly 0.5', correct: true, explain: 'Independence means P(heads | five heads before) = P(heads) = 0.5. The streak was unlikely (1/32) before it happened, but it says nothing about flip six.' },
      { text: '1/64, because six heads in a row is rare', correct: false, explain: '1/64 is the chance of six heads, computed before any flip. Five have already happened; only one flip is still uncertain.' },
    ],
  },
  {
    id: 'freq-meaning',
    type: 'choice',
    prompt: 'A weather model says "70% chance of rain tomorrow". It rains. Which statement is the best check of whether the model is any good?',
    options: [
      { text: 'It was right, because it rained', correct: false, explain: 'A 70% forecast is also "right" 30% of the time when it does not rain. One day cannot confirm or refute it.' },
      { text: 'Look at all days it said 70%: it should have rained on about 70% of them', correct: true, explain: 'A probability is a long-run share. A forecaster is calibrated when its 70% days are rainy about 70% of the time. ML classifiers are judged the same way (calibration).' },
      { text: 'It was wrong, because it was not 100% sure', correct: false, explain: 'Uncertainty is the honest answer when the future is uncertain. Being sure and wrong would be far worse.' },
    ],
  },
];

export const probExercise: Exercise = {
  id: 'two-dice-prob',
  prompt:
    'Write `prob(event)` that returns the exact probability (a `Fraction`) that `event(a, b)` is true for two fair dice, and `independent(e1, e2)` that returns True when the two events are independent.',
  starter: `from fractions import Fraction
from itertools import product

def prob(event):
    return Fraction(0)

def independent(e1, e2):
    return False`,
  hints: [
    'List the 36 outcomes with product(range(1, 7), repeat=2) and count those where event(a, b) is true.',
    'independent: compare prob(lambda a, b: e1(a, b) and e2(a, b)) with prob(e1) * prob(e2).',
  ],
  solution: `from fractions import Fraction
from itertools import product

OUTCOMES = list(product(range(1, 7), repeat=2))

def prob(event):
    hits = sum(1 for a, b in OUTCOMES if event(a, b))
    return Fraction(hits, len(OUTCOMES))

def independent(e1, e2):
    both = prob(lambda a, b: e1(a, b) and e2(a, b))
    return both == prob(e1) * prob(e2)`,
  explanation:
    'Counting equally likely outcomes gives exact probabilities, and exact fractions make the independence test an exact equality. "Sum is 7" and "first die is 6" are independent (1/36 = 1/6 · 1/6); "sum is 10 or more" and "first die is 6" are not (3/36 ≠ 6/36 · 6/36).',
  tests: `from fractions import Fraction
assert prob(lambda a, b: a + b == 7) == Fraction(1, 6)
assert prob(lambda a, b: a == b) == Fraction(1, 6)
assert prob(lambda a, b: a + b >= 10) == Fraction(1, 6)
assert prob(lambda a, b: True) == 1
assert independent(lambda a, b: a + b == 7, lambda a, b: a == 6)
assert not independent(lambda a, b: a + b >= 10, lambda a, b: a == 6)
assert independent(lambda a, b: a % 2 == 1, lambda a, b: b == 6)`,
};
