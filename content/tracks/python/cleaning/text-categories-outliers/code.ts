// Code for "Text, categories and outliers". Runnable examples were run with CPython 3.13 and pandas 3.0 and
// their output copied; content/tracks/python/python-outputs.test.ts re-runs them. The outlier explorer was
// recorded by src/lib/pycourse/fixtures/outliers.py.
import { lineOf, span } from '@/lib/foundations/annotate';
import { recordedExperiment, recordedSlots, type RecordedFixture } from '@/lib/pycourse/recorded';
import fixture from '@/lib/pycourse/fixtures/outliers.json';
import type { CodeExample } from '@/lib/types';

const outliers = fixture as RecordedFixture;
const SRC = outliers.template;

export const experiment = recordedExperiment('py-outliers', outliers, 'Rule');

export const outlierCode: CodeExample = {
  id: 'py-outliers-code',
  language: 'python',
  source: SRC,
  slots: recordedSlots(outliers),
  annotations: [
    {
      id: 'quantile',
      ...span(SRC, 4, 'minutes.quantile(0.25)'),
      kind: 'function',
      title: 'The first quartile',
      what: 'The value below which 25% of the data lies, with linear interpolation between sorted values (pandas’ default).',
      why: 'Quartiles depend on the middle of the data, so two extreme values barely move them.',
    },
    {
      id: 'z',
      ...span(SRC, lineOf(SRC, 'z = '), '(minutes - minutes.mean()) / minutes.std()'),
      kind: 'math',
      title: 'z-score',
      what: 'How many standard deviations each value is from the mean.',
      why: 'The mean and standard deviation include the outliers, which inflates both and shrinks the outliers’ own z-scores.',
    },
    {
      id: 'mad',
      ...span(SRC, lineOf(SRC, 'mad = '), '(minutes - minutes.median()).abs().median()'),
      kind: 'math',
      title: 'Median absolute deviation',
      what: 'The median distance from the median: a spread measure that ignores extreme values.',
      why: '0.6745 × (x − median) / MAD is a robust z-score on the same scale as an ordinary one for normal data.',
    },
    {
      id: 'rule',
      ...span(SRC, lineOf(SRC, 'flagged = '), '{{rule}}'),
      kind: 'syntax',
      title: 'The rule',
      what: 'A boolean mask: True for values the rule calls outliers.',
      why: 'Flag first, look at the flagged rows, then decide what to do with them.',
      inputs: 'the rule chosen above',
    },
  ],
};

/** Normalizing text, mapping aliases, and extracting fields with a regular expression. */
export const textRunner: CodeExample = {
  id: 'py-cleaning-text',
  language: 'python',
  run: 'pyodide',
  source: `import pandas as pd

raw = pd.Series(["  New York ", "new york", "NYC", "Oslo", "oslo.", "São Paulo", "Sao Paulo", None])

clean = (raw.str.strip()
            .str.lower()
            .str.replace(r"[^\\w\\s]", "", regex=True))   # drop punctuation
print(clean.tolist())

aliases = {"nyc": "new york", "sao paulo": "são paulo"}
city = clean.replace(aliases)
print(city.value_counts(dropna=False).to_dict())

codes = pd.Series(["SKU-0042-red", "sku 17 blue", "SKU-9-RED", "unknown"])
parts = codes.str.extract(r"(?i)sku[-\\s]?(\\d+)[-\\s](\\w+)")
parts.columns = ["number", "color"]
parts["number"] = pd.to_numeric(parts["number"])
parts["color"] = parts["color"].str.lower()
print(parts)`,
  annotations: [],
  expectedOutput: `['new york', 'new york', 'nyc', 'oslo', 'oslo', 'são paulo', 'sao paulo', nan]
{'new york': 3, 'oslo': 2, 'são paulo': 2, nan: 1}
   number color
0    42.0   red
1    17.0  blue
2     9.0   red
3     NaN   NaN`,
};

/** Mapping categories with an explicit table, reporting unmapped values, and capping extremes. */
export const categoriesRunner: CodeExample = {
  id: 'py-cleaning-categories',
  language: 'python',
  run: 'pyodide',
  source: `import pandas as pd

plan = pd.Series(["Pro", "pro ", "PRO", "free", "Free", "team", "enterprise", "trial"])
mapping = {"pro": "pro", "free": "free", "team": "team", "enterprise": "team"}

normalized = plan.str.strip().str.lower()
mapped = normalized.map(mapping)                 # unmapped values become NaN
print(mapped.tolist())
print("unmapped:", sorted(normalized[mapped.isna()].unique()))

as_cat = pd.Categorical(mapped, categories=["free", "pro", "team"])
print(pd.Series(as_cat).value_counts(sort=False).to_dict())

durations = pd.Series([12, 14, 13, 15, 14, 13, 16, 15, 14, 95, 13, 120])
low, high = durations.quantile([0.05, 0.95])
capped = durations.clip(lower=low, upper=high)
print(round(high, 2), round(capped.max(), 2), round(durations.mean(), 2), round(capped.mean(), 2))`,
  annotations: [],
  expectedOutput: `['pro', 'pro', 'pro', 'free', 'free', 'team', 'team', nan]
unmapped: ['trial']
{'free': 2, 'pro': 3, 'team': 2}
106.25 106.25 29.5 28.4`,
};
