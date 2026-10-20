import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'scaler-placement',
    type: 'choice',
    prompt:
      'You standardize all 333 rows with StandardScaler, then split into train and test and run cross-validation. What is wrong?',
    options: [
      {
        text: 'The scaler’s mean and standard deviation were computed with the test and validation rows, so information from them leaked into training',
        correct: true,
        explain:
          'Every statistic the model uses must come from training rows only. Putting the scaler inside the pipeline refits it on each training fold.',
      },
      {
        text: 'Nothing: scaling does not look at the labels, so it cannot leak',
        correct: false,
        explain:
          'Leakage is any information from held-out rows, not only labels. The held-out rows’ feature values shifted the mean and standard deviation the model was trained with.',
      },
      {
        text: 'Standardizing is unnecessary for logistic regression',
        correct: false,
        explain:
          'With the default L2 penalty, the penalty depends on the scale of each feature, so unscaled grams and millimetres are penalized unevenly. Scaling matters here; where it happens is the problem.',
      },
    ],
  },
  {
    id: 'accuracy',
    type: 'numeric',
    prompt:
      'The confusion matrix on the 67 test penguins is [[28, 5], [1, 33]] (rows: true female, true male; columns: predicted female, predicted male). What is the accuracy? Give 3 decimals.',
    answer: 0.91,
    tolerance: 0.001,
    hint: 'Correct predictions are on the diagonal.',
    explain: '(28 + 33) / 67 = 61 / 67 = 0.910.',
  },
  {
    id: 'baseline',
    type: 'numeric',
    prompt:
      'The test set has 34 males and 33 females. What accuracy does a baseline that always predicts “male” get? Give 3 decimals.',
    answer: 0.507,
    tolerance: 0.001,
    hint: 'It is right exactly when the penguin is male.',
    explain: '34 / 67 = 0.507. The model’s 0.910 is meaningful only because it is far above this.',
  },
  {
    id: 'compare',
    type: 'choice',
    prompt:
      'Cross-validation gives logistic regression 0.914 ± 0.035 and the random forest 0.910 ± 0.030 (mean ± standard deviation over 5 folds). What should you conclude?',
    options: [
      {
        text: 'They perform about the same; the 0.004 gap is far smaller than the fold-to-fold spread',
        correct: true,
        explain:
          'A difference ten times smaller than the standard deviation across folds could easily flip with another shuffle. Pick on other grounds, such as simplicity or speed.',
      },
      {
        text: 'Logistic regression is better, because 0.914 > 0.910',
        correct: false,
        explain: 'The means differ by less than one fold’s worth of noise, so the ranking is not reliable.',
      },
      {
        text: 'Score both on the test set and keep the winner',
        correct: false,
        explain:
          'Then the test set is used to choose, and its score is no longer an unbiased estimate of the chosen model. Choose with cross-validation, then test once.',
      },
    ],
  },
  {
    id: 'retest',
    type: 'choice',
    prompt:
      'After seeing the test score, you change a feature, retrain and look at the test score again, several times. Why is the final test score now too optimistic?',
    options: [
      {
        text: 'Each look lets the test set influence your choices, so you are slowly fitting it',
        correct: true,
        explain:
          'The test set has become a second validation set. Report the first test score, or set aside a fresh test set.',
      },
      {
        text: 'Retraining makes the model forget the training data',
        correct: false,
        explain:
          'Each fit starts from the training data again; nothing is forgotten. The problem is what you learned from the test set.',
      },
      {
        text: 'It is not; the test rows were never used in fit',
        correct: false,
        explain:
          'fit never saw them, but you did, and your changes were kept because they scored well on those exact rows.',
      },
    ],
  },
  {
    id: 'workflow',
    type: 'order',
    prompt: 'Put the project steps in order.',
    items: [
      'Drop rows without a label',
      'Split off a stratified test set',
      'Compare a baseline and models with cross-validation on the training rows',
      'Refit the chosen pipeline on all training rows',
      'Score it once on the test set and study the errors',
    ],
    explain:
      'Clean what has to be cleaned, lock the test set away, choose using training data only, and look at the test set once at the end.',
  },
];

export const evaluateExercise: Exercise = {
  id: 'evaluate-function',
  prompt:
    'Write `evaluate(y_true, y_pred)` for lists of 0/1 labels (1 is the positive class). Return `(accuracy, precision, recall)` as floats, use 0.0 for precision when nothing is predicted positive, and raise `ValueError` when the lists differ in length.',
  starter: `def evaluate(y_true, y_pred):
    # Count tp, fp, fn and tn, then return (accuracy, precision, recall).
    pass`,
  hints: [
    'Check the lengths first: `if len(y_true) != len(y_pred): raise ValueError(...)`.',
    'Loop over `zip(y_true, y_pred)`: (1, 1) is a true positive, (0, 1) a false positive, (1, 0) a false negative and (0, 0) a true negative.',
    'accuracy = (tp + tn) / n, precision = tp / (tp + fp), recall = tp / (tp + fn). Guard the precision division when tp + fp is 0.',
  ],
  solution: `def evaluate(y_true, y_pred):
    if len(y_true) != len(y_pred):
        raise ValueError(f"{len(y_true)} labels but {len(y_pred)} predictions")
    tp = fp = fn = tn = 0
    for t, p in zip(y_true, y_pred):
        if t == 1 and p == 1:
            tp += 1
        elif t == 0 and p == 1:
            fp += 1
        elif t == 1 and p == 0:
            fn += 1
        else:
            tn += 1
    accuracy = (tp + tn) / len(y_true)
    precision = tp / (tp + fp) if tp + fp else 0.0
    recall = tp / (tp + fn)
    return accuracy, precision, recall`,
  explanation:
    'All three metrics come from the same four counts. Precision asks “of the penguins called male, how many were?”, recall asks “of the male penguins, how many were found?”. scikit-learn returns 0.0 for precision with no positive predictions too (its zero_division default warns and uses 0).',
  tests: `a, p, r = evaluate([1, 0, 1, 1], [1, 1, 1, 0])
assert abs(a - 0.5) < 1e-9, 'accuracy of [1,0,1,1] vs [1,1,1,0] should be 2/4 = 0.5'
assert abs(p - 2 / 3) < 1e-9, 'precision should be tp / (tp + fp) = 2/3'
assert abs(r - 2 / 3) < 1e-9, 'recall should be tp / (tp + fn) = 2/3'
assert evaluate([1, 0], [0, 0]) == (0.5, 0.0, 0.0), 'with no positive predictions, precision should be 0.0'
y_true = [1, 0, 1, 0, 0, 0, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1]
y_pred = [1, 0, 1, 0, 0, 0, 1, 1, 0, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 1, 1, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1]
a, p, r = evaluate(y_true, y_pred)
assert (round(a, 3), round(p, 3), round(r, 3)) == (0.91, 0.868, 0.971), 'on the project test set, expect 0.91, 0.868, 0.971'
try:
    evaluate([1], [1, 0])
    raised = False
except ValueError:
    raised = True
assert raised, 'evaluate should raise ValueError when the lists differ in length'`,
};
