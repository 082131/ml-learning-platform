import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'big-window',
    type: 'choice',
    prompt:
      'With a shift of +0.05 (9% of a standard deviation) and 20,000 serving values, the KS test alerts (p = 0.0125) while PSI is 0.019. What is the best reading?',
    options: [
      {
        text: 'The KS test is wrong, because PSI is the more reliable statistic',
        correct: false,
        explain:
          'The KS test is right: the distributions do differ. It answers “is there any difference?”, which with 20,000 values is almost always yes.',
      },
      {
        text: 'There is a real but small shift; whether to act depends on an effect-size threshold, not on the p-value',
        correct: true,
        explain:
          'Large samples make tiny differences significant. D = 0.05 and PSI = 0.019 say the shift is small; teams alert on effect size and use p only to filter out noise.',
      },
      {
        text: 'The model must be retrained at once, since any significant drift invalidates it',
        correct: false,
        explain:
          'Drift moves inputs, it does not prove the model got worse. A 9% shift in one feature often has no measurable effect on accuracy.',
      },
      {
        text: 'The window is too large and the result is noise; only windows of 200 should be used',
        correct: false,
        explain:
          'Small windows are the noisy ones: with 200 values and no shift at all, PSI is already 0.066. Large windows estimate the shift well.',
      },
    ],
  },
  {
    id: 'drift-kinds',
    type: 'choice',
    prompt:
      'A bank changes its fraud policy so that some transactions it used to approve are now fraud. Transaction features look exactly as before. What kind of change is this, and which check sees it?',
    options: [
      {
        text: 'Covariate drift; a KS test on the transaction amount',
        correct: false,
        explain: 'The inputs did not change, so input-distribution tests have nothing to detect.',
      },
      {
        text: 'Training-serving skew; comparing training features with logged serving features',
        correct: false,
        explain:
          'Skew is a difference in how features are computed in two pipelines. Here the features are computed correctly; their meaning changed.',
      },
      {
        text: 'Concept drift; model performance on newly labeled data',
        correct: true,
        explain:
          'P(y | x) changed while P(x) stayed. Only labels reveal it, so it appears as falling precision or recall once outcomes arrive.',
      },
    ],
  },
  {
    id: 'ks-calc',
    type: 'numeric',
    prompt:
      'Sample a is 1, 2, 3, 4 and sample b is 2, 3, 4, 5, 6, 7, 8, 9. What is the KS statistic D? Give 3 decimals.',
    answer: 0.625,
    tolerance: 0.0005,
    hint: 'Check the gap at each value. After 4, all of sample a is at or below it; what share of b is?',
    explain:
      'The gaps are 0.25 at 1, 0.5 − 0.125 = 0.375 at 2, 0.75 − 0.25 = 0.5 at 3 and 1.0 − 0.375 = 0.625 at 4. After that F_a stays 1 and F_b rises, so the gap shrinks. D = 0.625.',
  },
  {
    id: 'baseline-what',
    type: 'choice',
    prompt: 'Which of these belongs in a data baseline for a model?',
    options: [
      {
        text: 'Only the column names and types, because distributions change too often to store',
        correct: false,
        explain:
          'Without stored distributions there is nothing to compare new data with, so drift and skew cannot be measured.',
      },
      {
        text: 'Schema (types, domains, missing-value limits) and statistics (histograms, quantiles, category frequencies) of the training data',
        correct: true,
        explain:
          'The schema catches broken batches; the statistics are the reference for drift tests. Both are versioned with the model.',
      },
      {
        text: 'The last week of production data, refreshed every day',
        correct: false,
        explain:
          'A rolling reference can only detect sudden changes. Slow drift away from what the model was trained on goes unseen.',
      },
      {
        text: 'The model’s accuracy on the validation set',
        correct: false,
        explain: 'That is a performance baseline, useful too, but it says nothing about what valid input data looks like.',
      },
    ],
  },
  {
    id: 'unit-bug',
    type: 'choice',
    prompt:
      'Overnight, the basket feature in serving jumps from about 40 to about 4,000 for every request. Which check should catch this first, and how should it react?',
    options: [
      {
        text: 'A schema range check in the serving pipeline, which blocks or quarantines the bad values and alerts',
        correct: true,
        explain:
          'A hundredfold jump in every value is a broken pipeline (here, cents instead of euros), not drift. Range checks catch it on the first batch.',
      },
      {
        text: 'A weekly PSI report, which will show a major shift and trigger retraining',
        correct: false,
        explain:
          'Retraining on cents would teach the model the bug. And a weekly report leaves a week of wrong predictions.',
      },
      {
        text: 'A KS test on the label distribution, since the labels will shift too',
        correct: false,
        explain: 'Labels arrive late and may not change at all. The input itself is plainly broken and can be checked now.',
      },
    ],
  },
  {
    id: 'skew-def',
    type: 'choice',
    prompt: 'What is the difference between training-serving skew and drift?',
    options: [
      {
        text: 'Skew is a difference between training data and serving data at the same time, caused by the pipelines; drift is a change in serving data over time',
        correct: true,
        explain:
          'Skew exists from the first request (two implementations of a feature). Drift appears gradually as the world changes.',
      },
      {
        text: 'They are the same thing; skew is the term used by Google and drift the term used by AWS',
        correct: false,
        explain:
          'Both vendors use both terms, with different meanings. Vertex AI and SageMaker Model Monitor each offer separate skew and drift detection.',
      },
      {
        text: 'Skew only affects categorical features and drift only numeric features',
        correct: false,
        explain: 'Both can affect any feature type.',
      },
    ],
  },
];

export const ksExercise: Exercise = {
  id: 'ks-statistic',
  prompt: 'Write `ks_statistic(a, b)`: the largest gap between the empirical CDFs of two samples.',
  starter: `def ks_statistic(a, b):
    # Return max over all values v of |share of a <= v  -  share of b <= v|.
    return abs(sum(a) / len(a) - sum(b) / len(b))`,
  hints: [
    'The gap only changes at values that appear in a or b, so it is enough to check those.',
    'For each v in set(a) | set(b), compute sum(x <= v for x in a) / len(a), and the same for b.',
  ],
  solution: `def ks_statistic(a, b):
    d = 0.0
    for v in set(a) | set(b):
        fa = sum(x <= v for x in a) / len(a)
        fb = sum(x <= v for x in b) / len(b)
        d = max(d, abs(fa - fb))
    return d`,
  explanation:
    'The starter compares means, which misses changes in spread or shape: two samples with the same mean and different variance get 0. The CDF gap sees any difference. This version is O(n²); sorting both samples and walking them once, as in drift.py, is O(n log n).',
  tests: `assert abs(ks_statistic([1, 2, 3, 4], [3, 4, 5, 6]) - 0.5) < 1e-9
assert abs(ks_statistic([1, 2, 3, 4], [2, 3, 4, 5, 6, 7, 8, 9]) - 0.625) < 1e-9
assert ks_statistic([1, 2, 3], [1, 2, 3]) == 0
assert abs(ks_statistic([4, 5, 6], [0, 5, 10]) - 1 / 3) < 1e-9, 'same mean, different spread'`,
};
