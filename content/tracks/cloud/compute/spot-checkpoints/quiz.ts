import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'young',
    type: 'numeric',
    prompt: 'Saving a checkpoint takes 8 minutes and interruptions happen on average once every 4 hours. What checkpoint interval, in minutes, does Young’s rule suggest? Round to the nearest minute.',
    answer: 62,
    tolerance: 1,
    hint: 'τ* = √(2 × C × M), with C and M in the same unit (hours): C = 8/60.',
    explain: '√(2 × 0.1333 × 4) = √1.0667 ≈ 1.033 h ≈ 62 minutes.',
  },
  {
    id: 'no-ckpt',
    type: 'choice',
    prompt: 'Without checkpoints, why does the expected time on spot grow so much faster for a 40-hour job than for a 4-hour job?',
    options: [
      { text: 'Interruptions become more frequent the longer an instance runs', correct: false, explain: 'In the model the rate is constant. Long jobs suffer because they need a long uninterrupted stretch.' },
      { text: 'The chance of an uninterrupted stretch falls exponentially with its length', correct: true, explain: 'e^(−λW): at λ = 0.1, a 4-hour run survives 67% of the time, a 40-hour run 1.8%. Each failure also throws away more work.' },
      { text: 'Restarts get slower each time, since the instance must be re-imaged', correct: false, explain: 'Restart time is constant here. The exponential comes from the survival probability.' },
    ],
  },
  {
    id: 'tradeoff',
    type: 'choice',
    prompt: 'A teammate proposes checkpointing every minute “to be safe”. Saving takes 3 minutes. What happens?',
    options: [
      { text: 'Nothing bad: more checkpoints always mean less lost work', correct: false, explain: 'Less lost work per interruption, yes, but the saving cost W × C/τ becomes enormous.' },
      { text: 'The job spends three quarters of its time saving: 4 minutes of wall clock per minute of work', correct: true, explain: 'W(1 + C/τ) = W(1 + 3/1) = 4W. The saving term dominates; the best interval balances it against lost work.' },
      { text: 'The provider throttles instances that write too often to storage', correct: false, explain: 'No such throttle applies here. The cost is the time spent writing.' },
    ],
  },
  {
    id: 'what-to-save',
    type: 'choice',
    prompt: 'Which set of things must a checkpoint contain for training to continue exactly as if never interrupted?',
    options: [
      { text: 'The model weights only, since the rest can be recomputed', correct: false, explain: 'Optimizer state, the learning-rate schedule and the data position cannot be recomputed from weights.' },
      { text: 'Weights, optimizer and scheduler state, step number, and the data loader’s position and random state', correct: true, explain: 'Each one changes what the next step does. Missing any of them makes the resumed run diverge from an uninterrupted one.' },
      { text: 'The full Python process memory, saved with a snapshot tool', correct: false, explain: 'Process snapshots are fragile with GPUs and unnecessary: the training state above is enough.' },
    ],
  },
  {
    id: 'worth-it',
    type: 'numeric',
    prompt: 'On-demand, a job takes 10 hours at $4/hour. On spot at 40% of that price, the expected time with checkpoints is 11.5 hours. How many dollars does spot save?',
    answer: 21.6,
    tolerance: 0.01,
    hint: 'Spot cost = 11.5 × 0.4 × 4.',
    explain: 'On-demand: 10 × 4 = $40. Spot: 11.5 × 1.60 = $18.40. Saving: $21.60, for 1.5 extra hours of wall clock.',
  },
];

export const spotExercise: Exercise = {
  id: 'cloud-spot-plan',
  prompt:
    'Write `expected_hours(work_h, every_min, save_min, restart_min, rate_per_h)` with the lesson’s formulas (every_min = 0 means no checkpoints; return math.inf when the waste per hour reaches 1), and `young_minutes(save_min, rate_per_h)` returning √(2 C M) in minutes. Then write `spot_saves(work_h, every_min, save_min, restart_min, rate_per_h, spot_price, od_price)`: True if the expected spot cost is below the on-demand cost of work_h hours.',
  starter: `import math

def expected_hours(work_h, every_min, save_min, restart_min, rate_per_h):
    return work_h

def young_minutes(save_min, rate_per_h):
    return 0

def spot_saves(work_h, every_min, save_min, restart_min, rate_per_h, spot_price, od_price):
    return True`,
  hints: [
    'Convert minutes to hours first. With checkpoints: work_h × (1 + c / tau) / (1 − rate × ((tau + c) / 2 + r)).',
    'Without: (1 / rate + r) × math.expm1(rate × work_h). Young: sqrt(2 × c / rate) hours, × 60.',
  ],
  solution: `import math

def expected_hours(work_h, every_min, save_min, restart_min, rate_per_h):
    c, r = save_min / 60, restart_min / 60
    if rate_per_h == 0:
        return work_h * (1 + c / (every_min / 60)) if every_min else work_h
    if every_min == 0:
        return (1 / rate_per_h + r) * math.expm1(rate_per_h * work_h)
    tau = every_min / 60
    waste = rate_per_h * ((tau + c) / 2 + r)
    return work_h * (1 + c / tau) / (1 - waste) if waste < 1 else math.inf

def young_minutes(save_min, rate_per_h):
    return math.sqrt(2 * (save_min / 60) / rate_per_h) * 60

def spot_saves(work_h, every_min, save_min, restart_min, rate_per_h, spot_price, od_price):
    return expected_hours(work_h, every_min, save_min, restart_min, rate_per_h) * spot_price < work_h * od_price`,
  explanation:
    'The decision depends on both the price ratio and the interruption maths: a 65% discount is worthless if the job is expected to need three times as long.',
  tests: `import math as _m
assert abs(expected_hours(20, 30, 3, 10, 0.1) - 23.0166) < 1e-3
assert abs(expected_hours(20, 0, 3, 10, 0.1) - 64.9554) < 1e-3
assert expected_hours(20, 600, 3, 10, 0.5) == _m.inf
assert abs(young_minutes(3, 0.1) - 60) < 1e-9
assert spot_saves(20, 30, 3, 10, 0.1, 0.35, 1.0)
assert not spot_saves(20, 0, 3, 10, 0.1, 0.35, 1.0)
assert expected_hours(5, 0, 3, 10, 0) == 5`,
};
