import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'select-two',
    type: 'choice',
    prompt: 'Which line gives a DataFrame with only the `species` and `island` columns?',
    options: [
      {
        text: 'penguins[["species", "island"]]',
        correct: true,
        explain:
          'The outer brackets select; the inner list names the columns. The result is a DataFrame with 2 columns.',
      },
      {
        text: 'penguins["species", "island"]',
        correct: false,
        explain:
          'Without the inner list, pandas looks for one column named ("species", "island") and raises KeyError.',
      },
      {
        text: 'penguins.species.island',
        correct: false,
        explain: 'penguins.species is a Series (one column); it has no attribute named island.',
      },
    ],
  },
  {
    id: 'and',
    type: 'choice',
    prompt: 'How do you keep the rows that are Gentoo **and** on Biscoe?',
    options: [
      {
        text: 'penguins[(penguins["species"] == "Gentoo") & (penguins["island"] == "Biscoe")]',
        correct: true,
        explain:
          '& combines the two masks row by row. The parentheses are needed because & binds more tightly than ==.',
      },
      {
        text: 'penguins[(penguins["species"] == "Gentoo") and (penguins["island"] == "Biscoe")]',
        correct: false,
        explain:
          'Python’s and needs one True or False, but a mask has 344 of them, so pandas raises "The truth value of a Series is ambiguous".',
      },
      {
        text: 'penguins[penguins["species"] == "Gentoo", penguins["island"] == "Biscoe"]',
        correct: false,
        explain: 'A comma does not combine conditions in pandas; use & for "and" and | for "or".',
      },
    ],
  },
  {
    id: 'count-vs-len',
    type: 'choice',
    prompt: '`len(penguins)` is 344 but `penguins["body_mass_g"].count()` is 342. Why?',
    options: [
      {
        text: 'count() skips missing values, and 2 penguins have no body mass',
        correct: true,
        explain:
          'len counts rows. count, mean, min and max all skip NaN; isna().sum() shows 2 missing for body_mass_g.',
      },
      {
        text: '2 rows are duplicates',
        correct: false,
        explain: 'count() does not look for duplicates; df.duplicated() does that.',
      },
      {
        text: 'count() leaves out the header row and the last row',
        correct: false,
        explain: 'The header becomes the column names when the file is read; it is never a row.',
      },
    ],
  },
  {
    id: 'groups',
    type: 'numeric',
    prompt:
      'How many numbers does `penguins.groupby("island")["bill_length_mm"].mean()` contain? (Each penguin lives on one of Biscoe, Dream or Torgersen.)',
    answer: 3,
    tolerance: 0,
    hint: 'groupby makes one group per distinct value of the column.',
    explain: 'One mean per island: Biscoe, Dream and Torgersen, in sorted order.',
  },
  {
    id: 'pipeline-order',
    type: 'order',
    prompt:
      'Put the steps of "average body mass of each species on Dream island" in the order the code runs them.',
    items: [
      'pd.read_csv("penguins.csv")',
      'keep the rows where island == "Dream"',
      'groupby("species")',
      'select ["body_mass_g"]',
      'mean()',
    ],
    explain:
      'Load, filter, split into groups, pick the column, then reduce each group to one number: penguins[penguins["island"] == "Dream"].groupby("species")["body_mass_g"].mean().',
  },
];

export const heaviestExercise: Exercise = {
  id: 'heaviest-species',
  prompt:
    'Write `heaviest_species(df)` that returns the name of the species with the highest average `body_mass_g`.',
  starter: `import pandas as pd

def heaviest_species(df):
    # Group by species, average body_mass_g, and return the species name with the largest average.
    return None`,
  hints: [
    '`df.groupby("species")["body_mass_g"].mean()` gives one average per species.',
    'A Series has `.idxmax()`, which returns the label (here, the species) of its largest value.',
    '`return df.groupby("species")["body_mass_g"].mean().idxmax()`',
  ],
  solution: `import pandas as pd

def heaviest_species(df):
    return df.groupby("species")["body_mass_g"].mean().idxmax()`,
  explanation:
    'On the full penguins table this returns "Gentoo". idxmax returns the label of the largest value, not the value itself, which would be max().',
  tests: `import pandas as pd
df = pd.DataFrame({
    "species": ["Adelie", "Adelie", "Gentoo", "Gentoo", "Chinstrap"],
    "body_mass_g": [3700.0, 3900.0, 5000.0, None, 3800.0],
})
got = heaviest_species(df)
assert got == "Gentoo", f"expected 'Gentoo', got {got!r}"
df2 = pd.DataFrame({"species": ["A", "B", "B"], "body_mass_g": [10.0, 4.0, 30.0]})
got2 = heaviest_species(df2)
assert got2 == "B", f"B averages 17.0 and A 10.0, so expected 'B', got {got2!r}"`,
};
