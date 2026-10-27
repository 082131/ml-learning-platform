import type { Exercise, QuizQuestion } from '@/lib/types';

/** Self-assessment: answer these about your own project before you call it done. */
export const questions: QuizQuestion[] = [
  {
    id: 'shuffle',
    type: 'choice',
    prompt:
      'You take the first 5,000 rows of the IMDb training split without shuffling, and the model reaches 100% training accuracy at once but 50% on evaluation. Why?',
    options: [
      {
        text: 'The split is stored grouped by label: the first 12,500 reviews are all negative, so the subset has only one class',
        correct: true,
        explain: 'Rows 0 to 12,499 are neg and 12,500 onward are pos. Shuffle with a seed before selecting.',
      },
      {
        text: 'The learning rate is too high',
        correct: false,
        explain:
          'A bad learning rate would not give perfect training accuracy at once. Check the label counts of the subset.',
      },
    ],
  },
  {
    id: 'fair',
    type: 'choice',
    prompt: 'The fine-tuned model scores 0.91 and the baseline 0.87. What makes this comparison trustworthy?',
    options: [
      {
        text: 'Both models used the same seeded training and evaluation reviews, and the gap is larger than the bootstrap interval of the difference',
        correct: true,
        explain:
          'Same data and a measure of uncertainty. On 2,000 reviews, a one-point difference can be noise.',
      },
      {
        text: 'The transformer is larger, so it must be better',
        correct: false,
        explain: 'Size is not evidence. The comparison is.',
      },
    ],
  },
  {
    id: 'cost',
    type: 'choice',
    prompt: 'Which belongs in the cost section of your report?',
    options: [
      {
        text: 'Measured training time on a named GPU, peak memory, model size and prediction time, next to the accuracy each model reaches',
        correct: true,
        explain: 'A reader can then decide whether the accuracy gain is worth it for their constraints.',
      },
      {
        text: 'The estimate from the GPU training lesson',
        correct: false,
        explain: 'Use it to plan, then report what you measured.',
      },
    ],
  },
  {
    id: 'smoke',
    type: 'choice',
    prompt: 'Why keep the --smoke mode working after the real run succeeds?',
    options: [
      {
        text: 'It checks every later code change in seconds without a GPU or a download, so breakages show up before an expensive run',
        correct: true,
        explain: 'A smoke test is cheap insurance; it can run in continuous integration.',
      },
      {
        text: 'It measures the model’s accuracy',
        correct: false,
        explain: 'Its tiny random model says nothing about accuracy, only that the code path works.',
      },
    ],
  },
];

export const confidentErrorsExercise: Exercise = {
  id: 'confident-errors',
  prompt:
    'Write `confident_errors(texts, labels, probs, k)`: the k misclassified examples the model was most confident about, as (confidence, text) pairs, most confident first.',
  starter: `def confident_errors(texts, labels, probs, k):
    # probs[i] is the predicted probability of the positive class (label 1).
    # The prediction is 1 when probs[i] >= 0.5. Confidence is the probability of the predicted class.
    # Return the k wrong predictions with the highest confidence, as (confidence, text), highest first.
    pass`,
  hints: [
    'The predicted class is `1 if p >= 0.5 else 0`; its confidence is `p` or `1 - p`.',
    'Keep only the examples where the prediction differs from the label.',
    'Sort by confidence, highest first: `sorted(errors, reverse=True)[:k]`.',
  ],
  solution: `def confident_errors(texts, labels, probs, k):
    errors = []
    for text, label, p in zip(texts, labels, probs):
        pred = 1 if p >= 0.5 else 0
        if pred != label:
            errors.append((p if pred == 1 else 1 - p, text))
    return sorted(errors, reverse=True)[:k]`,
  explanation:
    'Confident mistakes are the most informative errors to read: the model was sure and wrong, which often means sarcasm, a mixed review, a truncated ending or a wrong label. Read them for both models and group them into categories.',
  tests: `texts = ["great", "awful", "not bad at all", "fine", "loved it", "boring"]
labels = [1, 0, 1, 1, 1, 0]
probs = [0.95, 0.10, 0.08, 0.40, 0.70, 0.85]
got = confident_errors(texts, labels, probs, 2)
assert [t for _, t in got] == ["not bad at all", "boring"], f"expected the two most confident mistakes, got {got}"
assert abs(got[0][0] - 0.92) < 1e-9, 'confidence of a predicted 0 is 1 - p'
assert len(confident_errors(texts, labels, probs, 10)) == 3, 'only the 3 misclassified examples are returned'`,
};
