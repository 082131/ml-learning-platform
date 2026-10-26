import type { Exercise, QuizQuestion } from '@/lib/types';

/** Self-assessment: answer these about your own project before you call it done. */
export const questions: QuizQuestion[] = [
  {
    id: 'accuracy',
    type: 'choice',
    prompt:
      'The majority-class baseline scores 0.623 validation accuracy and 0.000 malignant recall. What does that tell you about reporting accuracy alone?',
    options: [
      {
        text: 'Accuracy rewards predicting the common class; the report needs the metric for the class you must not miss',
        correct: true,
        explain:
          'A model that never flags a tumor gets 62% accuracy. Recall for malignant (at a stated precision) is what this system is for.',
      },
      {
        text: 'Nothing: 0.623 is a fine starting point to improve on',
        correct: false,
        explain:
          'It is a useful reference, but it finds no malignant case at all. The metric must make that visible.',
      },
    ],
  },
  {
    id: 'threshold',
    type: 'choice',
    prompt: 'Where should you choose the decision threshold for your final model?',
    options: [
      {
        text: 'On validation data (or cross-validation on the training rows), before looking at the test set',
        correct: true,
        explain:
          'The threshold is a hyperparameter. Choosing it on the test set makes the test result optimistic.',
      },
      {
        text: 'On the test set, so the reported recall is exactly the target',
        correct: false,
        explain:
          'Then the test set has been used for tuning and no longer estimates performance on new data.',
      },
      {
        text: 'Always at 0.5',
        correct: false,
        explain:
          '0.5 is a default, not a decision. The right threshold depends on the cost of each kind of error.',
      },
    ],
  },
  {
    id: 'reproduce',
    type: 'order',
    prompt: 'Order the steps a reviewer follows to reproduce your final numbers.',
    items: [
      'Clone the repository at the tagged commit',
      'Create a virtual environment and install requirements.txt',
      'Run the training script with the recorded seed and config',
      'Run pytest: data checks and model tests pass',
      'Compare the test metrics with the model card',
    ],
    explain: 'If any step needs knowledge that is not written down, the project is not reproducible yet.',
  },
  {
    id: 'interval',
    type: 'numeric',
    prompt:
      'Your test set has 42 malignant cases and the model finds 41 of them. What is the recall, to three decimals?',
    answer: 0.976,
    tolerance: 0.0005,
    hint: 'Recall = found ÷ all malignant cases.',
    explain:
      '41 / 42 = 0.976. One more miss would give 0.952: with this few cases, report an interval as well.',
  },
];

export const thresholdExercise: Exercise = {
  id: 'threshold-for-recall',
  prompt:
    'Write `threshold_for_recall(scores, labels, target)`: the highest threshold (one of the scores) such that flagging every case with score ≥ threshold finds at least `target` of the positive cases.',
  starter: `def threshold_for_recall(scores, labels, target):
    # scores: predicted probability of the positive class (malignant)
    # labels: 1 for positive, 0 for negative
    # Return the highest score t such that recall at "score >= t" is >= target.
    pass`,
  hints: [
    'Count the positives once: `positives = sum(labels)`.',
    'Try candidate thresholds from the highest score down: `sorted(set(scores), reverse=True)`.',
    'For each t, count positives with score ≥ t and return the first t whose recall reaches the target.',
  ],
  solution: `def threshold_for_recall(scores, labels, target):
    positives = sum(labels)
    for t in sorted(set(scores), reverse=True):
        found = sum(1 for s, y in zip(scores, labels) if y == 1 and s >= t)
        if found / positives >= target:
            return t
    return min(scores)`,
  explanation:
    'Lowering the threshold can only add flagged cases, so recall rises as t falls. The highest threshold that reaches the target gives the fewest false alarms for that recall. In the project, compute it on validation data and then report recall and precision at that threshold on the test set.',
  tests: `scores = [0.9, 0.8, 0.7, 0.6, 0.4, 0.3, 0.2]
labels = [1, 1, 0, 1, 0, 1, 0]
got = threshold_for_recall(scores, labels, 0.75)
assert got == 0.6, f"recall 0.75 needs 3 of 4 positives: expected 0.6, got {got}"
assert threshold_for_recall(scores, labels, 1.0) == 0.3, 'recall 1.0 needs the threshold at the lowest positive score'
assert threshold_for_recall(scores, labels, 0.5) == 0.8, 'pick the highest threshold that reaches the target'`,
};
