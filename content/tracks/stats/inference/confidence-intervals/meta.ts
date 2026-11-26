import type { LessonMeta } from '@/lib/types';

export default {
  id: 'stats/inference/confidence-intervals',
  title: 'Confidence intervals: a range for the unknown',
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Build a confidence interval as estimate ± critical value × standard error, and explain each part',
    'Say precisely what "95% confidence" promises: the share of intervals, across repeated samples, that contain the true value',
    'Use the t distribution when σ is estimated from a small sample, and explain why it is wider than the normal',
    'Predict how sample size, confidence level and data spread change the width',
  ],
  prerequisites: ['stats/sampling/central-limit-theorem'],
  concepts: ['confidence-interval', 'margin-of-error', 't-distribution', 'degrees-of-freedom', 'standard-error', 'bootstrap-sample'],
  references: [
    { title: 'OpenIntro Statistics (4th ed.), sections 5.2 and 7.1', url: 'https://www.openintro.org/book/os/' },
    { title: 'NIST/SEMATECH e-Handbook: 7.2.2.1 Confidence limits for the mean', url: 'https://www.itl.nist.gov/div898/handbook/prc/section2/prc221.htm' },
    { title: 'SciPy: scipy.stats.t (critical values)', url: 'https://docs.scipy.org/doc/scipy-1.18.1/reference/generated/scipy.stats.t.html', version: '1.18.1' },
  ],
} satisfies LessonMeta;
