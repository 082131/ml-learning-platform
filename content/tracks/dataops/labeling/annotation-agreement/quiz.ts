import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'kappa-by-hand',
    type: 'numeric',
    prompt:
      'Two annotators label 100 images as cat or dog. Both say cat on 40, both say dog on 30, A says cat and B dog on 20, A says dog and B cat on 10. What is Cohen’s kappa? Give 2 decimals.',
    answer: 0.4,
    tolerance: 0.005,
    hint: 'p_o = (40 + 30) / 100. A says cat 60 times, B says cat 50 times, so p_e = 0.6 · 0.5 + 0.4 · 0.5.',
    explain:
      'p_o = 0.70. p_e = 0.6·0.5 + 0.4·0.5 = 0.50. κ = (0.70 − 0.50) / (1 − 0.50) = 0.40: only fair-to-moderate agreement, even though they agree on 70% of images.',
  },
  {
    id: 'paradox',
    type: 'choice',
    prompt:
      'On the live stream of comments, a careful annotator and a lazy one who always answers “not toxic” both reach 0.85 observed agreement with annotator A. Why is kappa 0.32 for one and 0.00 for the other?',
    options: [
      {
        text: 'Kappa gives extra weight to the toxic class because it is the class the model must find',
        correct: false,
        explain:
          'Kappa treats both classes symmetrically. The difference comes from chance agreement, not from weighting a class.',
      },
      {
        text: 'The lazy annotator’s chance agreement equals the observed agreement, so nothing is left above chance',
        correct: true,
        explain:
          'Saying “fine” every time agrees with A on every comment A calls fine: 17 of 20. That is exactly p_e = 0.85, so κ = (0.85 − 0.85) / 0.15 = 0.',
      },
      {
        text: 'Kappa penalizes an annotator who disagrees on toxic comments more than one who disagrees on fine comments',
        correct: false,
        explain:
          'Both annotators disagree on three comments. Kappa does not care which class the disagreements fall in, only how far agreement is above chance.',
      },
      {
        text: 'The careful annotator labeled more comments, and kappa grows with the number of items',
        correct: false,
        explain: 'Both labeled the same 20 comments. Kappa is a ratio of shares and does not grow with the count.',
      },
    ],
  },
  {
    id: 'low-kappa-action',
    type: 'choice',
    prompt:
      'A pilot round gives κ = 0.21. You read the disagreements and nearly all are profanity, sarcasm and quoted insults. What do you do first?',
    options: [
      {
        text: 'Replace the annotators, because κ below 0.4 means they are not doing the task properly',
        correct: false,
        explain:
          'The disagreements follow a pattern on specific kinds of comment. That points at unclear instructions, not at careless people.',
      },
      {
        text: 'Add rules and examples for those three cases to the guidelines, then run another pilot',
        correct: true,
        explain:
          'This is what v2 does in the experiment: three edge-case rules raise kappa on the balanced sample from 0.21 to 0.90.',
      },
      {
        text: 'Keep labeling and resolve disagreements later by majority vote with a third annotator',
        correct: false,
        explain:
          'A vote picks whichever private rule two of three people share. The labels would be consistent by accident, not by definition.',
      },
      {
        text: 'Drop the ambiguous comments from the dataset so the remaining labels agree',
        correct: false,
        explain:
          'The model will meet exactly these comments in production. Removing them hides the problem in training and moves it to serving.',
      },
    ],
  },
  {
    id: 'gold-purpose',
    type: 'choice',
    prompt: 'What are gold questions mixed into an annotation job used for?',
    options: [
      {
        text: 'Measuring each annotator’s accuracy on items whose answer is already known',
        correct: true,
        explain:
          'In the consolidation example, gold questions reveal that one annotator clicks “toxic” almost every time, so their votes are dropped.',
      },
      {
        text: 'Training annotators by showing the correct answer right after every item they label',
        correct: false,
        explain:
          'Showing feedback on every item would reveal which items are gold. Gold items work because annotators cannot tell them apart from the rest.',
      },
      {
        text: 'Raising the agreement score, since every annotator agrees on items with a known answer',
        correct: false,
        explain:
          'Agreement on gold items is not guaranteed, and inflating agreement is not the goal. Gold items measure accuracy, which agreement cannot.',
      },
    ],
  },
  {
    id: 'more-annotators',
    type: 'choice',
    prompt:
      'Five annotators each label every item in a sentiment dataset with three classes. Which measure fits best for their overall agreement?',
    options: [
      {
        text: 'Cohen’s kappa between annotator 1 and annotator 2',
        correct: false,
        explain: 'Cohen’s kappa compares exactly two annotators. Picking one pair ignores the other three people.',
      },
      {
        text: 'Raw percent agreement averaged over all pairs',
        correct: false,
        explain:
          'Raw agreement is inflated whenever one class dominates, which is common in sentiment data where “neutral” is frequent.',
      },
      {
        text: 'Fleiss’ kappa or Krippendorff’s alpha',
        correct: true,
        explain:
          'Both are chance-corrected and handle more than two annotators and more than two classes; Krippendorff’s alpha also handles missing labels.',
      },
      {
        text: 'Accuracy of each annotator against the majority vote',
        correct: false,
        explain:
          'The majority vote is built from the same annotators, so this measures conformity with the group, not chance-corrected agreement.',
      },
    ],
  },
  {
    id: 'version-labels',
    type: 'choice',
    prompt:
      'Half of a dataset was labeled under guidelines v1 and half under v2, which changed the rule for sarcasm. What is the safest way to train on it?',
    options: [
      {
        text: 'Train on all of it; the two versions average out',
        correct: false,
        explain:
          'The same kind of comment carries opposite labels depending on when it was labeled. The model learns a coin flip for sarcasm.',
      },
      {
        text: 'Record the guideline version per label, and relabel the affected v1 items before mixing',
        correct: true,
        explain:
          'Only items the rule change touches need relabeling. Storing the guideline version with each label makes finding them a query.',
      },
      {
        text: 'Keep only the v1 labels, since they were collected first',
        correct: false,
        explain: 'v1 is the vaguer definition with lower agreement. Keeping it throws away the better labels.',
      },
    ],
  },
];

