import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'scale-leak',
    type: 'choice',
    prompt:
      'You standardize the features with the mean and standard deviation of all 569 rows before splitting. What is wrong?',
    options: [
      {
        text: 'The test rows influence the scaling, so the test score is no longer a fair estimate for unseen data',
        correct: true,
        explain:
          'Every statistic used in training must come from the training rows only. The effect is often small, but it is a leak.',
      },
      {
        text: 'Nothing: scaling has no learned parameters',
        correct: false,
        explain:
          'The mean and standard deviation are estimated from data, so they carry information about whichever rows they were computed on.',
      },
      {
        text: 'The network cannot learn from standardized features',
        correct: false,
        explain:
          'Standardizing helps gradient descent; the problem is only which rows the statistics come from.',
      },
    ],
  },
  {
    id: 'pick-on-test',
    type: 'choice',
    prompt:
      'You try eight settings and report the one with the best test accuracy. Why is that number optimistic?',
    options: [
      {
        text: 'The test set was used to choose, so the best of eight noisy scores is reported as if it were a fresh measurement',
        correct: true,
        explain: 'Choose on validation, then measure the chosen setting once on test.',
      },
      {
        text: 'It is not optimistic as long as the training set was not used',
        correct: false,
        explain: 'Selecting the maximum of several scores on the same data biases it upwards.',
      },
    ],
  },
  {
    id: 'steps',
    type: 'numeric',
    prompt: 'The training split has 341 rows. How many iterations does one epoch take with batch size 16?',
    answer: 22,
    tolerance: 0,
    hint: 'ceil(341 / 16).',
    explain: '341 / 16 = 21.3, so 22 iterations: 21 full batches of 16 (336 rows) and a last batch of 5.',
  },
  {
    id: 'missed',
    type: 'choice',
    prompt: 'Why report how many malignant tumours were called benign, and not only the accuracy?',
    options: [
      {
        text: 'The two kinds of mistake have very different costs, and accuracy counts them the same',
        correct: true,
        explain:
          'A missed malignant tumour is far worse than a false alarm. The confusion matrix shows both.',
      },
      {
        text: 'Accuracy cannot be computed for binary labels',
        correct: false,
        explain: 'It can; it just hides which mistakes were made.',
      },
    ],
  },
  {
    id: 'logits',
    type: 'choice',
    prompt:
      'Your PyTorch model ends with nn.Linear(16, 1) and you train with nn.BCEWithLogitsLoss. How do you get probabilities for evaluation?',
    options: [
      {
        text: 'torch.sigmoid(model(X)) under torch.no_grad()',
        correct: true,
        explain: 'BCEWithLogitsLoss applies the sigmoid inside the loss, so the model outputs logits.',
      },
      {
        text: 'model(X) already returns probabilities',
        correct: false,
        explain: 'Without a sigmoid layer the outputs are logits: any real number.',
      },
      {
        text: 'Add nn.Sigmoid() to the model and keep BCEWithLogitsLoss',
        correct: false,
        explain: 'Then the sigmoid is applied twice during training and the loss is wrong.',
      },
    ],
  },
];

export const standardizeExercise: Exercise = {
  id: 'standardize',
  prompt:
    'Write `standardize(train, other)` that scales each column of `other` with the mean and standard deviation of the same column of `train`.',
  starter: `def standardize(train, other):
    # train and other are lists of rows (lists of numbers). Use population std (divide by n).
    pass`,
  hints: [
    'Columns: `cols = list(zip(*train))`. For each column, mean = sum / n and std = (sum of squared deviations / n) ** 0.5.',
    'Then return `[[(x - m) / s for x, m, s in zip(row, means, stds)] for row in other]`.',
  ],
  solution: `def standardize(train, other):
    n = len(train)
    cols = list(zip(*train))
    means = [sum(c) / n for c in cols]
    stds = [(sum((x - m) ** 2 for x in c) / n) ** 0.5 for c, m in zip(cols, means)]
    return [[(x - m) / s for x, m, s in zip(row, means, stds)] for row in other]`,
  explanation:
    'The statistics come only from train, so standardize(train, train) has mean 0 and standard deviation 1, while validation and test rows are mapped with the same numbers and are not exactly centred. That is correct: they must be treated like new data. NumPy’s X.std() also divides by n.',
  tests: `train = [[1.0, 10.0], [3.0, 30.0]]
out = standardize(train, train)
assert out == [[-1.0, -1.0], [1.0, 1.0]], f'train columns (mean 2, std 1) and (mean 20, std 10) should map to -1 and 1, got {out}'
assert standardize(train, [[2.0, 40.0]]) == [[0.0, 2.0]], 'other rows must use the training mean and std'
assert standardize([[0.0], [2.0], [4.0]], [[4.0]])[0][0] == (4 - 2) / (8 / 3) ** 0.5, 'use the population standard deviation (divide by n)'`,
};
