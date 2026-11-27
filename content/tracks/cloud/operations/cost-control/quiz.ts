import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'notebooks',
    type: 'numeric',
    prompt: 'Six notebook instances at $1.50 an hour run all month (730 hours). An idle-shutdown rule makes them run only in working hours, about 174 a month. How many dollars a month does the rule save?',
    answer: 5004,
    tolerance: 1,
    hint: '6 × $1.50 × (730 − 174).',
    explain: '6 × 1.50 × 556 = $5,004. The notebooks were paid for 730 hours and used for about 174: three quarters of the line was idle time.',
  },
  {
    id: 'budget-not-cap',
    type: 'choice',
    prompt: 'The team had a $3,000 monthly budget with an alert at 100% of actual spend. A script with a bug launched GPU instances in a loop on Friday evening, and the weekend cost $9,000. Why didn’t the budget stop it?',
    options: [
      { text: 'A budget only sends notifications, and billing data arrives hours late, so it warns after the money is spent', correct: true, explain: 'Budgets are alarms. Stopping spend needs something that acts: budget actions, a quota, a guardrail policy, or your own automation, plus forecast and anomaly alerts that fire earlier.' },
      { text: 'Budgets only cover services with fixed prices, and GPU instances are billed by the second', correct: false, explain: 'Budgets cover all costs, including per-second compute. The problem is that they notify rather than block.' },
      { text: 'The alert threshold should have been 110%, because AWS ignores alerts at exactly 100%', correct: false, explain: 'A 100% alert does fire. It fired after the overspend, which is what an actual-spend alert does.' },
    ],
  },
  {
    id: 'commit-order',
    type: 'choice',
    prompt: 'An endpoint runs 2 instances all month. You plan to buy a one-year commitment for 2 instances’ worth of usage at 30% off, and then turn on autoscaling, which brings the average down to 1.1 instances. What is wrong with that order?',
    options: [
      { text: 'You pay for the commitment whether you use it or not, so about 0.9 instances’ worth of it is paid for and unused', correct: true, explain: 'Scale down first, then commit to the steady floor you will certainly use. A commitment is a discount on usage you promise, not on usage you have.' },
      { text: 'Nothing: commitments and autoscaling cannot be combined, so the autoscaling simply will not start', correct: false, explain: 'They combine well. Autoscaling still works; the problem is paying for committed hours that no longer run.' },
      { text: 'The commitment discount only applies to spot capacity', correct: false, explain: 'Commitments (Savings Plans, committed use discounts) discount on-demand usage. Spot has its own, separate discount.' },
    ],
  },
  {
    id: 'invisible-storage',
    type: 'choice',
    prompt: 'The bill shows 60 TB stored in a bucket, but listing every object adds up to 35 TB. The bucket holds checkpoints that are overwritten every 30 minutes and uploaded in parts. Where are the other 25 TB?',
    options: [
      { text: 'Old versions of overwritten checkpoints and parts of uploads that never completed, neither of which a normal listing shows', correct: true, explain: 'With versioning, each overwrite keeps a noncurrent copy; failed multipart uploads keep their parts. Lifecycle rules for noncurrent versions and incomplete uploads clean both up.' },
      { text: 'S3 stores three copies of every object and bills for each of them', correct: false, explain: 'S3 replicates data across zones for durability, but you are billed for one copy of the data you store.' },
      { text: 'The bill counts reads as storage, so frequently loaded checkpoints are counted several times', correct: false, explain: 'Reads are billed as requests (and transfer), not as stored GB.' },
    ],
  },
  {
    id: 'tags',
    type: 'choice',
    prompt: 'You added a project tag to every resource yesterday. Today Cost Explorer offers no way to group costs by project. What is the most likely reason?',
    options: [
      { text: 'User-defined tags must be activated as cost allocation tags in the billing console before they appear in cost reports', correct: true, explain: 'Activation is a separate, account-level step, and tags only appear after it. Activate them on day one, before the costs you want to explain.' },
      { text: 'Cost Explorer can only group by service and region, never by tag', correct: false, explain: 'Grouping by an activated tag is one of its main uses, as the code example shows.' },
      { text: 'Tags only apply to resources created after the tag policy existed', correct: false, explain: 'Tags on existing resources count. The missing step is activation for billing.' },
    ],
  },
  {
    id: 'largest',
    type: 'choice',
    prompt: 'In the lab’s default month, training costs $1,200 and notebooks $3,504. A teammate wants to start cost work by moving training to spot. Why is that not the best first step?',
    options: [
      { text: 'Spot saves at most $720 here, while stopping idle notebooks saves $2,669: start with the largest line', correct: true, explain: 'Cost work starts from the bill, not from the best-known trick. Idle time is usually a bigger line than the price per hour of the busy machines.' },
      { text: 'Spot cannot be used for training jobs, only for notebooks', correct: false, explain: 'Training with checkpoints is the classic spot workload, as the spot lesson showed. It is just not the biggest saving in this bill.' },
      { text: 'Spot would raise the bill, because interruptions always cost more than the discount saves', correct: false, explain: 'With checkpoints, spot is usually cheaper. Here it helps, but it is the second-largest saving, not the largest.' },
    ],
  },
];

