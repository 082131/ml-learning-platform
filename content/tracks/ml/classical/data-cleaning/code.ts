// Code for the data-cleaning lesson. Expected outputs and error messages come from real runs with
// CPython 3.13, NumPy 2.4.6, pandas 3.0.2 (the versions Pyodide 314.0.7 ships). The pandas examples
// were not run inside Pyodide here (jsDelivr is unreachable from the build container); the pure-Python
// IQR loop was. src/lib/classical/cleaning.test.ts checks every experiment state against pandas output.
import {
  cleaningCsv,
  cleaningExperiment,
  cleaningSlots,
  IQR_LOOP_SOURCE,
  pyFloatList,
  type CleaningExperimentResult,
  type CleaningState,
} from '@/lib/classical/cleaning';
import type { CodeExample } from '@/lib/types';

const LOOP_ID = 'cleaning-iqr-loop';

/** One state for the lesson: the table, the strip plot, the pandas code, the IQR loop and the readout. */
export const experiment = cleaningExperiment('data-cleaning', LOOP_ID);

const st = (s: unknown) => s as CleaningState;

/** The 14 real rows of penguins.csv used in the lesson (file row numbers in `row`, `year` left out). */
export const SUBSET_CSV = cleaningCsv();

/** Load the subset and look for missing values. Needs pandas, so the output shown is from a local run. */
export const loadRunner: CodeExample = {
  id: 'cleaning-load',
  language: 'python',
  run: 'pyodide',
  source: `import io
import pandas as pd

# 14 real rows of penguins.csv; "row" is the row number in the file
CSV = """${SUBSET_CSV}"""
df = pd.read_csv(io.StringIO(CSV), index_col="row")
print(df.shape)
print(df.isna().sum())
print(df.index[df.isna().any(axis=1)].tolist())
print(df["sex"].dtype)`,
  annotations: [],
  expectedOutput: `(14, 7)
species              0
island               0
bill_length_mm       2
bill_depth_mm        2
flipper_length_mm    2
body_mass_g          2
sex                  5
dtype: int64
[3, 8, 9, 268, 271]
str`,
};

