import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'leak',
    type: 'choice',
    prompt: 'You forecast tomorrow’s sales. Which feature leaks information from the future?',
    options: [
      {
        text: 'sales.shift(1)',
        correct: false,
        explain: 'Yesterday’s value is known before today ends: safe.',
      },
      {
        text: 'sales.shift(1).rolling(7).mean()',
        correct: false,
        explain: 'The mean of the 7 days before today uses only the past.',
      },
      {
        text: 'sales.rolling(7, center=True).mean()',
        correct: true,
        explain:
          'A centered 7-row window includes the 3 rows after each date, which you would not have at prediction time.',
      },
      {
        text: 'sales.expanding().mean().shift(1)',
        correct: false,
        explain: 'Every value before today, shifted by one: past only.',
      },
    ],
  },
  {
    id: 'resample-zero',
    type: 'choice',
    prompt: 'Events exist on 2 and 5 March only. What does `.resample("D").sum()` give for 3 March?',
    options: [
      {
        text: 'The row is left out',
        correct: false,
        explain: 'resample creates every bin in the range, including empty ones.',
      },
      {
        text: 'NaN',
        correct: false,
        explain: 'That is what .mean() gives for an empty bin. sum of nothing is 0.',
      },
      {
        text: '0',
        correct: true,
        explain:
          'Every day in the range gets a bin, and the sum of an empty bin is 0, which can hide that data is missing.',
      },
    ],
  },
  {
    id: 'rolling-nan',
    type: 'numeric',
    prompt:
      'A daily series has 30 rows and no missing values. How many NaN values does `s.rolling(7).mean()` contain?',
    answer: 6,
    tolerance: 0,
    hint: 'A window needs 7 rows before it produces a value.',
    explain:
      'The first 6 rows do not have 7 rows of history yet, so they are NaN unless min_periods is lowered.',
  },
  {
    id: 'ffill',
    type: 'choice',
    prompt:
      'A sensor reads 5.0 at 01:00 and 8.0 at 04:00, with 02:00 and 03:00 missing. What does time interpolation give at 02:00?',
    options: [
      { text: '5.0', correct: false, explain: 'That is forward fill: it repeats the last known value.' },
      {
        text: '6.0',
        correct: true,
        explain: 'A straight line from 5.0 to 8.0 over 3 hours rises 1.0 per hour, so 02:00 gets 6.0.',
      },
      {
        text: '6.5',
        correct: false,
        explain: 'That is the midpoint of 5 and 8, which would be the value at 02:30.',
      },
      { text: '8.0', correct: false, explain: 'That is backward fill, which copies the next known value.' },
    ],
  },
  {
    id: 'tz',
    type: 'choice',
    prompt: 'Logs from servers in three countries carry local times. What should a pipeline do first?',
    options: [
      {
        text: 'Strip the time zones and sort the text',
        correct: false,
        explain: 'Local times from different zones are not comparable; sorting them mixes up the order.',
      },
      {
        text: 'Convert every timestamp to UTC',
        correct: true,
        explain:
          'UTC has no daylight-saving jumps, so order and differences are correct. Convert to local time only for display.',
      },
      {
        text: 'Resample each server separately',
        correct: false,
        explain: 'That postpones the problem: the bins would still be in different zones.',
      },
    ],
  },
];

export const lagExercise: Exercise = {
  id: 'py-timeseries-features',
  prompt: 'Write add_features(df) that adds lag_1 and mean_prev_3 columns using only past days.',
  starter: `import pandas as pd

def add_features(df):
    out = df.copy()
    out["lag_1"] = out["sales"].shift(-1)                   # bug: tomorrow
    out["mean_prev_3"] = out["sales"].rolling(3).mean()     # bug: includes today
    return out`,
  hints: [
    'shift(1) moves each value one row later, so a row sees yesterday’s value.',
    'Shift before rolling: shift(1).rolling(3).mean() averages the 3 days before each row.',
  ],
  solution: `import pandas as pd

def add_features(df):
    out = df.copy()
    out["lag_1"] = out["sales"].shift(1)
    out["mean_prev_3"] = out["sales"].shift(1).rolling(3).mean()
    return out`,
  explanation:
    'Every feature for day t must be computable at the end of day t − 1. Shifting by one before any window guarantees that the window ends yesterday.',
  tests: `import pandas as pd
df = pd.DataFrame({"sales": [10.0, 20.0, 30.0, 40.0, 50.0]},
                  index=pd.date_range("2026-01-01", periods=5, freq="D"))
out = add_features(df)
assert out["lag_1"].tolist()[1:] == [10.0, 20.0, 30.0, 40.0], out["lag_1"].tolist()
assert out["mean_prev_3"].isna().sum() == 3
assert out["mean_prev_3"].iloc[3] == 20.0 and out["mean_prev_3"].iloc[4] == 30.0
assert "lag_1" not in df.columns`,
};
