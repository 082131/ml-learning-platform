import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'p-meaning',
    type: 'choice',
    prompt: 'An A/B test reports p = 0.03 for the difference in conversion. Which statement is correct?',
    options: [
      {
        text: 'There is a 3% chance that the variant has no effect at all, given this data',
        correct: false,
        explain:
          'That is the most common misreading. The p-value assumes no effect; it cannot also give the probability of it.',
      },
      {
        text: 'If there were no effect, a gap this large would show up about 3% of the time',
        correct: true,
        explain:
          'That is the definition: the probability of data at least this extreme under the null hypothesis.',
      },
      {
        text: 'The variant converts 3% better than the control, as measured here',
        correct: false,
        explain: 'The p-value says nothing about size. Look at the estimated lift and its interval.',
      },
      {
        text: 'There is a 97% chance that a rerun of this test would replicate the result',
        correct: false,
        explain: 'Replication depends on power and the true effect, not on one p-value.',
      },
    ],
  },
  {
    id: 'ci-meaning',
    type: 'choice',
    prompt: 'What does a 95% confidence interval of [0.04, 0.74] minutes for a difference mean?',
    options: [
      {
        text: 'There is a 95% probability that the true difference lies between 0.04 and 0.74',
        correct: false,
        explain:
          'Once computed, this interval either contains the true value or not. The 95% describes the method.',
      },
      {
        text: '95% of visits differ by 0.04 to 0.74 minutes',
        correct: false,
        explain: 'The interval is about the difference in means, not individual visits.',
      },
      {
        text: 'The method captures the true difference in 95% of repeated samples',
        correct: true,
        explain:
          'And because 0 is outside this interval, the data are not consistent with no effect at the 5% level.',
      },
    ],
  },
  {
    id: 'se-scaling',
    type: 'numeric',
    prompt: 'With n = 100 the standard error of a mean is 2.0. About what is it with n = 400?',
    answer: 1,
    tolerance: 0.05,
    hint: 'The standard error is std / √n.',
    explain: 'Four times the data halves the standard error: 2.0 × √(100/400) = 1.0.',
  },
  {
    id: 'peeking',
    type: 'choice',
    prompt: 'A team checks its A/B test every day and stops as soon as p < 0.05. What is wrong?',
    options: [
      {
        text: 'Nothing, as long as the final p is below 0.05',
        correct: false,
        explain:
          'Each look is another chance for noise to cross the line, so the real false-positive rate climbs well above 5%.',
      },
      {
        text: 'Repeated looks inflate the false-positive rate',
        correct: true,
        explain: 'Fix the sample size in advance, or use a sequential method designed for repeated looks.',
      },
      {
        text: 'Daily data is too noisy to test',
        correct: false,
        explain: 'Noise is what the test accounts for; the problem is stopping on a lucky day.',
      },
    ],
  },
  {
    id: 'multiple',
    type: 'choice',
    prompt:
      'You compare 40 metrics between two identical groups at the 0.05 level. How many “significant” results should you expect?',
    options: [
      {
        text: 'None',
        correct: false,
        explain: 'Each test has a 5% chance of a false positive even with no difference at all.',
      },
      {
        text: 'About 2',
        correct: true,
        explain:
          '40 × 0.05 = 2. That is why many comparisons need a correction such as Bonferroni (0.05 / 40).',
      },
      {
        text: 'About 20',
        correct: false,
        explain: 'That would be a 50% false-positive rate; the level is 5%.',
      },
    ],
  },
];

export const bootstrapExercise: Exercise = {
  id: 'py-inference-bootstrap',
  prompt:
    'Write bootstrap_ci(values, rng, rounds=2000) that returns a 95% percentile bootstrap interval for the median.',
  starter: `import numpy as np

def bootstrap_ci(values, rng, rounds=2000):
    med = np.median(values)
    return med - 1.96 * np.std(values), med + 1.96 * np.std(values)   # not a bootstrap`,
  hints: [
    'Each round: sample = rng.choice(values, size=len(values)) (with replacement), then take its median.',
    'Collect the medians in an array.',
    'np.percentile(medians, [2.5, 97.5]) gives the two ends.',
  ],
  solution: `import numpy as np

def bootstrap_ci(values, rng, rounds=2000):
    meds = np.empty(rounds)
    for i in range(rounds):
        meds[i] = np.median(rng.choice(values, size=len(values)))
    lo, hi = np.percentile(meds, [2.5, 97.5])
    return lo, hi`,
  explanation:
    'Resampling the data with replacement imitates drawing new samples, so the spread of the resampled medians shows how uncertain the median is. It works for statistics with no simple formula, like the median.',
  tests: `import numpy as np
vals = np.array([3, 5, 7, 8, 9, 11, 12, 15, 21, 40], dtype=float)
lo, hi = bootstrap_ci(vals, np.random.default_rng(0))
assert lo <= np.median(vals) <= hi
assert 4 <= lo <= 9 and 10 <= hi <= 21, (lo, hi)
lo2, hi2 = bootstrap_ci(vals, np.random.default_rng(0))
assert (lo, hi) == (lo2, hi2), "use the rng you are given"`,
};
