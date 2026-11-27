import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'spot-deadline',
    type: 'choice',
    prompt: 'On g6.xlarge the fine-tune measures 20 hours. On spot without checkpoints the checker expects 34.7 hours and fails the 30-hour deadline; with a checkpoint every 60 minutes it expects 21.8 hours and passes, even though saving adds time. Why does adding work make the run shorter?',
    options: [
      { text: 'Each interruption now loses at most an hour of work instead of everything since the start', correct: true, explain: 'Without checkpoints the run needs 20 uninterrupted hours, whose chance falls exponentially. Checkpoints trade a 5% saving cost for a small, bounded loss per interruption.' },
      { text: 'Checkpoints make spot instances less likely to be interrupted', correct: false, explain: 'The interruption rate is the same 0.05 per hour either way. Only the cost of each interruption changes.' },
      { text: 'Saving a checkpoint lets the job move to a faster instance halfway through', correct: false, explain: 'The instance type stays the same. The gain is the work that no longer has to be redone.' },
    ],
  },
  {
    id: 'endpoint-saving',
    type: 'numeric',
    prompt: 'The endpoint costs $0.80 per instance-hour. Two always-on instances become an autoscaled endpoint that averages 1.4 instances. How many dollars a month does that save (730 hours)?',
    answer: 350.4,
    tolerance: 0.5,
    hint: '(2 − 1.4) × 730 × 0.80.',
    explain: '0.6 × 730 × $0.80 = $350.40 a month, more than ten times the whole month’s training on spot ($24).',
  },
  {
    id: 'largest-line',
    type: 'choice',
    prompt: 'In the passing plan, four spot fine-tunes cost about $24 a month and serving about $818. A teammate proposes spending a week tuning the training job to run 20% faster. What does the bill say?',
    options: [
      { text: 'It would save about $5 a month; the same week spent on serving (autoscaling, scale-to-zero off hours, a smaller instance) could save hundreds', correct: true, explain: 'The cost-control lesson’s rule: start from the largest line. Training is expensive per hour but runs few hours; serving runs all 730.' },
      { text: 'It is the best use of the week, because GPU training is always the largest cost in ML', correct: false, explain: 'That is true for big pre-training runs, not for a small fine-tune served all month.' },
      { text: 'It would break the deadline check, so it should not be done', correct: false, explain: 'Faster training only helps the deadline. It is simply worth very little money here.' },
    ],
  },
  {
    id: 'why-data-check',
    type: 'choice',
    prompt: 'Keeping the data in another region adds only about $48 a month, well inside the budget, yet the checker still fails the plan on “data next to the GPUs”. Which reason best justifies that?',
    options: [
      { text: 'Every training run then reads 200 GB across regions, which is slower, costs more as runs grow, and may break data-location rules', correct: true, explain: 'The moving-data lesson’s data gravity: the transfer is paid on every read, the throughput is lower, and data can leave the region it is allowed in. Copy it once, next to the GPUs.' },
      { text: 'Managed training jobs cannot read buckets in other regions', correct: false, explain: 'They can, with the right permissions. The problem is cost, speed and compliance, not possibility.' },
      { text: 'Cross-region data must always use the public internet', correct: false, explain: 'Cross-region transfer stays on the provider’s network. It is still billed and slower than reading in-region.' },
    ],
  },
  {
    id: 'measure-hours',
    type: 'choice',
    prompt: 'You benchmarked 20 hours on g6.xlarge (L4) and then switch the plan to g6e.xlarge (L40S) without measuring again, keeping 20 hours in the checker. What is wrong with the resulting numbers?',
    options: [
      { text: 'Hours depend on the GPU, so the deadline and cost checks now use a figure measured on different hardware', correct: true, explain: 'A faster GPU at a higher price per hour can cost more or less per run; only a benchmark on that instance tells you which. Every check downstream inherits the error.' },
      { text: 'Nothing: training time depends on the model and data, not on the GPU', correct: false, explain: 'Throughput differs by several times between GPU generations, so the same job takes very different times.' },
      { text: 'The memory check becomes wrong, because the L40S has less memory', correct: false, explain: 'The L40S has 48 GB, more than the L4’s 24 GB. Memory still fits; the time and cost figures are the problem.' },
    ],
  },
];

export const capstoneExercise: Exercise = {
  id: 'cloud-capstone-month',
  prompt:
    'Write `capstone_month(train_h, price, spot, every_min, runs, serve_avg, serve_price)` returning `(wall_hours, monthly_total)`. On spot, use the spot lesson’s formulas with 0.05 interruptions per hour, a 3-minute save and a 10-minute restart (every_min = 0 means no checkpoints), and a 65% discount; on demand, wall_hours is train_h. The month is runs × wall_hours × the hourly price paid, plus serve_avg × 730 × serve_price.',
  starter: `import math

def capstone_month(train_h, price, spot, every_min, runs, serve_avg, serve_price):
    return train_h, train_h * price * runs`,
  hints: [
    'Spot with checkpoints: train_h × (1 + c/τ) / (1 − 0.05 × ((τ + c)/2 + r)), with c = 3/60, r = 10/60, τ = every_min/60. Without: (1/0.05 + r) × math.expm1(0.05 × train_h).',
    'The price paid on spot is price × (1 − 0.65).',
  ],
  solution: `import math

def capstone_month(train_h, price, spot, every_min, runs, serve_avg, serve_price):
    rate, c, r = 0.05, 3 / 60, 10 / 60
    if not spot:
        hours, paid = train_h, price
    else:
        paid = price * (1 - 0.65)
        if every_min == 0:
            hours = (1 / rate + r) * math.expm1(rate * train_h)
        else:
            tau = every_min / 60
            hours = train_h * (1 + c / tau) / (1 - rate * ((tau + c) / 2 + r))
    return hours, runs * hours * paid + serve_avg * 730 * serve_price`,
  explanation:
    'The capstone’s numbers are the track’s formulas composed: the spot lesson gives the wall-clock time, the price model turns it into training cost, and the serving line, usually the largest, comes from the endpoint’s average size.',
  tests: `h, total = capstone_month(20, 0.8, True, 60, 4, 1.4, 0.8)
assert abs(h - 21.7523) < 1e-3 and abs(total - 841.9625) < 1e-3
h, total = capstone_month(20, 0.8, False, 0, 4, 2, 0.8)
assert h == 20 and abs(total - 1232) < 1e-9
h, total = capstone_month(20, 0.8, True, 0, 4, 1.4, 0.8)
assert abs(h - 34.6520) < 1e-3 and abs(total - 856.4103) < 1e-3`,
};
