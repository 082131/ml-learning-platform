// Code for "Plotting with Matplotlib". Printed outputs were produced by running the code with CPython 3.13 +
// matplotlib 3.11 and with Pyodide 314.0.7 (Python 3.14, matplotlib 3.10); both print the same. The figures
// are drawn by Matplotlib in the learner's browser when they press Run; the lesson ships no plot images.
// The histogram explorer's counts and edges equal np.histogram (src/lib/foundations/histogram.test.ts),
// which is what ax.hist uses.
import { lineOf, span } from '@/lib/foundations/annotate';
import { UNITS, histExperiment, type HistState } from '@/lib/foundations/histogram';
import { PENGUINS_URL } from '@/lib/foundations/penguinsUrl';
import type { CodeExample } from '@/lib/types';

/** One state: the histogram, the code and the readout read it. */
export const experiment = histExperiment('histogram', { column: 'body_mass_g', bins: 20 });

const st = (s: unknown) => s as HistState;
const HIST_SOURCE = `import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

penguins = pd.read_csv("penguins.csv")
values = penguins["{{column}}"].dropna()
counts, edges = np.histogram(values, bins={{bins}})
print(counts)

fig, ax = plt.subplots()
ax.hist(values, bins={{bins}})
ax.set_xlabel("{{label}}")
ax.set_ylabel("Penguins")`;

export const histCode: CodeExample = {
  id: 'hist-code',
  language: 'python',
  source: HIST_SOURCE,
  slots: {
    column: (s) => st(s).column,
    bins: (s) => String(st(s).bins),
    label: (s) => UNITS[st(s).column],
  },
  annotations: [
    {
      id: 'dropna',
      ...span(HIST_SOURCE, 6, '.dropna()'),
      kind: 'function',
      title: '.dropna()',
      what: 'Removes the missing values (NaN) from the column.',
      why: 'Two penguins have no measurements. np.histogram cannot place NaN in a bin and fails on it.',
    },
    {
      id: 'histogram',
      ...span(HIST_SOURCE, 7, 'np.histogram(values, bins={{bins}})'),
      kind: 'function',
      title: 'np.histogram',
      what: 'Splits the range from the smallest to the largest value into equal-width bins and counts the values in each.',
      why: 'These are exactly the bar heights that ax.hist draws, as numbers you can check.',
      inputs: 'bins from the slider above',
      output: 'counts (one per bin) and edges (one more than bins)',
    },
    {
      id: 'subplots',
      ...span(HIST_SOURCE, lineOf(HIST_SOURCE, 'plt.subplots'), 'fig, ax = plt.subplots()'),
      kind: 'framework',
      title: 'plt.subplots()',
      what: 'Creates a Figure (the whole image) and one Axes (the plot area with its x and y axis).',
      why: 'Drawing on a named ax keeps it clear which plot each call changes, which matters once a figure has several.',
    },
    {
      id: 'hist',
      ...span(HIST_SOURCE, lineOf(HIST_SOURCE, 'ax.hist'), 'ax.hist(values, bins={{bins}})'),
      kind: 'function',
      title: 'ax.hist',
      what: 'Draws one bar per bin, as tall as the number of values in it.',
      why: 'A histogram shows the shape of one column: where values bunch up, how spread out they are, and whether there are several peaks.',
    },
    {
      id: 'labels',
      ...span(HIST_SOURCE, lineOf(HIST_SOURCE, 'set_xlabel'), 'ax.set_xlabel("{{label}}")'),
      kind: 'function',
      title: 'Axis labels',
      what: 'Text under the x axis and beside the y axis.',
      why: 'A plot without labels and units cannot be read on its own.',
    },
  ],
};

