import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'why-oof',
    type: 'choice',
    prompt: 'Why must a label audit use out-of-fold predicted probabilities?',
    options: [
      {
        text: 'Out-of-fold probabilities are better calibrated, so the per-class thresholds come out lower',
        correct: false,
        explain:
          'Calibration is a separate property. The issue is that a model scored on its own training rows has seen the label being checked.',
      },
      {
        text: 'A model that trained on an item has learned its label, wrong or not, so it tends to agree with it',
        correct: true,
        explain:
          'In oof.py the 1-NN model scored in-sample agrees with all 4 wrong labels; with 5-fold predictions it disagrees with all 4.',
      },
      {
        text: 'Cross-validation is required by cleanlab’s licence for commercial datasets',
        correct: false,
        explain: 'This is a statistical requirement, not a legal one.',
      },
      {
        text: 'Out-of-fold prediction trains on more data per model than in-sample prediction',
        correct: false,
        explain: 'Each fold model trains on less data (4/5 of it with 5 folds), not more.',
      },
    ],
  },
  {
    id: 'threshold-calc',
    type: 'numeric',
    prompt:
      'Items labeled “dog” get out-of-fold P(dog) of 0.9, 0.7, 0.6 and 0.4. What is the per-class threshold for dog? Give 2 decimals.',
    answer: 0.65,
    tolerance: 0.005,
    hint: 'Average the probability of dog over the items labeled dog.',
    explain:
      '(0.9 + 0.7 + 0.6 + 0.4) / 4 = 0.65. An item labeled cat with P(dog) ≥ 0.65 would be flagged as a likely dog.',
  },
  {
    id: 'fixed-fp',
    type: 'choice',
    prompt:
      'At a fixed cut-off of 0.5, items 17 and 20 (labeled dog, P(dog) 0.48 and 0.45) are flagged, but their labels are right. Why does the per-class method leave them alone?',
    options: [
      {
        text: 'Their probability of cat, 0.52 and 0.55, is below the cat threshold of 0.719',
        correct: true,
        explain:
          'The model is often unsure about cats, but an average cat gets 0.719. These two do not look like typical cats, so there is no evidence the label is wrong.',
      },
      {
        text: 'Per-class thresholds never flag items labeled with the rarer class',
        correct: false,
        explain: 'They do: item 22, labeled dog with P(dog) = 0.18, is flagged and is really a cat.',
      },
      {
        text: 'Their P(dog) is above the dog threshold, which proves the label is right',
        correct: false,
        explain:
          '0.48 and 0.45 are below the dog threshold of 0.499. Not reaching another class’s threshold is what keeps them unflagged.',
      },
      {
        text: 'Per-class thresholds use expert labels, which say these two are dogs',
        correct: false,
        explain: 'The audit never looks at expert labels; they are only used afterwards to score it.',
      },
    ],
  },
  {
    id: 'recall-calc',
    type: 'numeric',
    prompt:
      'An audit flags 40 items in a dataset that, by expert review, has 50 wrong labels. 30 of the flagged items are really wrong. What is its recall?',
    answer: 0.6,
    tolerance: 0.001,
    hint: 'Recall = wrong labels found ÷ all wrong labels.',
    explain: '30 / 50 = 0.60. Its precision is 30 / 40 = 0.75.',
  },
  {
    id: 'what-to-do',
    type: 'choice',
    prompt: 'cleanlab flags 2% of a medical-imaging dataset. What do you do with the flagged images?',
    options: [
      {
        text: 'Delete them, since a 2% loss of data does not matter',
        correct: false,
        explain:
          'Flags are suspicions, not verdicts, and many flagged images are the rare, hard cases the model most needs.',
      },
      {
        text: 'Replace each label with the model’s prediction',
        correct: false,
        explain:
          'That teaches the model its own mistakes. In the experiment at a 0.5 cut-off, 2 of 6 flagged labels were actually right.',
      },
      {
        text: 'Send them to expert review, most suspicious first, and record each decision as a new dataset version',
        correct: true,
        explain:
          'Review fixes real errors, keeps right labels, and the versioned record explains later why the dataset changed.',
      },
    ],
  },
  {
    id: 'test-noise',
    type: 'choice',
    prompt:
      'Why do label errors in the test set matter even more than in the training set when choosing between two models?',
    options: [
      {
        text: 'They change the ranking of models: a model that learned the true rule can be scored below one that copies annotator mistakes',
        correct: true,
        explain:
          'Studies of popular benchmarks found test-set label errors large enough to reverse which model looked best.',
      },
      {
        text: 'Test errors leak into training through the optimizer',
        correct: false,
        explain: 'The test set is not used for training, so its labels cannot leak through the optimizer.',
      },
      {
        text: 'Test sets are smaller, so each wrong label lowers every model’s score by the same large amount',
        correct: false,
        explain:
          'If every model lost the same amount, the ranking would not change. Errors hurt because they favour some models over others.',
      },
    ],
  },
];

export const thresholdExercise: Exercise = {
  id: 'per-class-flags',
  prompt: 'Write `flag_issues(labels, p_one)` that returns the indices confident learning would flag, for two classes.',
  starter: `def flag_issues(labels, p_one):
    # labels: list of 0/1 given labels. p_one: list of out-of-fold P(class 1), same order.
    # Thresholds: t0 = mean of (1 - p) over items labeled 0, t1 = mean of p over items labeled 1.
    # Flag item i if the most probable class among those reaching their threshold differs from labels[i].
    return [i for i, (y, p) in enumerate(zip(labels, p_one)) if (p if y else 1 - p) < 0.5]`,
  hints: [
    'Compute t = [t0, t1] first, from the items labeled 0 and labeled 1 separately.',
    'For each item, probs = [1 - p, p]; keep the classes c with probs[c] >= t[c], then take the one with the larger probability.',
  ],
  solution: `def flag_issues(labels, p_one):
    zeros = [1 - p for y, p in zip(labels, p_one) if y == 0]
    ones = [p for y, p in zip(labels, p_one) if y == 1]
    t = [sum(zeros) / len(zeros), sum(ones) / len(ones)]
    flagged = []
    for i, (y, p) in enumerate(zip(labels, p_one)):
        probs = [1 - p, p]
        confident = [c for c in (0, 1) if probs[c] >= t[c]]
        if confident and max(confident, key=lambda c: probs[c]) != y:
            flagged.append(i)
    return flagged`,
  explanation:
    'The starter is the fixed 0.5 cut-off. It also flags item 5 in the tests, a correctly labeled but low-confidence class-1 item, because the model is unsure about class 1 in general. Per-class thresholds compare each item with what is normal for its class.',
  tests: `labels = [0, 0, 0, 0, 1, 1, 1, 0]
p_one = [0.1, 0.2, 0.1, 0.3, 0.6, 0.45, 0.55, 0.62]
# t0 = mean(0.9, 0.8, 0.9, 0.7, 0.38) = 0.736, t1 = mean(0.6, 0.45, 0.55) = 0.533
assert flag_issues(labels, p_one) == [7], flag_issues(labels, p_one)
assert flag_issues([0, 0, 1, 1], [0.1, 0.2, 0.8, 0.9]) == [], 'a clean dataset has no flags'`,
};
