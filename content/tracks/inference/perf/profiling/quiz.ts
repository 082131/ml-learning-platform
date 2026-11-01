import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'mean',
    type: 'choice',
    prompt:
      'Without warm-up, 200 timed calls give mean 17.49 ms and p50 12.02 ms. With 10 warm-up calls: mean 12.58, p50 11.99. What explains the difference in the mean?',
    options: [
      {
        text: 'The first call’s one-time setup (about 900 ms) is included in the first run; one slow call moves a mean of 200 by about 4.5 ms',
        correct: true,
        explain:
          '900 / 200 = 4.5 ms. The median barely moves, which is why medians and percentiles are reported alongside the mean.',
      },
      {
        text: 'The GPU runs faster after it warms up physically',
        correct: false,
        explain:
          'Warm-up refers to software one-time costs, not temperature. Hot GPUs, if anything, clock down.',
      },
      {
        text: 'Warm-up calls make the model compute less',
        correct: false,
        explain:
          'Every call does the same arithmetic. Warm-up only removes setup costs from the measurement.',
      },
    ],
  },
  {
    id: 'samples',
    type: 'choice',
    prompt: 'Why can 20 timed calls not give a meaningful p99?',
    options: [
      {
        text: 'p99 is the value 1% of calls exceed; with 20 calls it is interpolated between the two slowest, so a rare stall is either missed or dominates',
        correct: true,
        explain:
          'In the simulation, 20 calls miss the stall that happens every 100 calls entirely: p99 16.45 ms instead of about 19.7 with 2,000 calls.',
      },
      {
        text: 'NumPy needs at least 100 values to compute a percentile',
        correct: false,
        explain: 'numpy.percentile works on any non-empty array; the result just is not a reliable estimate.',
      },
      {
        text: 'p99 is always equal to the maximum',
        correct: false,
        explain: 'Only for very small samples does it approach the maximum.',
      },
    ],
  },
  {
    id: 'omission',
    type: 'choice',
    prompt:
      'A server freezes for 1 second. A closed-loop load test reports p99 = 10 ms; an open-loop test at 50 requests per second reports p99 = 985 ms. Which is right for users?',
    options: [
      {
        text: 'The open-loop number: real users keep arriving during the freeze, and about 50 of them wait for it',
        correct: true,
        explain:
          'The closed-loop client stopped sending while it waited, so it recorded one slow request instead of fifty. That is coordinated omission.',
      },
      {
        text: 'The closed-loop number, because it sent more requests in total',
        correct: false,
        explain: 'It sent more requests while the server was fast, and almost none while it was slow.',
      },
      {
        text: 'Both, they measure the same thing',
        correct: false,
        explain: 'They measure different traffic. Only open-loop arrivals resemble independent users.',
      },
    ],
  },
  {
    id: 'amdahl',
    type: 'numeric',
    prompt:
      'Preprocessing is 4.27 ms and the model 0.98 ms of a 5.36 ms request (p50). If you made the model infinitely fast, what would the request take? (ms, two decimals)',
    answer: 4.38,
    tolerance: 0.005,
    hint: 'Only the model’s share goes away.',
    explain:
      '5.36 − 0.98 = 4.38 ms: an 18% improvement at best. Profile before optimizing; here the JSON parsing is the target.',
  },
];

export const percentileExercise: Exercise = {
  id: 'percentile-linear',
  prompt:
    'Write `percentile(values, p)` without NumPy: sort, find position (n − 1) · p / 100, and interpolate linearly between the two nearest values. It should agree with numpy.percentile’s default.',
  starter: `def percentile(values, p):
    pass`,
  hints: [
    's = sorted(values); pos = (len(s) - 1) * p / 100.',
    'lo = int(pos) (floor for non-negative numbers), hi = min(lo + 1, len(s) - 1).',
    'Return s[lo] + (s[hi] - s[lo]) * (pos - lo).',
  ],
  solution: `def percentile(values, p):
    s = sorted(values)
    pos = (len(s) - 1) * p / 100
    lo = int(pos)
    hi = min(lo + 1, len(s) - 1)
    return s[lo] + (s[hi] - s[lo]) * (pos - lo)`,
  explanation:
    'This is NumPy’s default ("linear") method. Other tools use other definitions (nearest rank, for example), which differ for small samples, so say which one you report.',
  tests: `assert percentile([1, 2, 3, 4], 50) == 2.5, 'the median of 1, 2, 3, 4 is 2.5'
assert abs(percentile([10, 20, 30, 40, 50], 95) - 48) < 1e-9, 'position 3.8 lies 80% of the way from 40 to 50'
assert percentile([5, 1, 3], 0) == 1 and percentile([5, 1, 3], 100) == 5, 'p0 is the minimum and p100 the maximum'
assert percentile([7], 99) == 7, 'one value is every percentile'`,
};
