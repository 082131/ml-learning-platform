import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'loc-slice',
    type: 'choice',
    prompt: 'With row labels 10, 20, 30, 40, how many rows does `df.loc[20:30]` return, and `df.iloc[1:3]`?',
    options: [
      {
        text: '1 and 2',
        correct: false,
        explain: 'loc slices by label and includes the end label, so 20:30 keeps both 20 and 30.',
      },
      {
        text: '2 and 2',
        correct: true,
        explain:
          'loc includes the end label (20 and 30); iloc excludes the end position (positions 1 and 2).',
      },
      {
        text: '2 and 3',
        correct: false,
        explain: 'iloc slices like Python lists: the stop position is excluded.',
      },
      {
        text: '11 and 2',
        correct: false,
        explain: 'loc slices between labels that exist; it does not generate the numbers 20 to 30.',
      },
    ],
  },
  {
    id: 'alignment',
    type: 'choice',
    prompt:
      '`a` has index `[x, y]` and `b` has index `[y, z]`. What is the index of `a + b`, and where is NaN?',
    options: [
      {
        text: '[x, y]; no NaN',
        correct: false,
        explain: 'pandas does not keep only the left side; it takes the union of labels.',
      },
      {
        text: '[y]; no NaN',
        correct: false,
        explain: 'That is an inner join of the labels. Arithmetic uses the union.',
      },
      {
        text: '[x, y, z]; NaN at x and z',
        correct: true,
        explain: 'Labels are matched, the union is kept, and a label missing on one side gives NaN.',
      },
    ],
  },
  {
    id: 'cow',
    type: 'choice',
    prompt: 'In pandas 3, what does `df[df["temp"] > 10]["temp"] = 0` do to `df`?',
    options: [
      {
        text: 'Sets temp to 0 in the hot rows of df',
        correct: false,
        explain: 'That needs a single step: df.loc[df["temp"] > 10, "temp"] = 0.',
      },
      {
        text: 'Nothing; it changes a temporary copy',
        correct: true,
        explain:
          'Under copy-on-write the first selection behaves as a copy, so the assignment never reaches df. pandas warns about it.',
      },
      {
        text: 'Raises KeyError',
        correct: false,
        explain: 'The selection and the column both exist; the problem is silent, not an error.',
      },
      {
        text: 'Sets temp to 0 in every row',
        correct: false,
        explain: 'Nothing here selects all rows, and df is not modified at all.',
      },
    ],
  },
  {
    id: 'int-nan',
    type: 'choice',
    prompt:
      'A column of integers with one missing value is read by pandas. What dtype does it get by default?',
    options: [
      {
        text: 'int64',
        correct: false,
        explain: 'NumPy integers have no missing-value marker, so pandas cannot keep int64.',
      },
      {
        text: 'float64',
        correct: true,
        explain:
          'The missing value becomes NaN, which only floats can hold. Cast to "Int64" to keep integers with <NA>.',
      },
      {
        text: 'object',
        correct: false,
        explain: 'Numbers are not stored as Python objects just because one is missing.',
      },
    ],
  },
  {
    id: 'category',
    type: 'choice',
    prompt: 'Why make a column of sizes "S", "M", "L" an **ordered** categorical?',
    options: [
      {
        text: 'Strings cannot be compared otherwise',
        correct: false,
        explain: 'Strings compare alphabetically, which is exactly the problem: "L" < "M" < "S".',
      },
      {
        text: 'So sorting and max follow S < M < L',
        correct: true,
        explain:
          'The categories’ order replaces the alphabetical order, and each value is stored as a small integer code.',
      },
      {
        text: 'It converts the sizes to numbers for a model',
        correct: false,
        explain:
          'The codes exist, but the column still holds categories; encoding for a model is a separate step.',
      },
    ],
  },
];

export const revenueExercise: Exercise = {
  id: 'py-pandas-revenue',
  prompt:
    'Write add_revenue(df) that returns a copy of df with a revenue column = price × qty, with 0 where qty is missing.',
  starter: `import pandas as pd

def add_revenue(df):
    df["revenue"] = df["price"] * df["qty"]   # changes the caller's df, and NaN stays NaN
    return df`,
  hints: [
    'Start with out = df.copy() so the input is untouched.',
    'df["qty"].fillna(0) replaces missing quantities with 0.',
    'Assign the new column on out, then return out.',
  ],
  solution: `import pandas as pd

def add_revenue(df):
    out = df.copy()
    out["revenue"] = out["price"] * out["qty"].fillna(0)
    return out`,
  explanation:
    'Working on a copy keeps the caller’s DataFrame unchanged, and filling missing quantities before multiplying keeps NaN from spreading into the revenue.',
  tests: `import pandas as pd
df = pd.DataFrame({"price": [2.0, 3.0, 4.0], "qty": [1, None, 5]})
out = add_revenue(df)
assert out["revenue"].tolist() == [2.0, 0.0, 20.0], out["revenue"].tolist()
assert "revenue" not in df.columns, "add_revenue must not change its input"`,
};
