// Code for "pandas selection, alignment and dtypes". Runnable examples were run with CPython 3.13 and
// pandas 3.0 and their output copied; content/tracks/python/python-outputs.test.ts re-runs them. The selection
// explorer was recorded by src/lib/pycourse/fixtures/pandas_select.py.
import { span } from '@/lib/foundations/annotate';
import { recordedExperiment, recordedSlots, type RecordedFixture } from '@/lib/pycourse/recorded';
import fixture from '@/lib/pycourse/fixtures/pandas_select.json';
import type { CodeExample } from '@/lib/types';

const select = fixture as RecordedFixture;
const SRC = select.template;

export const experiment = recordedExperiment('py-pandas-select', select, 'Line');

export const selectCode: CodeExample = {
  id: 'py-pandas-select-code',
  language: 'python',
  source: SRC,
  slots: recordedSlots(select),
  annotations: [
    {
      id: 'index',
      ...span(SRC, 5, 'index=[10, 20, 30, 40]'),
      kind: 'parameter',
      title: 'Row labels that are not positions',
      what: 'The rows are labeled 10, 20, 30 and 40, while their positions are 0 to 3.',
      why: 'Real indexes are ids, dates or filtered leftovers, so labels and positions rarely match. This makes the difference visible.',
    },
    {
      id: 'line',
      ...span(SRC, 7, '{{line}}'),
      kind: 'syntax',
      title: 'The selection or assignment',
      what: 'loc selects by label (slices include the end label); iloc by position (slices exclude the end). df.loc[mask, col] = value assigns into df.',
      why: 'Under copy-on-write, anything selected first and assigned second changes only the selection, never df.',
      inputs: 'the line chosen above',
    },
  ],
};

/** Index alignment between Series and when adding a column. */
export const alignRunner: CodeExample = {
  id: 'py-pandas-align',
  language: 'python',
  run: 'pyodide',
  source: `import pandas as pd

sales = pd.Series([100, 250, 80], index=["mon", "tue", "wed"])
returns = pd.Series([5, 20], index=["tue", "mon"])

print(sales - returns)                        # matched by label, not position
print(sales.sub(returns, fill_value=0))       # treat a missing label as 0

prices = pd.DataFrame({"price": [2.0, 3.5]}, index=["apple", "pear"])
qty = pd.Series({"pear": 4, "apple": 10, "plum": 1})
prices["qty"] = qty                           # aligned on the index; plum is dropped
print(prices)
print((prices["price"] * prices["qty"]).sum())`,
  annotations: [],
  expectedOutput: `mon     80.0
tue    245.0
wed      NaN
dtype: float64
mon     80.0
tue    245.0
wed     80.0
dtype: float64
       price  qty
apple    2.0   10
pear     3.5    4
34.0`,
};

/** Choosing dtypes: nullable Int64, string, ordered category, datetime. */
export const dtypesRunner: CodeExample = {
  id: 'py-pandas-dtypes',
  language: 'python',
  run: 'pyodide',
  source: `import pandas as pd

raw = pd.DataFrame({
    "size": ["S", "M", "M", "L", "S"],
    "count": [3, None, 7, 1, 2],
    "name": ["ana", "ben", None, "cy", "di"],
    "day": ["2026-03-01", "2026-03-02", "2026-03-02", "2026-03-05", "2026-03-06"],
})
print(raw.dtypes)

df = raw.astype({"count": "Int64", "name": "string"})
df["size"] = pd.Categorical(raw["size"], categories=["S", "M", "L"], ordered=True)
df["day"] = pd.to_datetime(raw["day"])
print(df.dtypes)

print(df["count"].tolist(), df["count"].sum())
print(df["size"].cat.codes.tolist(), df["size"].max())
print(df.sort_values("size")["size"].tolist())
print(df["day"].dt.day_name().tolist()[:2], (df["day"].max() - df["day"].min()).days)`,
  annotations: [],
  expectedOutput: `size         str
count    float64
name         str
day          str
dtype: object
size           category
count             Int64
name             string
day      datetime64[us]
dtype: object
[3, <NA>, 7, 1, 2] 13
[0, 1, 1, 2, 0] L
['S', 'S', 'M', 'M', 'L']
['Sunday', 'Monday'] 5`,
};
