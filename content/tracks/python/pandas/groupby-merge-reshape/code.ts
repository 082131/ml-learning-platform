// Code for "groupby, merge and reshape". Runnable examples were run with CPython 3.13 and pandas 3.0 and
// their output copied; content/tracks/python/python-outputs.test.ts re-runs them. The groupby explorer was
// recorded by src/lib/pycourse/fixtures/groupby.py.
import { span } from '@/lib/foundations/annotate';
import { recordedExperiment, recordedSlots, type RecordedFixture } from '@/lib/pycourse/recorded';
import fixture from '@/lib/pycourse/fixtures/groupby.json';
import type { CodeExample } from '@/lib/types';

const groupby = fixture as RecordedFixture;
const SRC = groupby.template;

export const experiment = recordedExperiment('py-groupby', groupby, 'Key and operation');

export const groupbyCode: CodeExample = {
  id: 'py-groupby-code',
  language: 'python',
  source: SRC,
  slots: recordedSlots(groupby),
  annotations: [
    {
      id: 'key',
      ...span(SRC, 8, 'groupby("{{key}}")'),
      kind: 'function',
      title: 'Split',
      what: 'Splits the rows into one group per distinct value of the key column. Groups come out sorted by key.',
      why: 'Every later step runs once per group.',
      inputs: 'the key chosen above',
    },
    {
      id: 'col',
      ...span(SRC, 8, '["amount"]'),
      kind: 'syntax',
      title: 'The column to work on',
      what: 'Picks the amount column inside each group.',
      why: 'Without it, the operation runs on every other column too.',
    },
    {
      id: 'op',
      ...span(SRC, 8, '{{op}}'),
      kind: 'function',
      title: 'Apply and combine',
      what: 'An aggregation (sum, mean, size, agg) returns one row per group. transform and cumsum return one value per original row, in the original order.',
      why: 'Use an aggregation for a summary table and transform to add a group statistic back onto every row.',
      inputs: 'the operation chosen above',
    },
  ],
};

/** Join types, validate, indicator and a row explosion caught by validate. */
export const mergeRunner: CodeExample = {
  id: 'py-groupby-merge',
  language: 'python',
  run: 'pyodide',
  source: `import pandas as pd

orders = pd.DataFrame({"order_id": [1, 2, 3, 4], "user_id": [10, 11, 10, 99], "amount": [30, 15, 45, 20]})
users = pd.DataFrame({"user_id": [10, 11, 12], "plan": ["pro", "free", "pro"]})

inner = orders.merge(users, on="user_id", how="inner")
print(len(inner), inner["order_id"].tolist())

left = orders.merge(users, on="user_id", how="left", validate="many_to_one", indicator=True)
print(left[["order_id", "plan", "_merge"]])

dup_users = pd.concat([users, pd.DataFrame({"user_id": [10], "plan": ["team"]})])
exploded = orders.merge(dup_users, on="user_id")
print(len(orders), "->", len(exploded))
try:
    orders.merge(dup_users, on="user_id", validate="many_to_one")
except pd.errors.MergeError as e:
    print("MergeError:", str(e).splitlines()[0])`,
  annotations: [],
  expectedOutput: `3 [1, 2, 3]
   order_id  plan     _merge
0         1   pro       both
1         2  free       both
2         3   pro       both
3         4   NaN  left_only
4 -> 5
MergeError: Merge keys are not unique in right dataset; not a many-to-one merge`,
};

/** pivot_table, melt, named aggregation and a per-group share with transform. */
export const reshapeRunner: CodeExample = {
  id: 'py-groupby-reshape',
  language: 'python',
  run: 'pyodide',
  source: `import pandas as pd

long = pd.DataFrame({
    "store": ["A", "A", "B", "B", "B"],
    "month": ["jan", "feb", "jan", "feb", "feb"],
    "sales": [10, 12, 7, 5, 4],
})
wide = long.pivot_table(index="store", columns="month", values="sales", aggfunc="sum", fill_value=0)
print(wide)

back = wide.reset_index().melt(id_vars="store", var_name="month", value_name="sales")
print(back.sort_values(["store", "month"]).to_string(index=False))

summary = long.groupby("store").agg(total=("sales", "sum"), months=("month", "nunique"))
print(summary)

long["share"] = long["sales"] / long.groupby("store")["sales"].transform("sum")
print(long["share"].round(3).tolist())`,
  annotations: [],
  expectedOutput: `month  feb  jan
store          
A       12   10
B        9    7
store month  sales
    A   feb     12
    A   jan     10
    B   feb      9
    B   jan      7
       total  months
store               
A         22       2
B         16       2
[0.455, 0.545, 0.438, 0.312, 0.25]`,
};