export const billExercise: Exercise = {
  id: 'cloud-month-bill',
  prompt:
    'Write `monthly_bill(train_h, train_price, spot_share, spot_discount, notebooks, nb_price, auto_stop, endpoint_n, endpoint_price, storage_gb, egress_gb)` with the lesson’s lines: training (the spot share at the discounted price), notebooks (174 hours with auto_stop, else 730), the endpoint (730 hours), storage at $0.023 per GB-month and egress at $0.09 per GB. Then write `biggest_line(...)` with the same arguments, returning the name of the largest line: "training", "notebooks", "endpoint", "storage" or "egress".',
  starter: `def monthly_bill(train_h, train_price, spot_share, spot_discount, notebooks, nb_price, auto_stop,
                 endpoint_n, endpoint_price, storage_gb, egress_gb):
    return train_h * train_price

def biggest_line(train_h, train_price, spot_share, spot_discount, notebooks, nb_price, auto_stop,
                 endpoint_n, endpoint_price, storage_gb, egress_gb):
    return "training"`,
  hints: [
    'Training: train_h × train_price × ((1 − spot_share) + spot_share × (1 − spot_discount)).',
    'Build a dict of the five lines; monthly_bill returns sum(lines.values()) and biggest_line returns max(lines, key=lines.get).',
  ],
  solution: `def _lines(train_h, train_price, spot_share, spot_discount, notebooks, nb_price, auto_stop,
           endpoint_n, endpoint_price, storage_gb, egress_gb):
    return {
        "training": train_h * train_price * ((1 - spot_share) + spot_share * (1 - spot_discount)),
        "notebooks": notebooks * (174 if auto_stop else 730) * nb_price,
        "endpoint": endpoint_n * 730 * endpoint_price,
        "storage": storage_gb * 0.023,
        "egress": egress_gb * 0.09,
    }

def monthly_bill(*args):
    return sum(_lines(*args).values())

def biggest_line(*args):
    lines = _lines(*args)
    return max(lines, key=lines.get)`,
  explanation:
    'Writing the bill as named lines is the habit the lesson asks for: once every cost has a name and a formula, the biggest line, and therefore the first fix, is a one-liner.',
  tests: `args = (300, 4.0, 0.0, 0.6, 4, 1.2, False, 2, 1.0, 40_000, 2_000)
assert abs(monthly_bill(*args) - 7264) < 1e-6
assert biggest_line(*args) == "notebooks"
stopped = (300, 4.0, 0.0, 0.6, 4, 1.2, True, 2, 1.0, 40_000, 2_000)
assert abs(monthly_bill(*stopped) - 4595.2) < 1e-6
assert biggest_line(*stopped) == "endpoint"
assert abs(monthly_bill(300, 4.0, 1.0, 0.6, 0, 1.2, False, 0, 1.0, 0, 0) - 480) < 1e-6`,
};
