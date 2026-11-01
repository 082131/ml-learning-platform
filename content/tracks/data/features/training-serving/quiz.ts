import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'pit-value',
    type: 'numeric',
    prompt:
      'Customer A ordered on days 2, 5, 9, 12, 13 and 20. The feature counts orders in the last 7 days. A prediction is made at the start of day 14. What value is point-in-time correct?',
    answer: 3,
    tolerance: 0,
    hint: 'Use the snapshot written at the end of day 13: orders on days 7 to 13.',
    explain:
      'Days 9, 12 and 13 fall in the window, so 3. The order on day 20 is in the future and must not count.',
  },
  {
    id: 'same-day',
    type: 'choice',
    prompt: 'Why can joining each training row to the snapshot from the same day leak information?',
    options: [
      {
        text: 'That snapshot is written at the end of the day, so it includes events after the moment of prediction',
        correct: true,
        explain:
          'A prediction at 09:00 cannot know about an order at 15:00, but the end-of-day snapshot counts it.',
      },
      {
        text: 'It never leaks: the date matches, so the value is correct',
        correct: false,
        explain:
          'A matching date is not a matching moment. In the lesson, customer B’s order on day 15 is counted for a prediction made at the start of day 15.',
      },
      {
        text: 'Because the label is computed from the same day',
        correct: false,
        explain: 'Labels are meant to describe the future. The problem is a feature that does.',
      },
    ],
  },
  {
    id: 'skew-first-check',
    type: 'choice',
    prompt:
      'A churn model scored well on its test set, but in production its predictions are much worse. The data has not changed much. What do you check first?',
    options: [
      {
        text: 'Compare each feature’s distribution in the training set with the values logged at serving time',
        correct: true,
        explain:
          'Training-serving skew shows up as a feature whose serving values look different from its training values, often from two implementations of the same feature.',
      },
      {
        text: 'Retrain the model with more data',
        correct: false,
        explain:
          'If serving computes a feature differently, a model trained on more correctly computed data meets the same mismatch.',
      },
    ],
  },
  {
    id: 'psi-reading',
    type: 'choice',
    prompt:
      'A feature’s population stability index between training and last week’s serving logs is 0.31. What does that suggest?',
    options: [
      {
        text: 'A major shift: investigate whether the feature is computed differently or the population changed',
        correct: true,
        explain:
          'A common rule of thumb reads PSI under 0.1 as stable, 0.1 to 0.25 as worth a look, and above 0.25 as a major shift.',
      },
      {
        text: 'The model’s accuracy dropped by 31%',
        correct: false,
        explain: 'PSI compares distributions of one variable; it says nothing directly about accuracy.',
      },
    ],
  },
  {
    id: 'freshness',
    type: 'choice',
    prompt: 'Which feature most needs a streaming pipeline rather than a nightly batch job?',
    options: [
      {
        text: 'Failed card payments in the last 10 minutes, for a fraud model',
        correct: true,
        explain:
          'Its value changes within minutes and the decision is made now; yesterday’s count would miss the attack.',
      },
      {
        text: 'A customer’s number of orders in the last year, for a churn model',
        correct: false,
        explain:
          'It barely changes in a day, and churn decisions are not made in seconds. A nightly job is enough and much simpler.',
      },
    ],
  },
];

export const asOfExercise: Exercise = {
  id: 'as-of-value',
  prompt: 'Write `as_of_value(snapshots, day)` to look up a feature as it was at the start of `day`.',
  starter: `def as_of_value(snapshots, day):
    # snapshots: list of (snapshot_day, value), sorted by snapshot_day; each was written at the end of its day.
    # Return the value of the latest snapshot written before the start of \`day\`, or None if there is none.
    return snapshots[-1][1]`,
  hints: [
    'A snapshot written at the end of day d is available at the start of day d + 1, so it qualifies when d < day.',
    'Walk the sorted list and remember the last qualifying value.',
  ],
  solution: `def as_of_value(snapshots, day):
    value = None
    for snapshot_day, v in snapshots:
        if snapshot_day < day:
            value = v
    return value`,
  explanation:
    'This is an as-of join for one row: pandas merge_asof with allow_exact_matches=False, or a feature store’s point-in-time lookup, does the same for millions of rows. Using <= instead of < would take the same-day snapshot and leak.',
  tests: `snaps = [(3, 1), (5, 2), (9, 4), (12, 3)]
assert as_of_value(snaps, 10) == 4, 'day 10 uses the snapshot from day 9'
assert as_of_value(snaps, 9) == 2, 'the snapshot from day 9 is written after the start of day 9'
assert as_of_value(snaps, 20) == 3, 'after the last snapshot, use the last value'
assert as_of_value(snaps, 3) is None, 'nothing was written before day 3'`,
};
