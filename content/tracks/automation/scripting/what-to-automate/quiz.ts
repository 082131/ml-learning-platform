import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'payback',
    type: 'numeric',
    prompt: 'A report takes 30 minutes by hand, twice a week. Automated, it takes 0 minutes of your time, cost 10 hours to build and needs 1 hour of upkeep a month. Using 52/12 weeks per month, in which month does it pay back? (Answer with the month number.)',
    answer: 3,
    tolerance: 0,
    hint: 'Saved per month = 30 × 2 × 4.33 / 60. Subtract upkeep, then count months until the build cost is covered.',
    explain: '30 × 2 × 4.33 / 60 = 4.33 h saved, 3.33 h net per month. After month 2: −10 + 6.67 = −3.3; after month 3: −10 + 10 = 0.0, so it breaks even in month 3.',
  },
  {
    id: 'not-toil',
    type: 'choice',
    prompt: 'Which of these is least suited to full automation?',
    options: [
      { text: 'Copying yesterday’s export into the shared drive', correct: false, explain: 'Repetitive, rule-based, no judgment: textbook toil.' },
      { text: 'Checking every night that the training job wrote a model', correct: false, explain: 'A yes/no check on a fixed rule. Automate it and alert on failure.' },
      { text: 'Choosing which of two near-tied models goes to production', correct: true, explain: 'This is a judgment with business trade-offs. Automate the evidence (metrics, slices, a report), keep the decision with a person.' },
      { text: 'Renaming files to a date-stamped convention', correct: false, explain: 'Pure rule application, easy to make idempotent.' },
    ],
  },
  {
    id: 'idempotent',
    type: 'choice',
    prompt: 'A cleanup script is idempotent. What does that guarantee?',
    options: [
      { text: 'It never fails, even when the disk is full', correct: false, explain: 'Idempotency is about repeated runs, not about errors.' },
      { text: 'Running it twice leaves the same result as running it once', correct: true, explain: 'So a retry, an accidental double run or a rerun after a crash is harmless.' },
      { text: 'It finishes in the same amount of time on every run', correct: false, explain: 'Run time is unrelated; the second run usually does less work.' },
    ],
  },
  {
    id: 'ladder',
    type: 'order',
    prompt: 'Order the automation ladder from least to most automated.',
    items: ['A written runbook', 'A script someone runs by hand', 'A scheduled job with alerts', 'A pipeline with retries and gates', 'Self-service: others trigger it safely'],
    explain: 'Each rung builds on the one before: you can’t script steps you never wrote down, or schedule a script that needs a person to babysit it.',
  },
  {
    id: 'maintenance',
    type: 'choice',
    prompt: 'An automation saves 4 hours a month but breaks so often that fixing it takes 5 hours a month. What is true?',
    options: [
      { text: 'It still pays back once the build cost is recovered', correct: false, explain: 'The net is −1 h a month, so the build cost is never recovered.' },
      { text: 'It loses an hour a month and should be fixed or retired', correct: true, explain: 'Net = 4 − 5 = −1 h. Make it robust (the next lessons) or go back to the manual task.' },
      { text: 'It breaks even, since saving and fixing both count as work', correct: false, explain: 'They are not equal: 5 hours spent against 4 saved is a loss.' },
    ],
  },
];

export const toilExercise: Exercise = {
  id: 'payback-month',
  prompt:
    'Write `payback_month(manual_min, automated_min, runs_per_week, build_h, maintain_h, horizon=12)`. It returns the first month (1, 2, ...) at the end of which the cumulative net hours (−build_h plus the monthly net, month after month) are ≥ 0, or `None` if that does not happen within `horizon` months. Use 52/12 weeks per month. Round the cumulative balance to 6 decimals before comparing, so floating-point noise does not decide the answer.',
  starter: `def payback_month(manual_min, automated_min, runs_per_week, build_h, maintain_h, horizon=12):
    pass`,
  hints: [
    'Monthly net = (manual_min − automated_min) × runs_per_week × 52/12 / 60 − maintain_h.',
    'Start a balance at −build_h, add the net once per month, and return the month when round(balance, 6) >= 0.',
  ],
  solution: `def payback_month(manual_min, automated_min, runs_per_week, build_h, maintain_h, horizon=12):
    net = (manual_min - automated_min) * runs_per_week * (52 / 12) / 60 - maintain_h
    balance = -build_h
    for month in range(1, horizon + 1):
        balance += net
        if round(balance, 6) >= 0:
            return month
    return None`,
  explanation:
    'The build cost is paid once, up front; savings and maintenance recur. A negative monthly net never pays back, however long you wait.',
  tests: `assert payback_month(20, 2, 5, 12, 1.5) == 3
assert payback_month(30, 0, 2, 10, 1) == 3
assert payback_month(5, 0, 1, 4, 1) is None
assert payback_month(60, 0, 5, 100, 0) == 5
assert payback_month(60, 0, 5, 100, 0, horizon=4) is None`,
};
