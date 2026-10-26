import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'dropna-scope',
    type: 'choice',
    prompt:
      'For question 2 (flipper length vs body mass), why use `dropna(subset=["flipper_length_mm", "body_mass_g"])` rather than `dropna()`?',
    options: [
      {
        text: 'dropna() would also drop the 9 penguins that are measured but have no recorded sex, which question 2 does not need',
        correct: true,
        explain:
          'Drop only what the question needs: 342 rows have both measurements, but only 333 have every column.',
      },
      {
        text: 'dropna() is slower',
        correct: false,
        explain: 'Speed is not the issue on 344 rows. The difference is which rows are thrown away.',
      },
      {
        text: 'There is no difference',
        correct: false,
        explain: 'dropna() with no subset drops a row if any column is missing, including sex.',
      },
    ],
  },
  {
    id: 'correlation',
    type: 'choice',
    prompt:
      'Flipper length and body mass have a correlation of about 0.87. Which sentence belongs in the write-up?',
    options: [
      {
        text: 'Penguins with longer flippers tend to be heavier (correlation 0.87, 342 penguins)',
        correct: true,
        explain: 'It states the association, its strength and how many rows it is based on.',
      },
      {
        text: 'Longer flippers make penguins heavier',
        correct: false,
        explain:
          'A correlation shows that two things vary together, not that one causes the other. Larger penguins simply have both.',
      },
      {
        text: '87% of penguins have long flippers',
        correct: false,
        explain:
          'A correlation is not a percentage of rows; it measures how closely the points follow a straight line.',
      },
    ],
  },
  {
    id: 'group-sizes',
    type: 'choice',
    prompt: 'Why report the number of penguins in each group next to each average?',
    options: [
      {
        text: 'An average of a few values can move a lot by chance, so readers need the size to judge it',
        correct: true,
        explain:
          'Chinstraps are 68 of 344 penguins. A difference between small groups deserves more caution.',
      },
      {
        text: 'Because pandas requires it',
        correct: false,
        explain:
          'pandas computes means without counts; reporting counts is a choice you make for the reader.',
      },
      {
        text: 'To make the table bigger',
        correct: false,
        explain: 'The count is part of the evidence, not decoration.',
      },
    ],
  },
];

export const cleanExercise: Exercise = {
  id: 'clean-penguins',
  prompt:
    'Write `clean_penguins(df)` that returns the rows where all four measurement columns have a value. Rows missing only `sex` must stay.',
  starter: `import pandas as pd

MEASUREMENTS = ["bill_length_mm", "bill_depth_mm", "flipper_length_mm", "body_mass_g"]

def clean_penguins(df):
    return df.dropna()`,
  hints: [
    'Plain `dropna()` also drops rows that are only missing `sex`.',
    '`dropna(subset=MEASUREMENTS)` only looks at the columns you name.',
    '`return df.dropna(subset=MEASUREMENTS)`',
  ],
  solution: `import pandas as pd

MEASUREMENTS = ["bill_length_mm", "bill_depth_mm", "flipper_length_mm", "body_mass_g"]

def clean_penguins(df):
    return df.dropna(subset=MEASUREMENTS)`,
  explanation:
    'On the full table this keeps 342 of 344 rows, while dropna() would keep 333. Dropping only what a question needs keeps as much evidence as possible.',
  tests: `import pandas as pd
nan = float("nan")
df = pd.DataFrame({
    "species": ["Adelie", "Adelie", "Gentoo", "Gentoo"],
    "bill_length_mm": [39.1, nan, 46.1, 50.0],
    "bill_depth_mm": [18.7, nan, 13.2, 16.3],
    "flipper_length_mm": [181.0, nan, 211.0, 230.0],
    "body_mass_g": [3750.0, nan, 4500.0, 5700.0],
    "sex": ["male", nan, nan, "male"],
})
out = clean_penguins(df)
assert len(out) == 3, f"expected 3 rows (only row 1 has no measurements), got {len(out)}"
assert list(out.index) == [0, 2, 3], f"expected rows 0, 2 and 3, got {list(out.index)}"
assert out["sex"].isna().sum() == 1, "row 2 is only missing sex and should be kept"`,
};

export const sexGapExercise: Exercise = {
  id: 'sex-gap',
  prompt:
    'Write `sex_gap(df)` that returns, for each species, the mean `body_mass_g` of males minus the mean of females, as a Series indexed by species.',
  starter: `import pandas as pd

def sex_gap(df):
    means = df.groupby(["species", "sex"])["body_mass_g"].mean().unstack()
    # means has one row per species and the columns "female" and "male".
    return means`,
  hints: [
    '`means["male"]` is the column of male averages, one per species.',
    'Subtracting two Series lines them up by species.',
    '`return means["male"] - means["female"]`',
  ],
  solution: `import pandas as pd

def sex_gap(df):
    means = df.groupby(["species", "sex"])["body_mass_g"].mean().unstack()
    return means["male"] - means["female"]`,
  explanation:
    'On the full table the gaps are about 675 g for Adelie, 412 g for Chinstrap and 805 g for Gentoo. groupby leaves out the penguins with no recorded sex.',
  tests: `import pandas as pd
df = pd.DataFrame({
    "species": ["A", "A", "A", "B", "B", "B"],
    "sex": ["male", "female", "female", "male", "female", None],
    "body_mass_g": [4000.0, 3000.0, 3400.0, 5000.0, 4700.0, 9999.0],
})
gap = sex_gap(df)
assert isinstance(gap, pd.Series), f"expected a Series, got {type(gap).__name__}"
assert abs(gap["A"] - 800.0) < 1e-9, f"A: 4000 - mean(3000, 3400) = 800, got {gap['A']}"
assert abs(gap["B"] - 300.0) < 1e-9, f"B: 5000 - 4700 = 300 (the row with no sex is left out), got {gap['B']}"`,
};
