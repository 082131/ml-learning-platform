// Code for the EDA lesson. Expected outputs come from real runs with CPython 3.13, NumPy 2.4.6 and
// pandas 3.0.2 (the versions Pyodide 314.0.7 ships). The pandas examples were not run inside Pyodide here
// (jsDelivr is unreachable from the build container); the pure-Python Pearson loop was. The Matplotlib
// snippet is not run in this lesson. src/lib/classical/eda.test.ts checks every experiment state
// against pandas and CPython output.
import { subsetCsv } from '@/lib/classical/cleaning';
import {
  edaExperiment,
  edaSubset,
  PEARSON_LOOP_SOURCE,
  pearsonSlots,
  type EdaState,
} from '@/lib/classical/eda';
import { span } from '@/lib/foundations/annotate';
import type { CodeExample } from '@/lib/types';

const LOOP_ID = 'eda-pearson-loop';

/** One state: the scatter, the pandas code, the hand computation and the readout read it. */
export const experiment = edaExperiment('eda', LOOP_ID);

const st = (s: unknown) => s as EdaState;

/** Every 12th row of penguins.csv as CSV text (row number first, year left out). */
export const EDA_CSV = subsetCsv(edaSubset());

const EDA_SOURCE = `import io
import pandas as pd

# Every 12th row of penguins.csv (rows 0, 12, ..., 336): 29 penguins, none with missing values
CSV = """${EDA_CSV}"""
df = pd.read_csv(io.StringIO(CSV), index_col="row")
num_cols = ["bill_length_mm", "bill_depth_mm", "flipper_length_mm", "body_mass_g"]

print(df[num_cols].describe().round(1))
print(df["species"].value_counts())
print(df.groupby("species")[["bill_length_mm", "bill_depth_mm"]].mean().round(1))
print(df[num_cols].corr().round(2).to_string())
print(round(df["bill_length_mm"].corr(df["bill_depth_mm"]), 3))
for species, g in df.groupby("species"):
    print(species, round(g["bill_length_mm"].corr(g["bill_depth_mm"]), 3))`;

/** Guided EDA on the 29-row subset. Needs pandas, so the output shown is from a local run. */
export const edaRunner: CodeExample = {
  id: 'eda-guided',
  language: 'python',
  run: 'pyodide',
  source: EDA_SOURCE,
  annotations: [],
  expectedOutput: `       bill_length_mm  bill_depth_mm  flipper_length_mm  body_mass_g
count            29.0           29.0               29.0         29.0
mean             42.8           16.7              197.3       3877.6
std               5.0            1.9               12.5        637.7
min              35.7           13.5              180.0       3000.0
25%              38.1           14.5              187.0       3350.0
50%              42.7           17.2              193.0       3750.0
75%              47.5           17.9              210.0       4400.0
max              51.9           20.0              219.0       5400.0
species
Adelie       13
Gentoo       10
Chinstrap     6
Name: count, dtype: int64
           bill_length_mm  bill_depth_mm
species                                 
Adelie               37.9           17.8
Chinstrap            48.5           18.3
Gentoo               45.8           14.3
                   bill_length_mm  bill_depth_mm  flipper_length_mm  body_mass_g
bill_length_mm               1.00          -0.27               0.56         0.55
bill_depth_mm               -0.27           1.00              -0.74        -0.66
flipper_length_mm            0.56          -0.74               1.00         0.85
body_mass_g                  0.55          -0.66               0.85         1.00
-0.268
Adelie 0.2
Chinstrap 0.876
Gentoo 0.383`,
};

const CORR_SOURCE = `import pandas as pd

df = pd.read_csv("penguins.csv")  # the full file: 344 rows
x, y = "{{x}}", "{{y}}"
sub = df.dropna(subset=[x, y])
print("all", len(sub), round(sub[x].corr(sub[y]), 3))
for species, g in sub.groupby("species"):
    print(species, len(g), round(g[x].corr(g[y]), 3))`;

