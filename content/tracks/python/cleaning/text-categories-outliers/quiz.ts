import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'masking',
    type: 'choice',
    prompt:
      'Twelve durations: ten between 12 and 16 minutes, plus 95 and 120. Why does the rule |z| > 3 flag neither extreme?',
    options: [
      {
        text: 'z-scores only work on normally distributed data',
        correct: false,
        explain:
          'Non-normal data makes thresholds less meaningful, but the main effect here is something else.',
      },
      {
        text: 'The two outliers inflate the std, shrinking their own z',
        correct: true,
        explain:
          'With std 36.84 instead of about 1.3, 120 is only 2.46 standard deviations from the mean. This is called masking.',
      },
      {
        text: 'Threshold 3 is too low',
        correct: false,
        explain: 'A lower threshold flags more values, not fewer; the problem is the inflated scale.',
      },
      {
        text: 'z-scores ignore values above the mean',
        correct: false,
        explain: 'The absolute value catches both directions.',
      },
    ],
  },
  {
    id: 'iqr-fence',
    type: 'numeric',
    prompt: 'Q1 = 13 and Q3 = 15.25. What is the upper IQR fence for k = 1.5?',
    answer: 18.625,
    tolerance: 0.001,
    hint: 'IQR = Q3 − Q1; the upper fence is Q3 + 1.5 × IQR.',
    explain: 'IQR = 2.25, so the fence is 15.25 + 1.5 × 2.25 = 18.625.',
  },
  {
    id: 'outlier-action',
    type: 'choice',
    prompt: 'A heart-rate column contains 0 for some rows and 210 for one sprinter. What should cleaning do?',
    options: [
      {
        text: 'Remove both, since both are outliers',
        correct: false,
        explain: 'Outlier rules find unusual values, not wrong ones. 210 can be real.',
      },
      {
        text: 'Treat 0 as missing; keep 210 after checking it',
        correct: true,
        explain:
          'A heart rate of 0 in a living person is a recording error (missing data); 210 is extreme but possible, and removing it would hide real behavior.',
      },
      {
        text: 'Cap both at the 95th percentile',
        correct: false,
        explain: 'Capping 0 upward invents a heart rate; capping hides the real extreme.',
      },
    ],
  },
  {
    id: 'map-nan',
    type: 'choice',
    prompt: '`s.map({"pro": "pro", "free": "free"})` on a value "trial". What do you get for it?',
    options: [
      {
        text: '"trial", unchanged',
        correct: false,
        explain: 'That is what replace does: it leaves unknown values alone.',
      },
      {
        text: 'NaN',
        correct: true,
        explain:
          'map with a dict returns NaN for keys it does not have, which makes unmapped values easy to find and report.',
      },
      { text: 'KeyError', correct: false, explain: 'Series.map does not raise for missing keys.' },
    ],
  },
  {
    id: 'regex',
    type: 'choice',
    prompt: 'Which pattern captures the number in both "SKU-0042-red" and "sku 17 blue" with `str.extract`?',
    options: [
      {
        text: String.raw`SKU-(\d+)`,
        correct: false,
        explain: 'It needs uppercase SKU and a hyphen, so "sku 17" does not match.',
      },
      {
        text: String.raw`(?i)sku[-\s]?(\d+)`,
        correct: true,
        explain: String.raw`(?i) ignores case, [-\s]? allows a hyphen, a space or nothing, and (\d+) captures the digits.`,
      },
      {
        text: String.raw`(\w+)`,
        correct: false,
        explain: 'It captures the first word, "SKU" or "sku", not the number.',
      },
      {
        text: String.raw`sku(\d+)`,
        correct: false,
        explain: 'Without allowing a separator or ignoring case, neither example matches.',
      },
    ],
  },
];

export const normalizeExercise: Exercise = {
  id: 'py-cleaning-normalize-country',
  prompt:
    'Write normalize_country(s) that maps messy country text to ISO codes and raises if any value stays unmapped.',
  starter: `import pandas as pd

CODES = {"norway": "NO", "no": "NO", "sweden": "SE", "se": "SE", "germany": "DE", "de": "DE"}

def normalize_country(s):
    return s.replace(CODES)          # misses case and spaces, and hides unknowns`,
  hints: [
    'Normalize first: s.str.strip().str.lower().',
    'Use .map(CODES) so unknown values become NaN.',
    'Find values that were present but did not map: s.notna() & mapped.isna(); raise ValueError listing them.',
  ],
  solution: `import pandas as pd

CODES = {"norway": "NO", "no": "NO", "sweden": "SE", "se": "SE", "germany": "DE", "de": "DE"}

def normalize_country(s):
    key = s.str.strip().str.lower()
    mapped = key.map(CODES)
    unknown = sorted(key[s.notna() & mapped.isna()].unique())
    if unknown:
        raise ValueError(f"unmapped countries: {unknown}")
    return mapped`,
  explanation:
    'Normalizing before mapping catches case and spacing variants; map turns unknown values into NaN, and the explicit check refuses to let a new spelling slip through silently. Genuinely missing values stay missing.',
  tests: `import pandas as pd
ok = normalize_country(pd.Series([" Norway", "SE", "germany ", None]))
assert ok.tolist()[:3] == ["NO", "SE", "DE"], ok.tolist()
assert pd.isna(ok.tolist()[3])
try:
    normalize_country(pd.Series(["Norway", "Narnia"]))
except ValueError as e:
    assert "narnia" in str(e)
else:
    raise AssertionError("unknown countries must raise")`,
};
