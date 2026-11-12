import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'mean-median',
    type: 'choice',
    prompt: 'Session lengths have mean 52.7 and median 43.4 minutes. What does that suggest about the shape?',
    options: [
      {
        text: 'Symmetric, with a little noise',
        correct: false,
        explain: 'For symmetric data the mean and median nearly coincide; a 9-minute gap on 43 is large.',
      },
      {
        text: 'A long tail of long sessions',
        correct: true,
        explain:
          'A few very long sessions pull the mean up while the median stays with the typical session: right skew.',
      },
      {
        text: 'Most sessions are longer than 52.7',
        correct: false,
        explain: 'Half the sessions are below the median, 43.4, so most are shorter than the mean.',
      },
      {
        text: 'There must be data errors',
        correct: false,
        explain: 'Skewed data is normal for durations and incomes; it is not evidence of an error.',
      },
    ],
  },
  {
    id: 'chart-choice',
    type: 'choice',
    prompt: 'You want to compare the distribution of order values across four countries. Which chart fits?',
    options: [
      {
        text: 'A pie chart of total order value per country',
        correct: false,
        explain: 'A pie shows shares of one total, not how values are spread within each country.',
      },
      {
        text: 'Box plots or histograms per country, on one axis',
        correct: true,
        explain:
          'Distributions side by side on a shared scale show medians, spread and tails for each group.',
      },
      {
        text: 'A line chart with countries on the x-axis',
        correct: false,
        explain: 'Lines imply order or time between points; countries have neither.',
      },
      {
        text: 'A scatter plot of country against order value',
        correct: false,
        explain: 'With a categorical x-axis the points pile up into four unreadable stripes.',
      },
    ],
  },
  {
    id: 'zero-corr',
    type: 'choice',
    prompt: 'For x from −5 to 5 and y = x², the correlation is 0. What does that tell you?',
    options: [
      {
        text: 'x and y are unrelated',
        correct: false,
        explain: 'y is completely determined by x. Correlation only measures straight-line association.',
      },
      {
        text: 'There is no linear trend, though y depends on x',
        correct: true,
        explain: 'The rising and falling halves cancel out. Always plot before trusting r.',
      },
      {
        text: 'The computation failed',
        correct: false,
        explain: 'It is the correct Pearson correlation; the relationship is just not linear.',
      },
    ],
  },
  {
    id: 'bimodal',
    type: 'choice',
    prompt:
      'Half the values sit around 35 and half around 65. The median is 47.2. What is wrong with reporting it as the typical value?',
    options: [
      {
        text: 'Nothing; the median is robust',
        correct: false,
        explain: 'Robust to extremes, yes, but here it falls in the gap where almost no values are.',
      },
      {
        text: 'Almost no value is near 47',
        correct: true,
        explain:
          'With two groups, one central number describes neither. Report the groups, and look for what separates them.',
      },
      {
        text: 'The mean would be more typical',
        correct: false,
        explain: 'The mean, 49.9, is in the same empty gap.',
      },
    ],
  },
  {
    id: 'std-outlier',
    type: 'numeric',
    prompt:
      'Normal data has std 10.1 and IQR 13.9. One value of 400 is added (500 values in total). The std becomes 18.7. Roughly what is the IQR now? (Round to one decimal.)',
    answer: 14,
    tolerance: 0.2,
    hint: 'Quartiles depend on the middle of the sorted data, not on the extremes.',
    explain:
      'The IQR barely moves (14.0 in the recorded run), while one point nearly doubled the standard deviation.',
  },
];

export const summaryExercise: Exercise = {
  id: 'py-eda-summary',
  prompt: 'Write robust_summary(s) returning a dict with median, iqr and share_outliers (IQR rule, k = 1.5).',
  starter: `import pandas as pd

def robust_summary(s):
    return {"median": s.mean(), "iqr": s.std(), "share_outliers": 0.0}`,
  hints: [
    'q1, q3 = s.quantile(0.25), s.quantile(0.75); iqr = q3 - q1.',
    'Outliers are below q1 − 1.5·iqr or above q3 + 1.5·iqr.',
    'share_outliers is the mean of that boolean mask.',
  ],
  solution: `import pandas as pd

def robust_summary(s):
    q1, q3 = s.quantile(0.25), s.quantile(0.75)
    iqr = q3 - q1
    out = (s < q1 - 1.5 * iqr) | (s > q3 + 1.5 * iqr)
    return {"median": s.median(), "iqr": iqr, "share_outliers": out.mean()}`,
  explanation:
    'Median and IQR describe the typical value and spread without being dragged by the tail, and the share of flagged values tells a reader how much tail there is.',
  tests: `import pandas as pd
r = robust_summary(pd.Series([1, 2, 3, 4, 5, 6, 7, 100]))
assert r["median"] == 4.5, r
assert r["iqr"] == 3.5, r
assert r["share_outliers"] == 0.125, r`,
};
