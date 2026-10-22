import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'why-random',
    type: 'choice',
    prompt:
      'With a budget of 9 trials over learning rate and dropout, why does random search usually find a better learning rate than a 3 × 3 grid?',
    options: [
      {
        text: 'It tries 9 different learning rates; the grid tries only 3, each repeated with 3 dropout values',
        correct: true,
        explain:
          'When one hyperparameter matters much more than the other, the grid wastes most trials re-testing the same important value (Bergstra and Bengio, 2012).',
      },
      {
        text: 'Random numbers are closer to the optimum on average',
        correct: false,
        explain:
          'A single random trial is no better than a grid point. The advantage comes from more distinct values per axis.',
      },
      {
        text: 'Random search uses gradients',
        correct: false,
        explain: 'Neither method uses gradients; both only evaluate the validation loss at chosen points.',
      },
      {
        text: 'Grid search cannot use a log scale',
        correct: false,
        explain:
          'The lesson’s grid is evenly spaced in log10(lr). The problem is the number of distinct values, not the scale.',
      },
    ],
  },
  {
    id: 'log-scale',
    type: 'choice',
    prompt: 'You search learning rates from 0.0001 to 0.1. How should you sample them?',
    options: [
      {
        text: 'Uniformly in log10(lr), from -4 to -1',
        correct: true,
        explain: 'Each decade (0.0001–0.001, 0.001–0.01, 0.01–0.1) then gets the same share of trials.',
      },
      {
        text: 'Uniformly between 0.0001 and 0.1',
        correct: false,
        explain:
          'About 90% of samples would land between 0.01 and 0.1, leaving the small rates almost untested.',
      },
      {
        text: 'Only the values 0.0001, 0.001, 0.01 and 0.1',
        correct: false,
        explain: 'That is a 4-point grid: the optimum (about 0.0126 here) is never close to a tried value.',
      },
    ],
  },
  {
    id: 'patience-1',
    type: 'choice',
    prompt:
      'With patience 1, early stopping on the lesson’s curve stops at epoch 16 although the lowest loss comes at epoch 25. Why?',
    options: [
      {
        text: 'Noise made epoch 16 slightly worse than epoch 15, and one bad epoch was enough to stop',
        correct: true,
        explain:
          'Validation loss is noisy. Patience is how many non-improving epochs you tolerate before concluding the trend has turned.',
      },
      {
        text: 'The model had started to overfit at epoch 15',
        correct: false,
        explain:
          'The loss keeps falling until epoch 25; the rise at 16 was noise, not the overfitting trend.',
      },
      {
        text: 'Early stopping always stops too early',
        correct: false,
        explain:
          'With patience 3 or more it keeps epoch 25 on this seed. It stops too early only when patience is shorter than the noise.',
      },
    ],
  },
  {
    id: 'grid-count',
    type: 'numeric',
    prompt: 'A grid search tries 5 values for each of 4 hyperparameters. How many training runs is that?',
    answer: 625,
    tolerance: 0,
    hint: 'Every combination is a run: multiply the number of values per hyperparameter.',
    explain:
      '5⁴ = 625. Grid cost grows exponentially with the number of hyperparameters, one reason random search is the usual default.',
  },
  {
    id: 'select-then-test',
    type: 'order',
    prompt: 'Put the steps of a fair tuning run in order.',
    items: [
      'Split off a test set and do not touch it',
      'Run the search, scoring every trial on the validation set',
      'Re-run the best few configs with several seeds',
      'Pick the final config by mean validation score',
      'Report its score on the test set, once',
    ],
    explain:
      'Validation scores guide the search, so the best one is optimistic. The untouched test set gives the honest number at the end.',
  },
];

export const randomSearchExercise: Exercise = {
  id: 'log-uniform-search',
  prompt:
    'Write `random_search(evaluate, n, seed)` that samples n configs with log10(lr) uniform in [-4, -1] and dropout uniform in [0, 0.5], and returns (best_loss, best_config).',
  starter: `import random

def random_search(evaluate, n, seed):
    # evaluate(config) returns a validation loss; config is {"lr": ..., "dropout": ...}.
    pass`,
  hints: [
    'Create one generator from the seed: `rng = random.Random(seed)`. Using it for every draw makes the search reproducible.',
    'Sample the exponent, not the rate: `lr = 10 ** rng.uniform(-4, -1)`.',
    'Keep the best so far: start with `best = (float("inf"), None)` and replace it when a trial has a lower loss.',
  ],
  solution: `import random

def random_search(evaluate, n, seed):
    rng = random.Random(seed)
    best = (float("inf"), None)
    for _ in range(n):
        config = {"lr": 10 ** rng.uniform(-4, -1), "dropout": rng.uniform(0, 0.5)}
        loss = evaluate(config)
        if loss < best[0]:
            best = (loss, config)
    return best`,
  explanation:
    'Sampling the exponent spreads trials evenly across decades of learning rate. A dedicated random.Random(seed) keeps the search reproducible without touching the global generator that other code might use.',
  tests: `import math
seen = []
def evaluate(config):
    seen.append(config)
    return (math.log10(config["lr"]) + 2) ** 2 + (config["dropout"] - 0.2) ** 2
out = random_search(evaluate, 200, seed=1)
assert out is not None and len(out) == 2, 'return a (best_loss, best_config) tuple'
assert len(seen) == 200, 'evaluate should be called once per trial (200 times)'
assert all(1e-4 <= c["lr"] <= 1e-1 for c in seen), 'every lr should be between 0.0001 and 0.1'
assert all(0 <= c["dropout"] <= 0.5 for c in seen), 'every dropout should be between 0 and 0.5'
decades = [sum(1 for c in seen if lo <= math.log10(c["lr"]) < lo + 1) for lo in (-4, -3, -2)]
assert min(decades) > 40, f'sample log10(lr) uniformly: trials per decade were {decades}'
assert out[0] == min(evaluate(c) for c in seen[:200]), 'best_loss should be the lowest loss you saw'
assert random_search(evaluate, 5, seed=3) == random_search(evaluate, 5, seed=3), 'the same seed should give the same result'`,
};
