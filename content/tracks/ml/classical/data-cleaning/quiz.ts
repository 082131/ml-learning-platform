import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'dropna-default',
    type: 'choice',
    prompt:
      'Row 8 of the subset has every measurement but no sex. What does df.dropna() (no arguments) do with it?',
    options: [
      {
        text: 'Drops it, because one of its cells is missing',
        correct: true,
        explain:
          'By default dropna uses how="any": a row goes if any cell is missing. That is why df.dropna() keeps only 9 of the 14 rows.',
      },
      {
        text: 'Keeps it, because its measurements are all present',
        correct: false,
        explain:
          'That is what dropna(subset=num_cols) does. Without subset, dropna looks at every column, sex included.',
      },
      {
        text: 'Fills its sex with the most common value',
        correct: false,
        explain: 'dropna never fills anything; it only removes rows (or columns). Filling is fillna.',
      },
      {
        text: 'Raises an error, because sex is a text column',
        correct: false,
        explain:
          'Missing values are detected the same way in text and number columns. Only statistics like median() fail on text.',
      },
    ],
  },
  {
    id: 'fence',
    type: 'numeric',
    prompt:
      'Five body masses, sorted: 3300, 3450, 3750, 3800, 4150. Using quartiles with linear interpolation (as pandas does), what is the high fence Q3 + 1.5·IQR, in grams?',
    answer: 4325,
    tolerance: 0,
    hint: 'With n = 5, Q1 is at position (5 − 1)·0.25 = 1 and Q3 at position 3, counting from 0. Both are whole positions, so no interpolation is needed.',
    explain: 'Q1 = 3450, Q3 = 3800, IQR = 350, high fence = 3800 + 1.5·350 = 3800 + 525 = 4325.',
  },
  {
    id: 'typo-robust',
    type: 'choice',
    prompt:
      'With rows dropped, the subset has 9 masses: mean 4200 g, median 3800 g. Row 0’s 3750 g is mistyped as 37500 g. What happens?',
    options: [
      {
        text: 'The mean jumps to 7950 g; the median only moves to 4150 g, the next value in sorted order',
        correct: true,
        explain:
          'The mean grows by (37500 − 3750) / 9 = 3750 g. The median depends on order: 3750 was below the middle, now it is above, so the middle shifts one place.',
      },
      {
        text: 'Both move by the same amount',
        correct: false,
        explain:
          'The mean uses the size of every value; the median uses only their order. They react very differently.',
      },
      {
        text: 'Neither changes, because 37500 is flagged as an outlier',
        correct: false,
        explain:
          'Flagging changes nothing by itself. mean() and median() use every value in the Series until you fix or remove the typo.',
      },
    ],
  },
  {
    id: 'mean-fill-spread',
    type: 'choice',
    prompt:
      'You fill missing body masses with the column mean. What happens to the standard deviation of that column?',
    options: [
      {
        text: 'It shrinks, because the filled values sit exactly on the mean',
        correct: true,
        explain:
          'Each filled value adds 0 to the sum of squared distances but adds 1 to the count, so the spread looks smaller than it is.',
      },
      {
        text: 'It stays the same, because the mean stays the same',
        correct: false,
        explain:
          'The mean does stay the same, but the standard deviation divides by a larger count with no extra spread.',
      },
      {
        text: 'It grows, because there are more values',
        correct: false,
        explain:
          'More values only increase the spread when they are far from the mean. Mean-filled values are at distance 0.',
      },
    ],
  },
  {
    id: 'label-encoding',
    type: 'choice',
    prompt:
      'Why is species → Adelie = 0, Chinstrap = 1, Gentoo = 2 a poor way to feed species to a model like linear regression or k-nearest neighbors?',
    options: [
      {
        text: 'It invents an order and distances: Gentoo would be “twice” Chinstrap and Adelie would be closer to Chinstrap than to Gentoo',
        correct: true,
        explain:
          'Species have no order. One-hot columns put every pair of species at the same distance and let a model weigh each species separately.',
      },
      {
        text: 'Models can’t read integers',
        correct: false,
        explain:
          'Models read integers fine. The problem is what these particular integers claim about the categories.',
      },
      {
        text: 'It uses more memory than one-hot encoding',
        correct: false,
        explain: 'It uses less: one column instead of three. Its problem is meaning, not size.',
      },
    ],
  },
];

export const fillExercise: Exercise = {
  id: 'fill-median',
  prompt:
    'Write `fill_median(values)` that returns a new list where every `None` is replaced by the median of the values that are not `None`. Raise `ValueError` if every value is `None`.',
  starter: `def fill_median(values):
    # 1. Keep the values that are not None and sort them.
    # 2. Find their median (mean of the two middle values when the count is even).
    # 3. Return a new list with None replaced by the median.
    pass`,
  hints: [
    'present = sorted(v for v in values if v is not None). If it is empty, raise ValueError.',
    'With n = len(present): odd n → present[n // 2]; even n → (present[n // 2 - 1] + present[n // 2]) / 2.',
    'Build the result with a list comprehension: [median if v is None else v for v in values].',
  ],
  solution: `def fill_median(values):
    present = sorted(v for v in values if v is not None)
    if not present:
        raise ValueError("no values to take a median of")
    n = len(present)
    if n % 2 == 1:
        median = present[n // 2]
    else:
        median = (present[n // 2 - 1] + present[n // 2]) / 2
    return [median if v is None else v for v in values]`,
  explanation:
    'The median comes only from observed values, so the fill never feeds on itself. The function returns a new list, like pandas’ fillna, so the original data is unchanged and you can compare before and after.',
  tests: `data = [3750, None, 3250, 3800]
assert fill_median(data) == [3750, 3750, 3250, 3800], 'the median of 3250, 3750, 3800 is 3750'
assert data == [3750, None, 3250, 3800], 'fill_median should not change the list it was given'
assert fill_median([3450, None, 3800]) == [3450, 3625.0, 3800], 'an even count uses the mean of the two middle values: (3450 + 3800) / 2'
assert fill_median([1, 2, 3]) == [1, 2, 3], 'a list without None comes back unchanged'
try:
    fill_median([None, None])
    raised = False
except ValueError:
    raised = True
assert raised, 'all-None input should raise ValueError'`,
};