/** The cleaning pipeline, filled from the experiment's state. */
export const cleaningCode: CodeExample = {
  id: 'cleaning-pandas',
  language: 'python',
  source: `import io
import pandas as pd

df = pd.read_csv(io.StringIO(CSV), index_col="row")  # CSV: the 14 rows in the table
num_cols = ["bill_length_mm", "bill_depth_mm", "flipper_length_mm", "body_mass_g"]
{{typo}}
clean = {{numeric}}
clean = {{sex}}
mass = clean["body_mass_g"]
print("rows:", len(df), "->", len(clean))
print("mean:", mass.mean(), "median:", mass.median(), "std:", round(mass.std(), 1))
q1, q3 = mass.quantile([0.25, 0.75])
iqr = q3 - q1
low, high = q1 - 1.5 * iqr, q3 + 1.5 * iqr
print("fences:", low, high)
print("outliers:", mass[(mass < low) | (mass > high)].index.tolist())`,
  slots: {
    typo: (s) => cleaningSlots(st(s)).typo,
    numeric: (s) => cleaningSlots(st(s)).numeric,
    sex: (s) => cleaningSlots(st(s)).sex,
  },
  annotations: [
    {
      id: 'read-csv',
      range: { line: 4, startCol: 5, endCol: 16 },
      match: 'pd.read_csv',
      kind: 'framework',
      title: 'pd.read_csv(...)',
      what: 'Reads CSV text into a DataFrame. The text NA becomes a missing value (NaN).',
      why: 'pandas treats NA, empty cells and a few other spellings as missing by default, so the two all-NA rows arrive as NaN.',
      output: 'df: 14 rows × 7 columns',
    },
    {
      id: 'index-col',
      range: { line: 4, startCol: 35, endCol: 50 },
      match: 'index_col="row"',
      kind: 'parameter',
      title: 'index_col="row"',
      what: 'Uses the row column as the index, so each row keeps its row number from penguins.csv.',
      why: 'After dropping rows the index has gaps (3 and 271 are gone), which shows exactly which rows left.',
    },
    {
      id: 'typo',
      range: { line: 6 },
      kind: 'syntax',
      title: 'The injected typo',
      what: 'When the typo is on, sets row 0’s body mass to 37500.0: someone typed one zero too many.',
      why: 'It is not in the real data. It lets you see how one bad value moves the mean, the standard deviation and the fences.',
    },
    {
      id: 'numeric',
      range: { line: 7, startCol: 8, endCol: 19 },
      match: '{{numeric}}',
      kind: 'framework',
      title: 'Missing measurements',
      what: 'dropna(subset=num_cols) removes rows with a missing measurement. fillna(df[num_cols].median()) or .mean() fills each column with its own median or mean.',
      why: 'fillna with a Series fills column by column, matching the Series labels to column names. sex is not in the Series, so it stays missing here.',
      output: 'A new DataFrame; df itself is unchanged',
    },
    {
      id: 'sex',
      range: { line: 8, startCol: 8, endCol: 15 },
      match: '{{sex}}',
      kind: 'framework',
      title: 'Missing sex',
      what: 'Drops rows with no sex, or fills them with a new category "unknown".',
      why: 'sex is categorical text: it has no mean or median. A new category keeps the rows and records that the value was missing.',
    },
    {
      id: 'mass',
      range: { line: 9, startCol: 7, endCol: 27 },
      match: 'clean["body_mass_g"]',
      kind: 'variable',
      title: 'clean["body_mass_g"]',
      what: 'One column of the cleaned DataFrame, as a Series.',
      why: 'The statistics and the outlier rule below look at body mass only.',
    },
    {
      id: 'mean',
      range: { line: 11, startCol: 15, endCol: 26 },
      match: 'mass.mean()',
      kind: 'framework',
      title: 'mass.mean()',
      what: 'The sum of the values divided by their count.',
      why: 'Every value pulls on the mean in proportion to its size, so one 37500 moves it a lot.',
    },
    {
      id: 'median',
      range: { line: 11, startCol: 39, endCol: 52 },
      match: 'mass.median()',
      kind: 'framework',
      title: 'mass.median()',
      what: 'The middle value after sorting (the mean of the two middle values for an even count).',
      why: 'It depends on the order of the values, not their size, so a typo moves it at most one position.',
    },
    {
      id: 'std',
      range: { line: 11, startCol: 68, endCol: 78 },
      match: 'mass.std()',
      kind: 'framework',
      title: 'mass.std()',
      what: 'The sample standard deviation: how far values typically are from the mean. pandas divides by n − 1 (ddof=1).',
      why: 'Filling with the mean adds values with zero distance from the mean, so the spread shrinks.',
    },
    {
      id: 'quantile',
      range: { line: 12, startCol: 9, endCol: 36 },
      match: 'mass.quantile([0.25, 0.75])',
      kind: 'framework',
      title: 'mass.quantile([0.25, 0.75])',
      what: 'The first and third quartiles, with linear interpolation between sorted values (pandas’ default).',
      why: 'The step-through below computes the same two numbers by hand.',
      output: 'A Series of two values, unpacked into q1 and q3',
    },
    {
      id: 'fences',
      range: { line: 14, startCol: 17, endCol: 26 },
      match: '1.5 * iqr',
      kind: 'math',
      title: '1.5 · IQR',
      what: 'Tukey’s rule: anything more than 1.5 IQRs below Q1 or above Q3 is flagged.',
      why: 'The factor 1.5 is a convention, not a law. It flags candidates for a human to check.',
    },
    {
      id: 'mask',
      range: { line: 16, startCol: 19, endCol: 53 },
      match: 'mass[(mass < low) | (mass > high)]',
      kind: 'syntax',
      title: 'Boolean mask',
      what: 'Keeps the values below low or above high. | is “or” for Series; each comparison needs its parentheses.',
      why: '.index.tolist() then lists the row numbers of the flagged penguins.',
    },
  ],
};

