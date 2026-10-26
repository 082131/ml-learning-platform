import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'std-value',
    type: 'numeric',
    prompt:
      'The values are 2, 4, 4, 4, 5, 5, 7, 9. Their mean is 5. What is the standard deviation, dividing by n (ddof = 0)?',
    answer: 2,
    tolerance: 0,
    hint: 'Square each distance from 5, average the squares, then take the square root.',
    explain:
      'Squared distances: 9, 1, 1, 1, 0, 0, 4, 16. Their mean is 32 / 8 = 4, the variance, and √4 = 2.',
  },
  {
    id: 'units',
    type: 'choice',
    prompt: 'Heights are measured in centimetres. In what units is their variance?',
    options: [
      {
        text: 'Square centimetres',
        correct: true,
        explain:
          'The variance averages squared distances. The standard deviation, its square root, is back in centimetres.',
      },
      {
        text: 'Centimetres',
        correct: false,
        explain: 'That is the standard deviation, the square root of the variance.',
      },
      { text: 'It has no units', correct: false, explain: 'Correlation has no units; the variance does.' },
    ],
  },
  {
    id: 'causation',
    type: 'choice',
    prompt:
      'Across many towns, the number of firefighters at a fire correlates strongly with the damage it causes. What is the best explanation?',
    options: [
      {
        text: 'Bigger fires cause both more damage and more firefighters to be sent',
        correct: true,
        explain:
          'The size of the fire is a confounder: it drives both quantities. Sending fewer firefighters would not reduce damage.',
      },
      {
        text: 'Firefighters cause damage',
        correct: false,
        explain:
          'Correlation alone cannot tell you the direction or the cause. Here a third variable explains it.',
      },
      {
        text: 'The correlation must be a coincidence',
        correct: false,
        explain:
          'With many towns a strong correlation is unlikely to be chance. It is real, just not causal.',
      },
    ],
  },
  {
    id: 'zero-r',
    type: 'choice',
    prompt: 'For x = −2, −1, 0, 1, 2 and y = x², the correlation r is exactly 0. What does that tell you?',
    options: [
      {
        text: 'There is no straight-line relationship, even though y is completely determined by x',
        correct: true,
        explain:
          'Pearson r measures only linear association. A U-shape has r = 0. Always look at the scatter plot.',
      },
      {
        text: 'x and y are unrelated',
        correct: false,
        explain: 'y = x² exactly; r just cannot see a curve.',
      },
      {
        text: 'The data are wrong',
        correct: false,
        explain: 'The data are fine; the summary misses the pattern.',
      },
    ],
  },
];

export const stdExercise: Exercise = {
  id: 'std',
  prompt:
    'Write `std(xs, ddof=0)` that returns the standard deviation of a list, dividing by `len(xs) - ddof`, without NumPy.',
  starter: `def std(xs, ddof=0):
    # 1. the mean
    # 2. the sum of squared distances from the mean
    # 3. divide by len(xs) - ddof, then take the square root
    pass`,
  hints: [
    '`m = sum(xs) / len(xs)`.',
    '`ss = sum((x - m) ** 2 for x in xs)` is the sum of squared distances.',
    'Return `(ss / (len(xs) - ddof)) ** 0.5`.',
  ],
  solution: `def std(xs, ddof=0):
    m = sum(xs) / len(xs)
    ss = sum((x - m) ** 2 for x in xs)
    return (ss / (len(xs) - ddof)) ** 0.5`,
  explanation:
    'The variance is the average squared distance from the mean; the standard deviation is its square root, in the original units. ddof=1 divides by n − 1, the sample standard deviation that pandas uses by default.',
  tests: `assert std([2, 4, 4, 4, 5, 5, 7, 9]) == 2.0, 'the quiz example has standard deviation 2'
assert std([3, 3, 3]) == 0.0, 'identical values have no spread'
assert abs(std([52, 61, 58, 70, 95, 104, 88, 99]) - 19.15031004970938) < 1e-9, 'matches np.std on the sales data'
assert abs(std([52, 61, 58, 70, 95, 104, 88, 99], ddof=1) - 20.47254258757324) < 1e-9, 'ddof=1 matches np.std(..., ddof=1)'`,
};
