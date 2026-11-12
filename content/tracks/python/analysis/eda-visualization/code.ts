// Code for "Exploratory analysis and choosing charts". Runnable examples were run with CPython 3.13, NumPy 2.5,
// pandas 3.0 and Matplotlib 3.10.8 and their output copied; content/tracks/python/python-outputs.test.ts re-runs
// them. The shape explorer (statistics and np.histogram counts) was recorded by
// src/lib/pycourse/fixtures/shapes.py.
import { span } from '@/lib/foundations/annotate';
import { recordedExperiment, recordedSlots, type RecordedFixture } from '@/lib/pycourse/recorded';
import fixture from '@/lib/pycourse/fixtures/shapes.json';
import type { CodeExample } from '@/lib/types';

const shapes = fixture as RecordedFixture;
const SRC = shapes.template;

export const experiment = recordedExperiment('py-shapes', shapes, 'Shape of the data');

export const shapesCode: CodeExample = {
  id: 'py-shapes-code',
  language: 'python',
  source: SRC,
  slots: recordedSlots(shapes),
  annotations: [
    {
      id: 'rng',
      ...span(SRC, 3, 'np.random.default_rng(0)'),
      kind: 'function',
      title: 'A seeded generator',
      what: 'Every run draws exactly the same 500 values.',
      why: 'So the numbers in this lesson can be checked, and you get them too.',
    },
    {
      id: 'dist',
      ...span(SRC, 4, '{{dist}}'),
      kind: 'function',
      title: 'The distribution',
      what: 'normal: symmetric bell. lognormal: a long right tail, like incomes or durations. append(…, 400): one extreme value. concatenate: two groups. uniform: flat.',
      why: 'The same summary statistics mean different things for each shape.',
      inputs: 'the shape chosen above',
    },
    {
      id: 'pct',
      ...span(SRC, 5, 'np.percentile(values, [25, 75])'),
      kind: 'function',
      title: 'Quartiles',
      what: 'The 25th and 75th percentiles; their difference is the IQR, the width of the middle half of the data.',
      why: 'Like the median, they ignore the extremes.',
    },
    {
      id: 'ddof',
      ...span(SRC, 7, 'ddof=1'),
      kind: 'parameter',
      title: 'Sample standard deviation',
      what: 'Divides by n − 1 instead of n, as pandas’ std() does by default.',
      why: 'NumPy’s std defaults to ddof=0; set it explicitly so NumPy and pandas agree.',
    },
  ],
};

/** describe, a grouped median, a correlation matrix, and three charts for three questions. */
export const edaRunner: CodeExample = {
  id: 'py-eda-charts',
  language: 'python',
  run: 'pyodide',
  source: `import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

rng = np.random.default_rng(3)
n = 300
plan = rng.choice(["free", "pro"], size=n, p=[0.7, 0.3])
sessions = rng.poisson(np.where(plan == "pro", 12, 6))
minutes = np.round(sessions * rng.lognormal(1.5, 0.4, size=n), 1)
df = pd.DataFrame({"plan": plan, "sessions": sessions, "minutes": minutes})

print(df.describe().round(1).loc[["mean", "50%", "std", "max"]])
print(df.groupby("plan")["minutes"].median())
print(df[["sessions", "minutes"]].corr().round(2))

fig, axes = plt.subplots(1, 3, figsize=(11, 3.2))
axes[0].hist(df["minutes"], bins=30)
axes[0].axvline(df["minutes"].mean(), linestyle="--", label="mean")
axes[0].axvline(df["minutes"].median(), label="median")
axes[0].set(title="Distribution", xlabel="minutes per month")
axes[0].legend()
df.boxplot(column="minutes", by="plan", ax=axes[1])
axes[1].set(title="Comparison", xlabel="plan", ylabel="minutes")
axes[2].scatter(df["sessions"], df["minutes"], s=8, alpha=0.5)
axes[2].set(title="Relationship", xlabel="sessions", ylabel="minutes")
fig.suptitle("")
fig.tight_layout()`,
  annotations: [],
  expectedOutput: `      sessions  minutes
mean       7.4     35.9
50%        7.0     30.4
std        3.9     22.4
max       22.0    162.4
plan
free    24.8
pro     51.9
Name: minutes, dtype: float64
          sessions  minutes
sessions      1.00     0.71
minutes       0.71     1.00`,
};

/** What correlation misses: a curve with r = 0, and an r made by one point. */
export const corrRunner: CodeExample = {
  id: 'py-eda-correlation',
  language: 'python',
  run: 'pyodide',
  source: `import numpy as np
import pandas as pd

x = np.arange(-5, 6)
curve = x ** 2                                   # perfectly determined by x
print(abs(round(np.corrcoef(x, curve)[0, 1], 3)))  # yet the correlation is 0

a = pd.Series([1, 2, 3, 4, 5, 6, 7, 8, 9, 30])
b = pd.Series([5, 3, 6, 2, 7, 4, 6, 3, 5, 40])
print(round(a.corr(b), 2), round(a[:-1].corr(b[:-1]), 2))   # one point makes r
print(round(a.rank().corr(b.rank()), 2))                   # Spearman: correlation of ranks`,
  annotations: [],
  expectedOutput: `0.0
0.94 0.05
0.31`,
};
