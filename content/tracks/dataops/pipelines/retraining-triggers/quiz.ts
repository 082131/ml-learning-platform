import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'monthly-vs-drift',
    type: 'choice',
    prompt:
      'In the experiment, monthly retraining reaches mean accuracy 0.9071 with 12 runs, and the drift trigger 0.9032 with 5 runs. Why is the drift trigger’s worst week (0.884) so much better than the monthly one’s (0.788)?',
    options: [
      {
        text: 'The drift trigger retrains in week 33, the week of the sudden shift; the schedule waits until week 36',
        correct: true,
        explain:
          'A calendar cannot see the shift. Weeks 33 to 35 run a model trained before it, which costs 0.004 × 30 = 0.12 accuracy.',
      },
      {
        text: 'Retraining less often keeps each model longer, so it has more time to adapt to the data',
        correct: false,
        explain: 'A deployed model does not adapt between retrains; it only ages.',
      },
      {
        text: 'The drift trigger trains on more data per run because it runs less often',
        correct: false,
        explain:
          'In the decay model, accuracy after training depends only on how far the world moved since then, not on the amount of data.',
      },
      {
        text: 'Monthly retraining includes the shifted data too late because of the label delay',
        correct: false,
        explain: 'The schedule does not use labels to decide when to run. Label delay affects only the accuracy trigger.',
      },
    ],
  },
  {
    id: 'label-delay-effect',
    type: 'numeric',
    prompt:
      'A model’s accuracy collapses in week 33. Labels arrive 6 weeks after each prediction, and the accuracy trigger checks every week. In which week can it first fire?',
    answer: 39,
    tolerance: 0,
    hint: 'The labels for week 33 are known in week 33 + 6.',
    explain:
      'Week 39: nothing about week 33 is known before its labels arrive. For six weeks the trigger sees only the healthy weeks before the collapse, so a performance trigger alone always leaves at least a label delay of bad predictions.',
  },
  {
    id: 'concept-drift-trigger',
    type: 'choice',
    prompt:
      'Which trigger can catch concept drift, where the same inputs now need a different answer and input distributions do not move?',
    options: [
      {
        text: 'A drift trigger with a lower threshold',
        correct: false,
        explain: 'The inputs did not move, so any threshold on input drift stays quiet.',
      },
      {
        text: 'A performance trigger on newly labeled data',
        correct: true,
        explain: 'Only labels reveal that the right answers changed. The price is the label delay.',
      },
      {
        text: 'A schedule, because it retrains regardless of signals',
        correct: false,
        explain:
          'A schedule will eventually retrain on the new concept, but it does not detect anything; it may run long after the change.',
      },
    ],
  },
  {
    id: 'gate',
    type: 'choice',
    prompt:
      'In ct_pipeline.py, week 16’s candidate scores 0.760 against production’s 0.790 on the same holdout. What should an automated pipeline do?',
    options: [
      {
        text: 'Promote it anyway, because it was trained on fresher data',
        correct: false,
        explain: 'Fresher is not better if it measures worse on the newest labeled data. That is what the gate is for.',
      },
      {
        text: 'Keep production and record the rejected run with its metrics',
        correct: true,
        explain:
          'The gate protects production from regressions; the record lets someone see whether rejections are noise or a trend.',
      },
      {
        text: 'Retrain again immediately until a candidate beats production',
        correct: false,
        explain:
          'Repeating until one run wins by chance is overfitting to the holdout. A fixed gate with a margin avoids it.',
      },
      {
        text: 'Delete the week 16 data, since it produced a worse model',
        correct: false,
        explain: 'The data passed validation. A worse candidate can come from noise in training or in the small holdout.',
      },
    ],
  },
  {
    id: 'pin-data',
    type: 'choice',
    prompt: 'Why does a continuous-training run start by pinning a data snapshot instead of reading the live table?',
    options: [
      {
        text: 'So validation, training and evaluation all see the same rows, and the model can be traced to an exact version',
        correct: true,
        explain:
          'If rows change mid-run, the validated data is not the trained data. The pinned version is recorded with the registered model.',
      },
      {
        text: 'Because live tables cannot be read by training jobs',
        correct: false,
        explain: 'They can. The problem is that they change while the job runs, and later.',
      },
      {
        text: 'To reduce storage cost, since snapshots are compressed',
        correct: false,
        explain: 'A snapshot is a reference to existing files; it saves nothing and costs almost nothing.',
      },
    ],
  },
  {
    id: 'every-day',
    type: 'choice',
    prompt:
      'A team proposes retraining every day “to be safe”. Retraining costs about $400 a run in compute, plus review time. What is the strongest argument against it?',
    options: [
      {
        text: 'Daily models are always less accurate than weekly ones',
        correct: false,
        explain: 'Not necessarily; under steady drift, fresher models are usually slightly better.',
      },
      {
        text: 'The gain over a drift- or performance-triggered policy is usually small, while cost and the number of deployments to check grow with every run',
        correct: true,
        explain:
          'In the experiment, 12 monthly runs barely beat 5 drift-triggered runs on mean accuracy. Each run is also a release that can go wrong.',
      },
      {
        text: 'A model registry cannot store more than one version per week',
        correct: false,
        explain: 'Registries store as many versions as you register.',
      },
    ],
  },
];

export const triggerExercise: Exercise = {
  id: 'first-trigger-week',
  prompt: 'Write `first_alert(acc_by_week, delay, floor)`: the first week a performance trigger can fire.',
  starter: `def first_alert(acc_by_week, delay, floor):
    # acc_by_week[w] is the true accuracy in week w. Labels for week w are known in week w + delay.
    # Return the first week in which a known accuracy is below floor, or None.
    for w, acc in enumerate(acc_by_week):
        if acc < floor:
            return w
    return None`,
  hints: [
    'The starter returns the week the drop happens, as if labels arrived instantly.',
    'The drop in week w becomes visible in week w + delay. Make sure that week still exists in the list.',
  ],
  solution: `def first_alert(acc_by_week, delay, floor):
    for w, acc in enumerate(acc_by_week):
        if acc < floor and w + delay < len(acc_by_week):
            return w + delay
    return None`,
  explanation:
    'A performance trigger always lags the problem by the label delay. If the drop happens within the last delay weeks of the period, it is not visible at all yet, which is why teams pair it with input drift checks.',
  tests: `acc = [0.92, 0.91, 0.90, 0.80, 0.79, 0.78, 0.78, 0.77]
assert first_alert(acc, 0, 0.85) == 3
assert first_alert(acc, 2, 0.85) == 5, 'the drop in week 3 is seen in week 5'
assert first_alert(acc, 6, 0.85) is None, 'week 3 + 6 = 9 is beyond the 8 weeks'
assert first_alert([0.9, 0.9], 1, 0.85) is None`,
};
