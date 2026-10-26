// Code for "Project: analyze a small dataset end to end". The starter's output was produced by running it with
// CPython 3.13 + pandas 3.0 and with Pyodide 314.0.7 (pandas 3.0); both print the same. In tests, open_url
// reads the bundled file instead of downloading it (see ../testSetup.ts).
import { PENGUINS_URL } from '@/lib/foundations/penguinsUrl';
import type { CodeExample, ProjectBrief } from '@/lib/types';

export const brief: ProjectBrief = {
  goal: 'Load a real dataset, clean it, and answer three questions about it with numbers and plots, in a short write-up that includes the code that produced every number.',
  dataset:
    'The Palmer penguins table used in this chapter: 344 penguins, 3 species, 8 columns, 15 KB. On your computer, download penguins.csv from the palmerpenguins repository on GitHub (allisonhorst/palmerpenguins, folder inst/extdata), which is CC0 1.0, public domain; cite Horst, Hill and Gorman 2020, and Gorman, Williams and Fraser 2014. In the browser, the starter below loads the copy bundled with this site.',
  milestones: [
    'Load the CSV and report its shape, the type of each column and the missing values per column',
    'Clean it: drop the rows you cannot use for each question, and say how many rows each question uses',
    'Question 1: which species is heaviest on average, and by how many grams? Answer with a groupby and a bar chart',
    'Question 2: how are flipper length and body mass related? Answer with a labeled scatter plot, one marker per species, and the correlation',
    'Question 3: within each species, how much heavier are males than females? Answer with a table of means by species and sex',
    'Write up the three answers in a few sentences each, with the code and the plots beside them',
  ],
  rubric: [
    {
      criterion: 'Numbers are reproducible',
      detail:
        'Every number in the write-up is printed by code that is included, and rerunning the code prints the same numbers.',
    },
    {
      criterion: 'Missing values are handled on purpose',
      detail:
        'The write-up says which rows were dropped for each question and how many, and no summary silently mixes different rows.',
    },
    {
      criterion: 'Plots can be read alone',
      detail:
        'Every plot has axis labels with units and a title; groups are told apart by marker or label as well as color.',
    },
    {
      criterion: 'Claims match the evidence',
      detail:
        'Differences come with the group sizes they are based on, and a correlation is described as an association, not a cause.',
    },
  ],
  hints: [
    'Start with penguins.isna().sum(): body measurements are missing for 2 penguins and sex for 11.',
    'dropna(subset=[...]) drops rows missing a value in the columns you name; plain dropna() drops a row missing anything, including sex.',
    'groupby(["species", "sex"])["body_mass_g"].mean().unstack() puts species in rows and sex in columns.',
    'Series.corr(other) gives the Pearson correlation of two columns; it skips rows where either is missing.',
  ],
};

/** Milestones 1 and 2, runnable in the browser. */
export const starterRunner: CodeExample = {
  id: 'project-starter',
  language: 'python',
  run: 'pyodide',
  source: `from pyodide.http import open_url
import pandas as pd

# In the browser, Python downloads the file from this site.
# On your own computer you would write: pd.read_csv("penguins.csv")
url = "${PENGUINS_URL}"
penguins = pd.read_csv(open_url(url))

# Milestone 1: load and inspect
print(penguins.shape)
print(penguins.dtypes)
print(penguins.isna().sum())

# Milestone 2: clean for the questions about body measurements
measurements = ["bill_length_mm", "bill_depth_mm", "flipper_length_mm", "body_mass_g"]
measured = penguins.dropna(subset=measurements)
print(len(penguins) - len(measured), "rows dropped, leaving", len(measured))
print(len(penguins.dropna()), "rows would be left by dropna() with no subset")`,
  annotations: [],
  expectedOutput: `(344, 8)
species                  str
island                   str
bill_length_mm       float64
bill_depth_mm        float64
flipper_length_mm    float64
body_mass_g          float64
sex                      str
year                   int64
dtype: object
species               0
island                0
bill_length_mm        2
bill_depth_mm         2
flipper_length_mm     2
body_mass_g           2
sex                  11
year                  0
dtype: int64
2 rows dropped, leaving 342
333 rows would be left by dropna() with no subset`,
};
