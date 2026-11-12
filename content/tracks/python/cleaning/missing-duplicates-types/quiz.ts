import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'mean-fill',
    type: 'choice',
    prompt:
      'Incomes are 48k, 52k, 55k, 61k and one 1.2M, plus two missing. Why is filling the gaps with the mean a poor choice here?',
    options: [
      {
        text: 'The mean ignores the missing values',
        correct: false,
        explain: 'Skipping them is correct; the issue is what the mean of the known values is.',
      },
      {
        text: 'One extreme value drags it to 283,200',
        correct: true,
        explain:
          'The 1.2M income pulls the mean far above every typical value; the median, 55,000, is not moved by it.',
      },
      {
        text: 'The mean can only fill integer columns',
        correct: false,
        explain: 'fillna accepts any number for a float column.',
      },
      {
        text: 'Filling never changes the median',
        correct: false,
        explain: 'It can, and it shrinks the spread, but that is not why the mean is a poor fill here.',
      },
    ],
  },
  {
    id: 'coerce-count',
    type: 'numeric',
    prompt:
      'A text column has 1,000 values and 12 are missing. After `pd.to_numeric(col, errors="coerce")` there are 31 NaN. How many present values failed to parse?',
    answer: 19,
    tolerance: 0,
    hint: 'NaN after = missing before + parse failures.',
    explain:
      '31 − 12 = 19 values were present but not numbers. Always compare the counts, because coerce never complains.',
  },
  {
    id: 'flag',
    type: 'choice',
    prompt: 'Why add an `income_missing` column before filling income for a model?',
    options: [
      {
        text: 'pandas needs it to undo the fill',
        correct: false,
        explain: 'pandas keeps no history; the flag is for the model and for you.',
      },
      {
        text: 'Missingness itself can predict the target',
        correct: true,
        explain:
          'People who skip the income question may differ from those who answer; the flag keeps that signal after the gap is filled.',
      },
      {
        text: 'Models cannot accept filled values',
        correct: false,
        explain: 'Filled values are fine; without a flag they are just indistinguishable from real ones.',
      },
    ],
  },
  {
    id: 'dupe-key',
    type: 'choice',
    prompt: 'A table should have one row per user_id. `df.duplicated().sum()` is 0. Is the key unique?',
    options: [
      {
        text: 'Yes, there are no duplicates',
        correct: false,
        explain:
          'duplicated() with no subset compares whole rows. Two rows for one user with different emails are not exact duplicates.',
      },
      {
        text: 'Not proven; check df["user_id"].is_unique',
        correct: true,
        explain: 'Key uniqueness is a property of the key column. Check it directly.',
      },
      {
        text: 'No, duplicated() only checks the first column',
        correct: false,
        explain: 'Without subset it checks every column, which is why it misses key duplicates.',
      },
    ],
  },
  {
    id: 'date-coerce',
    type: 'choice',
    prompt: 'What does `pd.to_datetime(["2026-02-30"], errors="coerce", format="%Y-%m-%d")` give?',
    options: [
      {
        text: '2026-03-02, rolled over',
        correct: false,
        explain: 'pandas does not roll invalid dates forward.',
      },
      { text: '2026-02-28, clipped', correct: false, explain: 'Nor does it clip to the last valid day.' },
      {
        text: 'NaT, a missing timestamp',
        correct: true,
        explain:
          'February has no 30th, so parsing fails, and coerce turns the failure into NaT (not a time).',
      },
      { text: 'A ValueError', correct: false, explain: 'Only with errors="raise", the default.' },
    ],
  },
];

export const cleanExercise: Exercise = {
  id: 'py-cleaning-clean-users',
  prompt:
    'Write clean_users(df) that returns a cleaned copy and fails loudly if the result breaks the rules.',
  starter: `import pandas as pd

def clean_users(df):
    out = df.copy()
    out["age"] = out["age"].astype(int)      # crashes on "n/a"
    return out`,
  hints: [
    'Drop exact duplicates first, then coerce age with pd.to_numeric(..., errors="coerce").',
    'Ages outside 0..120 become missing: out["age"].where(out["age"].between(0, 120)).',
    'Fill age with the median, then assert out["user_id"].is_unique.',
  ],
  solution: `import pandas as pd

def clean_users(df):
    out = df.drop_duplicates().copy()
    out["age"] = pd.to_numeric(out["age"], errors="coerce")
    out["age"] = out["age"].where(out["age"].between(0, 120))
    out["age_missing"] = out["age"].isna()
    out["age"] = out["age"].fillna(out["age"].median())
    assert out["user_id"].is_unique, "duplicate user_id after cleaning"
    return out`,
  explanation:
    'Every step is explicit and reversible to reason about: duplicates, parse failures, impossible values, a flag, then a robust fill. The final assertion turns a silent data problem into an immediate error.',
  tests: `import pandas as pd
raw = pd.DataFrame({"user_id": [1, 2, 2, 3, 4], "age": ["30", "n/a", "n/a", "250", "40"]})
out = clean_users(raw)
assert len(out) == 4, len(out)
assert out["age"].tolist() == [30.0, 35.0, 35.0, 40.0], out["age"].tolist()
assert out["age_missing"].tolist() == [False, True, True, False]
assert raw["age"].tolist() == ["30", "n/a", "n/a", "250", "40"], "do not change the input"
bad = pd.DataFrame({"user_id": [1, 1], "age": ["30", "31"]})
try:
    clean_users(bad)
except AssertionError:
    pass
else:
    raise AssertionError("duplicate ids must fail")`,
};
