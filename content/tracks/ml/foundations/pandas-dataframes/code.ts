// Code for "Pandas DataFrames". Outputs were produced by running the code with CPython 3.13 + pandas 3.0 and
// with Pyodide 314.0.7 (Python 3.14, pandas 3.0); both print the same. In tests, open_url reads the bundled
// file instead of downloading it (testSetup.ts). The explorer's numbers are checked against pandas for every
// combination of controls in src/lib/foundations/penguinTable.test.ts.
import penguinsCsv from '@/lib/classical/data/penguins.csv?url';
import { lineOf, span } from '@/lib/foundations/annotate';
import { filterText, summaryText, tableExperiment, type TableState } from '@/lib/foundations/penguinTable';
import type { CodeExample } from '@/lib/types';

/** One state: the table explorer, the code and the readout read it. */
export const experiment = tableExperiment('penguin-table', {
  species: 'all',
  island: 'all',
  by: 'species',
  column: 'body_mass_g',
  stat: 'mean',
});

/** The address of the bundled CSV on this site, which Python downloads in the browser. */
export const PENGUINS_URL =
  typeof document === 'undefined'
    ? `https://example.invalid/${penguinsCsv}`
    : new URL(penguinsCsv, document.baseURI).href;

const st = (s: unknown) => s as TableState;
const TABLE_SOURCE = `import pandas as pd

penguins = pd.read_csv("penguins.csv")
df = {{filter}}
print(len(df))
print({{summary}})`;

export const tableCode: CodeExample = {
  id: 'table-code',
  language: 'python',
  source: TABLE_SOURCE,
  slots: { filter: (s) => filterText(st(s)), summary: (s) => summaryText(st(s)) },
  annotations: [
    {
      id: 'read',
      ...span(TABLE_SOURCE, 3, 'pd.read_csv("penguins.csv")'),
      kind: 'function',
      title: 'pd.read_csv',
      what: 'Reads a CSV file into a DataFrame: the first line gives the column names, and each later line is a row.',
      why: 'pandas guesses each column’s type and turns the text NA into a missing value (NaN).',
      output: 'a DataFrame of 344 rows and 8 columns',
    },
    {
      id: 'filter',
      ...span(TABLE_SOURCE, 4, '{{filter}}'),
      kind: 'syntax',
      title: 'Filtering rows with a mask',
      what: 'penguins["species"] == "Gentoo" is a True/False value per row; putting it in square brackets keeps the True rows. & combines two conditions, and each needs its own parentheses.',
      why: 'The kept rows keep their original row labels, so you can always trace a row back to the file.',
      inputs: 'species and island from the controls',
    },
    {
      id: 'summary',
      ...span(TABLE_SOURCE, lineOf(TABLE_SOURCE, 'print({{summary}})'), '{{summary}}'),
      kind: 'function',
      title: 'groupby, a column, a statistic',
      what: 'groupby splits the rows by the values of one column, ["…"] picks the column to summarize, and mean(), count(), min() or max() computes one number per group.',
      why: 'Missing values are skipped, and rows whose group key is missing are left out of the groups.',
      output: 'one number, or a Series with one number per group',
    },
  ],
};

/** Loading the real CSV and exploring it, in the browser with Pyodide. */
export const pandasRunner: CodeExample = {
  id: 'pandas-runner',
  language: 'python',
  run: 'pyodide',
  source: `from pyodide.http import open_url
import pandas as pd

# In the browser, Python downloads the file from this site.
# On your own computer you would write: pd.read_csv("penguins.csv")
url = "${PENGUINS_URL}"
penguins = pd.read_csv(open_url(url))
print(penguins.shape)
print(penguins[["species", "island", "body_mass_g"]].head(3))
print(penguins["species"].value_counts())
print(penguins.isna().sum())

heavy = penguins[penguins["body_mass_g"] > 5500]
print(len(heavy), heavy["species"].unique().tolist())

gentoo_biscoe = penguins[(penguins["species"] == "Gentoo") & (penguins["island"] == "Biscoe")]
print(len(gentoo_biscoe))

by_species = penguins.groupby("species")["body_mass_g"].mean()
print(by_species.round(1))

longest = penguins.sort_values("flipper_length_mm", ascending=False, kind="stable")
print(longest[["species", "flipper_length_mm"]].head(3))`,
  annotations: [],
  expectedOutput: `(344, 8)
  species     island  body_mass_g
0  Adelie  Torgersen       3750.0
1  Adelie  Torgersen       3800.0
2  Adelie  Torgersen       3250.0
species
Adelie       152
Gentoo       124
Chinstrap     68
Name: count, dtype: int64
species               0
island                0
bill_length_mm        2
bill_depth_mm         2
flipper_length_mm     2
body_mass_g           2
sex                  11
year                  0
dtype: int64
28 ['Gentoo']
124
species
Adelie       3700.7
Chinstrap    3733.1
Gentoo       5076.0
Name: body_mass_g, dtype: float64
    species  flipper_length_mm
215  Gentoo              231.0
153  Gentoo              230.0
185  Gentoo              230.0`,
};
