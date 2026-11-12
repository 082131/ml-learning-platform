// Code for "Missing values, duplicates and types". Runnable examples were run with CPython 3.13 and pandas
// 3.0 and their output copied; content/tracks/python/python-outputs.test.ts re-runs them. The imputation
// explorer was recorded by src/lib/pycourse/fixtures/impute.py.
import { span } from '@/lib/foundations/annotate';
import { recordedExperiment, recordedSlots, type RecordedFixture } from '@/lib/pycourse/recorded';
import fixture from '@/lib/pycourse/fixtures/impute.json';
import type { CodeExample } from '@/lib/types';

const impute = fixture as RecordedFixture;
const SRC = impute.template;

export const experiment = recordedExperiment('py-impute', impute, 'Missing income');

export const imputeCode: CodeExample = {
  id: 'py-impute-code',
  language: 'python',
  source: SRC,
  slots: recordedSlots(impute),
  annotations: [
    {
      id: 'dedupe',
      ...span(SRC, 8, 'raw.drop_duplicates()'),
      kind: 'function',
      title: 'Remove exact duplicates first',
      what: 'Drops rows identical in every column, keeping the first. The second id-2 row goes.',
      why: 'Duplicates would otherwise count twice in every statistic, including the median used to fill gaps.',
    },
    {
      id: 'coerce',
      ...span(SRC, 9, 'pd.to_numeric(df["age"], errors="coerce")'),
      kind: 'function',
      title: 'Text to numbers, failures to NaN',
      what: 'Parses each age; anything that is not a number ("n/a", "") becomes NaN instead of raising.',
      why: 'Count the NaN before and after: the difference is how many values failed to parse.',
    },
    {
      id: 'between',
      ...span(SRC, 10, 'df["age"].where(df["age"].between(0, 120))'),
      kind: 'function',
      title: 'Impossible values to missing',
      what: 'where keeps values for which the condition is True and puts NaN elsewhere. 230 is not a possible age.',
      why: 'A typo is missing information, not a real value; treating it as missing lets one policy handle both.',
    },
    {
      id: 'strategy',
      ...span(SRC, 11, '{{strategy}}'),
      kind: 'syntax',
      title: 'The missing-value policy',
      what: 'Drop the rows, fill with a constant or a statistic, or fill and keep a True/False flag.',
      why: 'Each choice changes row counts and statistics differently; the explorer shows by how much.',
      inputs: 'the policy chosen above',
    },
  ],
};

/** A first audit of a messy CSV: shape, dtypes, missing values, duplicates, parse failures. */
export const auditRunner: CodeExample = {
  id: 'py-cleaning-audit',
  language: 'python',
  run: 'pyodide',
  source: `import io
import pandas as pd

csv = """user_id,signup,plan,monthly_fee,country
101,2026-01-04,pro,29.0,NO
102,2026-01-09,free,0,no
102,2026-01-09,free,0,no
103,2026-02-30,Pro,29.0,SE
104,2026-02-11,pro,,DE
105,2026-02-14,team,"1,250.00",DE
106,,free,0,
107,2026-03-01,pro,-29.0,SE
"""
df = pd.read_csv(io.StringIO(csv))
print(df.shape)
print(df.dtypes.astype(str).to_dict())
print(df.isna().sum().to_dict())
print("exact duplicates:", df.duplicated().sum(), "| duplicate ids:", df["user_id"].duplicated().sum())

fee = pd.to_numeric(df["monthly_fee"].str.replace(",", ""), errors="coerce")
print(fee.tolist())
signup = pd.to_datetime(df["signup"], errors="coerce", format="%Y-%m-%d")
print(signup.isna().sum(), df.loc[signup.isna() & df["signup"].notna(), "signup"].tolist())
print(df["plan"].str.lower().value_counts().to_dict())
print((fee < 0).sum(), "negative fee(s)")`,
  annotations: [],
  expectedOutput: `(8, 5)
{'user_id': 'int64', 'signup': 'str', 'plan': 'str', 'monthly_fee': 'str', 'country': 'str'}
{'user_id': 0, 'signup': 1, 'plan': 0, 'monthly_fee': 1, 'country': 1}
exact duplicates: 1 | duplicate ids: 1
[29.0, 0.0, 0.0, 29.0, nan, 1250.0, 0.0, -29.0]
2 ['2026-02-30']
{'pro': 4, 'free': 3, 'team': 1}
1 negative fee(s)`,
};

/** Keeping the latest record per key, and validating with assertions. */
export const dedupeRunner: CodeExample = {
  id: 'py-cleaning-dedupe',
  language: 'python',
  run: 'pyodide',
  source: `import pandas as pd

updates = pd.DataFrame({
    "user_id": [7, 8, 7, 9, 8],
    "updated": pd.to_datetime(["2026-01-01", "2026-01-02", "2026-01-05", "2026-01-03", "2026-01-01"]),
    "email": ["a@x.io", "b@x.io", "a@new.io", "c@x.io", "b@old.io"],
})
latest = (updates.sort_values("updated")
                 .drop_duplicates(subset="user_id", keep="last")
                 .sort_values("user_id"))
print(latest.to_string(index=False))

def check(df):
    assert df["user_id"].is_unique, "duplicate user_id"
    assert df["email"].str.contains("@").all(), "bad email"
    return df

check(latest)
try:
    check(updates)
except AssertionError as e:
    print("AssertionError:", e)`,
  annotations: [],
  expectedOutput: ` user_id    updated    email
       7 2026-01-05 a@new.io
       8 2026-01-02   b@x.io
       9 2026-01-03   c@x.io
AssertionError: duplicate user_id`,
};
