import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'which-split',
    type: 'choice',
    prompt:
      'You try 12 values of a hyperparameter and keep the one with the best score. Which rows should produce that score?',
    options: [
      {
        text: 'The validation rows',
        correct: true,
        explain:
          'Choosing between settings is what the validation set is for. The test set stays untouched so it can still give an unbiased final estimate.',
      },
      {
        text: 'The test rows',
        correct: false,
        explain:
          'Picking the best of 12 by test score tunes the model to the test set. Its score then overstates how the model does on new data, and you have no untouched rows left to check.',
      },
      {
        text: 'The training rows',
        correct: false,
        explain:
          'The model was fitted on those rows, so the score rewards memorizing them. The most flexible setting usually wins on training rows and loses on new data.',
      },
    ],
  },
  {
    id: 'counts',
    type: 'numeric',
    prompt:
      'A dataset has 200 rows. You hold out 15% for validation and 25% for test. How many rows are left for training?',
    answer: 120,
    tolerance: 0,
    hint: 'Work out the two held-out counts first: 200 · 0.15 and 200 · 0.25.',
    explain:
      'Validation 200 · 0.15 = 30 rows, test 200 · 0.25 = 50 rows, so training gets 200 − 30 − 50 = 120.',
  },
  {
    id: 'why-inflated',
    type: 'choice',
    prompt:
      'In the experiment the labels are random, yet with the leak the test accuracy is often above 80%. Why?',
    options: [
      {
        text: 'Among 300 noise features, some happen to line up with the labels of these 60 rows. Choosing them while looking at the test rows picks the ones that happen to fit the test labels.',
        correct: true,
        explain:
          'The features carry no real signal, but chance correlations exist in any finite sample. Selecting on all rows bakes the test rows’ chance pattern into the model.',
      },
      {
        text: 'Nearest centroid is a strong model that finds weak patterns other models miss.',
        correct: false,
        explain:
          'The same model scores about 50% without the leak. There is no pattern to find: the labels were assigned at random.',
      },
      {
        text: 'The test set is too small, so any score is meaningless.',
        correct: false,
        explain:
          'Small test sets make scores noisy in both directions, but noise does not explain a gap that shows up for almost every seed. The mean over 50 splits stays near 50% without the leak and near 80% with it.',
      },
      {
        text: 'The centroids were fitted on the test rows.',
        correct: false,
        explain:
          'In both pipelines the centroids use training rows only. The only difference is which rows the feature selection looks at.',
      },
    ],
  },
  {
    id: 'scaler',
    type: 'choice',
    prompt: 'Which of these is data leakage?',
    options: [
      {
        text: 'Fitting a StandardScaler on the whole dataset, then splitting into train and test',
        correct: true,
        explain:
          'The scaler’s mean and standard deviation now include the test rows, so the test rows influenced the training data. Fit the scaler on the training rows and only transform the others.',
      },
      {
        text: 'Fitting a StandardScaler on the training rows and transforming the test rows with it',
        correct: false,
        explain:
          'This is the correct order: the test rows are transformed with numbers they did not influence.',
      },
      {
        text: 'Shuffling the rows before splitting',
        correct: false,
        explain:
          'Shuffling uses no labels or feature values, so it leaks nothing. (For time-ordered data, shuffling is the wrong split for a different reason: it lets the model train on the future.)',
      },
    ],
  },
  {
    id: 'order',
    type: 'order',
    prompt: 'Put the steps of an honest workflow in order.',
    items: [
      'Split the rows into train, validation and test',
      'Fit preprocessing (scaling, feature selection) on the training rows',
      'Train candidate models and compare them on the validation rows',
      'Score the chosen model once on the test rows',
    ],
    explain:
      'Splitting comes first so that every later fitted number comes from training rows only. The test rows are used last and once.',
  },
];

export const splitExercise: Exercise = {
  id: 'split-rows',
  prompt:
    'Write `split_rows(n, n_val, n_test, seed)` that shuffles the row numbers 0..n−1 with `random.Random(seed)` and returns three lists: train, validation and test.',
  starter: `import random

def split_rows(n, n_val, n_test, seed):
    # Shuffle list(range(n)) with random.Random(seed), then cut it into three parts.
    pass`,
  hints: [
    'Make the rows with `rows = list(range(n))`, then shuffle them in place with `random.Random(seed).shuffle(rows)`.',
    'Training gets `n_train = n - n_val - n_test` rows. Slice: `rows[:n_train]`, `rows[n_train:n_train + n_val]`, `rows[n_train + n_val:]`.',
    'Check the arguments first: if `n_val + n_test >= n`, there is nothing left to train on, so `raise ValueError(...)`.',
  ],
  solution: `import random

def split_rows(n, n_val, n_test, seed):
    if n_val < 0 or n_test < 0 or n_val + n_test >= n:
        raise ValueError(f"can't hold out {n_val} + {n_test} of {n} rows and still train")
    rows = list(range(n))
    random.Random(seed).shuffle(rows)
    n_train = n - n_val - n_test
    return rows[:n_train], rows[n_train:n_train + n_val], rows[n_train + n_val:]`,
  explanation:
    'Shuffling first means each split is a random sample of the rows, even when the file is sorted. Slicing one shuffled list guarantees that no row is in two splits and that every row is in one. A separate Random(seed) object makes the split reproducible without changing Python’s global random state.',
  tests: `train, val, test = split_rows(60, 9, 18, seed=1)
assert (len(train), len(val), len(test)) == (33, 9, 18), 'with 60 rows, 9 validation and 18 test, training should get 33'
assert set(train).isdisjoint(val) and set(train).isdisjoint(test) and set(val).isdisjoint(test), 'a row must never be in two splits'
assert sorted(train + val + test) == list(range(60)), 'every row 0..59 should be in exactly one split'
assert split_rows(60, 9, 18, seed=1) == (train, val, test), 'the same seed should give the same split'
assert split_rows(60, 9, 18, seed=2) != (train, val, test), 'a different seed should shuffle differently'
try:
    split_rows(10, 5, 5, seed=0)
    raised = False
except ValueError:
    raised = True
assert raised, 'holding out all 10 rows leaves nothing to train on: raise ValueError'`,
};