/** The 1.5·IQR rule in plain Python, stepped through with the experiment's cleaned masses. */
export const iqrLoop: CodeExample = {
  id: LOOP_ID,
  language: 'python',
  source: IQR_LOOP_SOURCE,
  slots: {
    masses: (s) => pyFloatList((experiment.compute(st(s)) as CleaningExperimentResult).masses),
  },
  annotations: [
    {
      id: 'sorted',
      range: { line: 2, startCol: 4, endCol: 18 },
      match: 'sorted(masses)',
      kind: 'function',
      title: 'sorted(masses)',
      what: 'A new list with the same values in increasing order.',
      why: 'Quartiles are positions in the sorted data.',
    },
    {
      id: 'pos',
      range: { line: 3 },
      kind: 'math',
      title: 'Position of the first quartile',
      what: '(n − 1) · 0.25 is the position, counting from 0, a quarter of the way through the sorted list.',
      why: 'It is usually between two positions, so the next line interpolates.',
    },
    {
      id: 'interp',
      range: { line: 5 },
      kind: 'math',
      title: 'Linear interpolation',
      what: 'Starts at the value at the whole part of the position and moves the fractional part of the way to the next value.',
      why: 'This is the default method of np.quantile and pandas’ quantile, so q1 matches mass.quantile(0.25).',
    },
    {
      id: 'test',
      range: { line: 11, startCol: 7, endCol: 26 },
      match: 'm < low or m > high',
      kind: 'syntax',
      title: 'Outside the fences?',
      what: 'True when m is below the low fence or above the high one.',
      why: 'Values exactly on a fence are not flagged.',
    },
  ],
};

/** The same loop as a runnable script, with the typo injected so it flags something. Pure Python. */
export const iqrRunner: CodeExample = {
  id: 'cleaning-iqr-runner',
  language: 'python',
  run: 'pyodide',
  source: IQR_LOOP_SOURCE.replace(
    '{{masses}}',
    '[37500.0, 3800.0, 3250.0, 3450.0, 4500.0, 5850.0, 5750.0, 3300.0, 4150.0]',
  ),
  annotations: [],
  expectedOutput: `outlier: 37500.0
fences: 0.0 9200.0`,
};

/** One-hot encoding with pd.get_dummies. */
export const oneHot: CodeExample = {
  id: 'cleaning-onehot',
  language: 'python',
  source: `import pandas as pd

# Rows 0, 152 and 300 of penguins.csv, categorical columns only
df = pd.DataFrame(
    {"species": ["Adelie", "Gentoo", "Chinstrap"], "island": ["Torgersen", "Biscoe", "Dream"]},
    index=[0, 152, 300],
)
onehot = pd.get_dummies(df, columns=["species"], dtype=int)
print(onehot)
print(onehot.shape)`,
  annotations: [
    {
      id: 'dummies',
      range: { line: 8, startCol: 9, endCol: 23 },
      match: 'pd.get_dummies',
      kind: 'framework',
      title: 'pd.get_dummies(...)',
      what: 'Replaces each listed column with one column per category, named column_category.',
      why: 'Models need numbers. Separate 0/1 columns say “is it this species?” without implying an order.',
      output: 'island is kept; species becomes species_Adelie, species_Chinstrap, species_Gentoo',
    },
    {
      id: 'columns',
      range: { line: 8, startCol: 28, endCol: 47 },
      match: 'columns=["species"]',
      kind: 'parameter',
      title: 'columns=[...]',
      what: 'Which columns to encode. Without it, every text column is encoded.',
      why: 'Here island stays as text, to show the difference.',
    },
    {
      id: 'dtype',
      range: { line: 8, startCol: 49, endCol: 58 },
      match: 'dtype=int',
      kind: 'parameter',
      title: 'dtype=int',
      what: 'Writes 0 and 1 instead of False and True.',
      why: 'get_dummies returns bool columns by default (pandas 2.0 and later), which some older tutorials don’t show.',
    },
  ],
  expectedOutput: `        island  species_Adelie  species_Chinstrap  species_Gentoo
0    Torgersen               1                  0               0
152     Biscoe               0                  0               1
300      Dream               0                  1               0
(3, 4)`,
};
