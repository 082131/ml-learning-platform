import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'which-fix',
    type: 'choice',
    prompt:
      'In the experiment, a 1-NN model trained on 200 examples with 30% wrong labels scores 0.603. Which single change raises test accuracy the most?',
    options: [
      {
        text: 'Collect 1,400 more examples labeled the same way',
        correct: false,
        explain:
          'At 1,600 examples and the same noise the score is 0.718. Every new example arrives with the same 30% chance of a wrong label, so 1-NN copies the errors along with the signal.',
      },
      {
        text: 'Keep the 200 examples and fix labels until 10% are wrong',
        correct: true,
        explain:
          'That cell scores 0.902 with no new data at all. Cleaning labels removes the wrong regions that 1-NN would otherwise copy.',
      },
      {
        text: 'Keep everything and add a second test set',
        correct: false,
        explain:
          'A second test set improves how precisely you measure accuracy, not the accuracy itself. The model and its training data are unchanged.',
      },
      {
        text: 'Collect 200 more examples labeled the same way',
        correct: false,
        explain: 'That cell scores 0.630: a small gain, because the new examples are just as noisy.',
      },
    ],
  },
  {
    id: 'clean-test',
    type: 'choice',
    prompt:
      'Why does the experiment score every model on a test set with correct labels, even though the training labels are noisy?',
    options: [
      {
        text: 'So the score measures how well the model learned the true rule, not how well it copies annotator mistakes',
        correct: true,
        explain:
          'If the test labels were noisy too, a perfect model would be marked wrong on every noisy test example, and differences between models would shrink or flip.',
      },
      {
        text: 'Because k-nearest neighbours cannot make predictions on points with noisy labels',
        correct: false,
        explain:
          'Prediction never looks at the test label. The label is only used afterwards, to score the prediction.',
      },
      {
        text: 'Because a clean test set makes the model train faster and use less memory',
        correct: false,
        explain: 'The test set is not used for training at all, so it cannot change training speed or memory.',
      },
    ],
  },
  {
    id: 'k-robust',
    type: 'choice',
    prompt:
      'With 30% wrong labels, changing from 1-NN to 15-NN raises accuracy on 200 examples from 0.603 to 0.855. What explains it?',
    options: [
      {
        text: '15 neighbours make the model memorize the training labels more precisely',
        correct: false,
        explain:
          'It is the reverse: 1-NN memorizes every training label, including the wrong ones. 15-NN averages over a neighbourhood.',
      },
      {
        text: 'A wrong label is usually outvoted by correct neighbours, so isolated errors stop creating wrong regions',
        correct: true,
        explain:
          'With noise below 50%, most of any 15 neighbours carry the correct class. The vote recovers it, except near the boundary.',
      },
      {
        text: '15-NN ignores the training labels and uses only the distances between points',
        correct: false,
        explain: 'The prediction is the majority of the neighbours’ labels, so labels still decide it.',
      },
      {
        text: 'Larger k lowers the noise level in the training data before training',
        correct: false,
        explain:
          'The training data is identical in both cells: the same 68 flipped labels. Only the model changed.',
      },
    ],
  },
  {
    id: 'lifecycle-order',
    type: 'order',
    prompt: 'Put the stages of the ML data lifecycle in the order a new dataset first goes through them.',
    items: [
      'Collect raw examples',
      'Label them',
      'Validate the batch against a schema and baseline',
      'Version the dataset snapshot',
      'Train and evaluate a model',
      'Monitor production data for drift',
    ],
    explain:
      'Labels come before validation of the labeled batch, and the dataset is versioned before training so the model can be traced back to it. Monitoring production data closes the loop and decides when to collect and label again.',
  },
  {
    id: 'audit-precision',
    type: 'numeric',
    prompt:
      'The neighbour-disagreement audit flagged 76 labels, and 73 of them were really wrong. What share of the flagged labels were wrong (its precision)? Answer as a decimal with 2 digits.',
    answer: 0.96,
    tolerance: 0.005,
    hint: 'Precision is really wrong ÷ flagged.',
    explain:
      '73 / 76 = 0.96. High precision means reviewers rarely waste time. The audit found 73 of the 134 wrong labels, so its recall is 73 / 134 ≈ 0.54: about half the errors stay hidden.',
  },
  {
    id: 'when-model',
    type: 'choice',
    prompt:
      'Labels have been reviewed twice and an audit finds almost no errors, yet validation accuracy has stopped improving as data grows. What is the most reasonable next step?',
    options: [
      {
        text: 'Run another full relabeling round, since data work always pays more than model work',
        correct: false,
        explain:
          'Data-centric does not mean data-only. When the labels are already clean, another round costs money and changes little.',
      },
      {
        text: 'Look at the model: its capacity or features may now be the limit',
        correct: true,
        explain:
          'A flat learning curve with clean labels points at the model: underfitting, missing features, or the wrong inductive bias.',
      },
      {
        text: 'Collect ten times more data, because a flat learning curve means the model needs more examples',
        correct: false,
        explain:
          'A flat curve means extra data of the same kind is not helping. More of it is unlikely to help either.',
      },
    ],
  },
];

export const knnExercise: Exercise = {
  id: 'knn-vote',
  prompt: 'Write `knn_predict(train, x, y, k)`: the majority label among the k training points nearest to (x, y).',
  starter: `def knn_predict(train, x, y, k):
    # train: list of (x, y, label) with label 0 or 1; k is odd, so there are no ties.
    # Return the majority label among the k points closest to (x, y).
    nearest = min(train, key=lambda p: (p[0] - x) ** 2 + (p[1] - y) ** 2)
    return nearest[2]`,
  hints: [
    'Sort the whole list by squared distance and keep the first k: sorted(train, key=...)[:k].',
    'With labels 0 and 1, the sum of the k labels is the number of votes for class 1. Class 1 wins when that is more than k / 2.',
  ],
  solution: `def knn_predict(train, x, y, k):
    nearest = sorted(train, key=lambda p: (p[0] - x) ** 2 + (p[1] - y) ** 2)[:k]
    return int(2 * sum(p[2] for p in nearest) > k)`,
  explanation:
    'The starter is 1-NN: one wrong neighbour decides. With k neighbours, a single wrong label near (x, y) is outvoted as long as most neighbours are right, which is why 15-NN tolerated label noise better in the experiment.',
  tests: `train = [(0.0, 0.0, 0), (0.1, 0.0, 1), (0.0, 0.1, 0), (0.1, 0.1, 0), (1.0, 1.0, 1), (0.9, 1.0, 1), (1.0, 0.9, 1)]
assert knn_predict(train, 0.09, 0.0, 1) == 1, 'k=1 copies the nearest label, even a wrong one'
assert knn_predict(train, 0.09, 0.0, 3) == 0, 'with k=3 the two class-0 neighbours outvote it'
assert knn_predict(train, 0.95, 0.95, 3) == 1
assert knn_predict(train, 0.5, 0.5, 7) == 1, 'all seven vote: four 1s against three 0s'`,
};