/** The labeled scatter plot built up in three steps. */
export const scatterSteps: CodeExample = {
  id: 'scatter-steps',
  language: 'python',
  source: '',
  annotations: [],
  stages: [
    {
      id: 'bare',
      title: 'Points',
      note: 'One call draws every penguin as a point. It shows a trend, but nobody can tell what the axes measure or which penguins are which.',
      source: `fig, ax = plt.subplots()
ax.scatter(penguins["flipper_length_mm"], penguins["body_mass_g"])`,
    },
    {
      id: 'groups',
      title: 'One group per species',
      note: 'Calling scatter once per species gives each its own color, marker and legend label, so the groups do not rely on color alone.',
      source: `fig, ax = plt.subplots()
for species, marker in [("Adelie", "o"), ("Chinstrap", "s"), ("Gentoo", "^")]:
    rows = penguins[penguins["species"] == species]
    ax.scatter(rows["flipper_length_mm"], rows["body_mass_g"], marker=marker, alpha=0.7, label=species)`,
    },
    {
      id: 'labels',
      title: 'Labels, title, legend',
      note: 'Axis labels with units, a title that states the finding, and a legend. Now the plot can be read without the code.',
      source: `fig, ax = plt.subplots()
for species, marker in [("Adelie", "o"), ("Chinstrap", "s"), ("Gentoo", "^")]:
    rows = penguins[penguins["species"] == species]
    ax.scatter(rows["flipper_length_mm"], rows["body_mass_g"], marker=marker, alpha=0.7, label=species)
ax.set_xlabel("Flipper length (mm)")
ax.set_ylabel("Body mass (g)")
ax.set_title("Penguins with longer flippers are heavier")
ax.legend(title="Species")`,
    },
  ],
};

const LOAD = `from pyodide.http import open_url
import matplotlib.pyplot as plt
import pandas as pd

# In the browser, Python downloads the file from this site.
# On your own computer you would write: pd.read_csv("penguins.csv")
url = "${PENGUINS_URL}"
penguins = pd.read_csv(open_url(url))`;

/** A scatter plot and a histogram, drawn by Matplotlib in the browser. */
export const plotsRunner: CodeExample = {
  id: 'plots-runner',
  language: 'python',
  run: 'pyodide',
  source: `${LOAD}
penguins = penguins.dropna(subset=["flipper_length_mm", "body_mass_g"])
print(len(penguins))

fig, ax = plt.subplots(figsize=(6, 4))
for species, marker in [("Adelie", "o"), ("Chinstrap", "s"), ("Gentoo", "^")]:
    rows = penguins[penguins["species"] == species]
    ax.scatter(rows["flipper_length_mm"], rows["body_mass_g"], marker=marker, alpha=0.7, label=species)
ax.set_xlabel("Flipper length (mm)")
ax.set_ylabel("Body mass (g)")
ax.set_title("Penguins with longer flippers are heavier")
ax.legend(title="Species")

fig2, ax2 = plt.subplots(figsize=(6, 3))
counts, edges, bars = ax2.hist(penguins["body_mass_g"], bins=20)
ax2.set_xlabel("Body mass (g)")
ax2.set_ylabel("Penguins")
ax2.set_title("Body mass of 342 penguins")
print(counts.astype(int))
print(edges[0], edges[-1], len(bars))`,
  annotations: [],
  expectedOutput: `342
[ 3 12 13 30 32 39 35 18 25 17 19 22 16 12 10 17 11  5  5  1]
2700.0 6300.0 20`,
};

/** A line plot over time and a bar chart of categories, drawn by Matplotlib in the browser. */
export const trendsRunner: CodeExample = {
  id: 'trends-runner',
  language: 'python',
  run: 'pyodide',
  source: `${LOAD}

means = penguins.groupby(["year", "species"])["body_mass_g"].mean().unstack()
print(means.round(0))

fig, ax = plt.subplots(figsize=(6, 3.5))
for species in means.columns:
    ax.plot(means.index, means[species], marker="o", label=species)
ax.set_xticks(means.index)
ax.set_xlabel("Year")
ax.set_ylabel("Mean body mass (g)")
ax.set_title("Mean body mass per year")
ax.legend()

counts = penguins["island"].value_counts()
print(counts)
fig2, ax2 = plt.subplots(figsize=(5, 3))
ax2.bar(counts.index, counts.values)
ax2.set_ylabel("Penguins")
ax2.set_title("Penguins per island")`,
  annotations: [],
  expectedOutput: `species  Adelie  Chinstrap  Gentoo
year                              
2007     3696.0     3694.0  5071.0
2008     3742.0     3800.0  5020.0
2009     3665.0     3725.0  5141.0
island
Biscoe       168
Dream        124
Torgersen     52
Name: count, dtype: int64`,
};