/** Correlation overall and per species on the full dataset, filled from the chosen columns. */
export const corrCode: CodeExample = {
  id: 'eda-corr',
  language: 'python',
  source: CORR_SOURCE,
  slots: { x: (s) => st(s).x, y: (s) => st(s).y },
  annotations: [
    {
      id: 'read',
      ...span(CORR_SOURCE, 3, 'pd.read_csv'),
      kind: 'framework',
      title: 'pd.read_csv("penguins.csv")',
      what: 'Reads the whole penguins file, saved next to your script.',
      why: 'This block runs on your own computer; the browser runner above has no file access, so it used an inline subset.',
    },
    {
      id: 'dropna',
      ...span(CORR_SOURCE, 5, 'df.dropna(subset=[x, y])'),
      kind: 'framework',
      title: 'dropna(subset=[x, y])',
      what: 'Keeps the rows where both chosen columns have a value: 342 of 344.',
      why: 'The correlation pairs each x with its y, so a row missing either is unusable. Series.corr would skip it anyway; dropping first makes len(sub) honest.',
    },
    {
      id: 'corr',
      ...span(CORR_SOURCE, 6, 'sub[x].corr(sub[y])'),
      kind: 'framework',
      title: 'Series.corr',
      what: 'Pearson’s r between two columns, from −1 to 1.',
      why: 'r measures how well a straight line describes the pairs. method="pearson" is the default.',
      output: 'A float; round(..., 3) keeps three decimals',
    },
    {
      id: 'groupby',
      ...span(CORR_SOURCE, 7, 'sub.groupby("species")'),
      kind: 'framework',
      title: 'groupby("species")',
      what: 'Splits the rows into one DataFrame per species. The loop gets (name, rows) pairs, sorted by name.',
      why: 'Computing r inside each group is how you check whether a trend overall also holds within groups.',
    },
  ],
};

/** Pearson's r by hand for the subset's 6 Chinstrap penguins, stepped through with the chosen columns. */
export const pearsonLoop: CodeExample = {
  id: LOOP_ID,
  language: 'python',
  source: PEARSON_LOOP_SOURCE,
  slots: { xs: (s) => pearsonSlots(st(s)).xs, ys: (s) => pearsonSlots(st(s)).ys },
  annotations: [
    {
      id: 'mean',
      ...span(PEARSON_LOOP_SOURCE, 5, 'sum(xs) / len(xs)'),
      kind: 'math',
      title: 'The mean of x',
      what: 'Adds the values and divides by how many there are.',
      why: 'r compares each value with its own column’s mean.',
    },
    {
      id: 'zip',
      ...span(PEARSON_LOOP_SOURCE, 8, 'zip(xs, ys)'),
      kind: 'function',
      title: 'zip(xs, ys)',
      what: 'Walks both lists together, giving one (x, y) pair per penguin.',
      why: 'Each penguin contributes one product to sxy.',
    },
    {
      id: 'sxy',
      ...span(PEARSON_LOOP_SOURCE, 9, '(x - mx) * (y - my)'),
      kind: 'math',
      title: '(x − mx)(y − my)',
      what: 'Positive when the penguin is above (or below) both means, negative when it is above one and below the other.',
      why: 'Their sum says whether x and y tend to move together.',
    },
    {
      id: 'r',
      ...span(PEARSON_LOOP_SOURCE, 12, 'sxy / math.sqrt(sxx * syy)'),
      kind: 'math',
      title: 'r = sxy / √(sxx · syy)',
      what: 'Divides by the spread of each column, so r has no units and stays between −1 and 1.',
      why: 'Without this, r would change when you measure in centimeters instead of millimeters.',
    },
  ],
};

/** The hand computation as a runnable script (bill length vs depth). Pure Python. */
export const pearsonRunner: CodeExample = {
  id: 'eda-pearson-runner',
  language: 'python',
  run: 'pyodide',
  source: PEARSON_LOOP_SOURCE.replace(
    '{{xs}}',
    pearsonSlots({ x: 'bill_length_mm', y: 'bill_depth_mm' }).xs,
  ).replace('{{ys}}', pearsonSlots({ x: 'bill_length_mm', y: 'bill_depth_mm' }).ys),
  annotations: [],
  expectedOutput: '0.876',
};

/** A per-species scatter in Matplotlib. Not run in this lesson; Run in the plotting lesson draws such figures. */
export const plotCode: CodeExample = {
  id: 'eda-plot',
  language: 'python',
  source: `import matplotlib.pyplot as plt

fig, ax = plt.subplots()
for (species, g), marker in zip(df.groupby("species"), ["o", "s", "^"]):
    ax.scatter(g["bill_length_mm"], g["bill_depth_mm"], marker=marker, label=species)
ax.set_xlabel("bill_length_mm")
ax.set_ylabel("bill_depth_mm")
ax.legend()
plt.show()`,
  annotations: [],
};