export const kappaExercise: Exercise = {
  id: 'cohen-kappa',
  prompt: 'Write `cohen_kappa(a, b)` for two equal-length lists of 0/1 labels.',
  starter: `def cohen_kappa(a, b):
    # a, b: lists of 0/1 labels for the same items, same order.
    # Return (p_o - p_e) / (1 - p_e).
    return sum(x == y for x, y in zip(a, b)) / len(a)`,
  hints: [
    'The starter returns p_o only. You still need p_e from each annotator’s rate of 1s.',
    'p_e = p_a · p_b + (1 − p_a) · (1 − p_b), where p_a = sum(a) / n.',
  ],
  solution: `def cohen_kappa(a, b):
    n = len(a)
    p_o = sum(x == y for x, y in zip(a, b)) / n
    p_a, p_b = sum(a) / n, sum(b) / n
    p_e = p_a * p_b + (1 - p_a) * (1 - p_b)
    return (p_o - p_e) / (1 - p_e)`,
  explanation:
    'Raw agreement rewards agreeing on the common class. Subtracting p_e removes the agreement two random labelers with the same rates would get, and dividing by 1 − p_e scales the result so 1 is perfect.',
  tests: `assert abs(cohen_kappa([1, 1, 0, 0], [1, 1, 0, 0]) - 1.0) < 1e-9, 'identical labels give 1'
assert abs(cohen_kappa([1, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0] * 10)) < 1e-9, 'a constant labeler gives 0'
a = [1] * 40 + [0] * 30 + [1] * 20 + [0] * 10
b = [1] * 40 + [0] * 30 + [0] * 20 + [1] * 10
assert abs(cohen_kappa(a, b) - 0.4) < 1e-9, 'the cat/dog example from the knowledge check'`,
};
