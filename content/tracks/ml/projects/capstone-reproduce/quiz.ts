import type { Exercise, QuizQuestion } from '@/lib/types';

/** Self-assessment: answer these about your own reproduction before you call it done. */
export const questions: QuizQuestion[] = [
  {
    id: 'std',
    type: 'choice',
    prompt:
      'Every mean in your table matches the target, but every ± value is about 11% smaller. What is the most likely cause?',
    options: [
      {
        text: 'You used the population standard deviation (numpy.std divides by n) instead of the sample one (n − 1)',
        correct: true,
        explain:
          'With 5 seeds, √(4/5) ≈ 0.894, so every spread shrinks by about 11%. The means are unaffected.',
      },
      {
        text: 'Your split is different',
        correct: false,
        explain: 'A different split would change the means too.',
      },
    ],
  },
  {
    id: 'conclusions',
    type: 'choice',
    prompt:
      'With a different split your numbers differ from the target, but distance is still by far the most important component and order_id is still within noise. How do you report this?',
    options: [
      {
        text: 'The numbers did not reproduce exactly, the main conclusions did; state both and show the ablation that attributes the difference to the split',
        correct: true,
        explain:
          'Separating "same numbers" from "same conclusions" is the most useful thing a reproduction report does.',
      },
      {
        text: 'As a failed reproduction',
        correct: false,
        explain: 'That hides the fact that the findings held. Report what matched and what did not.',
      },
      {
        text: 'As a successful reproduction, without mentioning the differences',
        correct: false,
        explain: 'Every difference belongs in the report, with its cause if you found it.',
      },
    ],
  },
  {
    id: 'assumptions',
    type: 'order',
    prompt: 'Order the steps of a reproduction.',
    items: [
      'List what the description fixes and what it leaves open',
      'Implement it, recording each assumption',
      'Compare with the target, number by number',
      'Test one hypothesis about a difference with an ablation',
      'Write the report, including what the description should have said',
    ],
    explain:
      'Writing down the open details first keeps you from silently filling them in with your own habits.',
  },
];

export const pairedExercise: Exercise = {
  id: 'paired-difference',
  prompt:
    'Write `paired_difference(a, b)`: given two lists of scores from the same seeds, return the mean and the sample standard deviation of the per-seed differences b − a.',
  starter: `import statistics

def paired_difference(a, b):
    # a[i] and b[i] come from the same seed i.
    # Return (mean of b[i] - a[i], sample standard deviation of b[i] - a[i]).
    pass`,
  hints: [
    'Build the differences first: `d = [y - x for x, y in zip(a, b)]`.',
    'statistics.mean and statistics.stdev give the two numbers.',
    'Compare the spread of d with the spreads of a and b: pairing removes the noise the two runs share.',
  ],
  solution: `import statistics

def paired_difference(a, b):
    d = [y - x for x, y in zip(a, b)]
    return statistics.mean(d), statistics.stdev(d)`,
  explanation:
    'When two configurations are scored on the same seeds, much of the seed-to-seed noise is shared. The spread of the paired differences is then smaller than either spread alone, so a real but small difference becomes visible. Use it to compare your reproduction with an ablated variant.',
  tests: `import math
mean, sd = paired_difference([2.0, 2.4, 1.8, 2.2], [2.1, 2.5, 2.0, 2.3])
assert abs(mean - 0.125) < 1e-12, f"expected mean 0.125, got {mean}"
assert abs(sd - 0.05) < 1e-12, f"expected sample sd 0.05, got {sd}"
mean, sd = paired_difference([1.0, 2.0, 3.0], [2.0, 3.0, 4.0])
assert abs(mean - 1.0) < 1e-12 and sd == 0, 'a constant shift has zero spread'`,
};
