import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'add-cancel',
    type: 'choice',
    prompt:
      'With refund_word, money_back, how_question and thanks on, 11 tickets get weak labels at 0.91 accuracy. Turning cancel on gives 12 tickets at 0.83. What happened?',
    options: [
      {
        text: 'cancel labeled one new ticket correctly, but its wrong vote on “Cancel my subscription please” now decides that ticket',
        correct: false,
        explain:
          'That ticket had no votes before, so cancel’s wrong vote labels it, and it is the new ticket, not a correct one. Look at which ticket gains a label.',
      },
      {
        text: 'cancel’s only new ticket is labeled wrong, and its correct votes land on tickets that were already labeled',
        correct: true,
        explain:
          'cancel fires on three tickets. Two already had a correct majority. The third, “Cancel my subscription please”, had no votes and is now labeled yes, wrongly: 10 right out of 12.',
      },
      {
        text: 'cancel changed the gold labels of two tickets, so the accuracy was measured against different answers',
        correct: false,
        explain: 'Gold labels are fixed. Labeling functions only add votes.',
      },
      {
        text: 'cancel created a tie on two tickets that were labeled right before, so they became unlabeled',
        correct: false,
        explain:
          'The count of labeled tickets went up, from 11 to 12. A new tie would lower it. Both tickets cancel shares with others get more yes votes, not ties.',
      },
    ],
  },
  {
    id: 'coverage-calc',
    type: 'numeric',
    prompt:
      'A labeling function fires on 240 of 2,000 unlabeled tickets. On a gold set, it fired 30 times and was right 27 times. What is its estimated accuracy, as a decimal?',
    answer: 0.9,
    tolerance: 0.001,
    hint: 'Accuracy is measured where the function voted, on the gold set.',
    explain:
      '27 / 30 = 0.90. Its coverage is 240 / 2,000 = 0.12. The two numbers answer different questions: how often it speaks, and how often it is right when it does.',
  },
  {
    id: 'label-model',
    type: 'choice',
    prompt: 'What does a label model (as in Snorkel) add over a plain majority vote of labeling functions?',
    options: [
      {
        text: 'It weights each function by an estimated accuracy, learned from how the functions agree and disagree',
        correct: true,
        explain:
          'Without gold labels for every item, it infers which functions are reliable from their overlaps and conflicts, then outputs probabilistic labels.',
      },
      {
        text: 'It removes the need for any gold labels, including for evaluating the final classifier',
        correct: false,
        explain:
          'The label model can be fit without gold labels, but you still need a gold set to check the functions and the final model.',
      },
      {
        text: 'It replaces the labeling functions with a neural network that reads the raw tickets',
        correct: false,
        explain:
          'The label model only sees the label matrix of votes, never the raw text. A separate classifier is trained on its output.',
      },
      {
        text: 'It guarantees every example receives a label, since abstentions count as negative votes',
        correct: false,
        explain:
          'Examples where every function abstains still have no information. Treating abstain as “no” would bias the labels.',
      },
    ],
  },
  {
    id: 'why-train-classifier',
    type: 'choice',
    prompt:
      'If the labeling functions already label tickets, why train a classifier on the weak labels instead of just running the functions in production?',
    options: [
      {
        text: 'Running Python functions in production is not allowed by most serving platforms',
        correct: false,
        explain: 'Rules run in production all the time. The reason is about what a learned model can do that rules cannot.',
      },
      {
        text: 'The classifier generalizes beyond the keywords, so it can label tickets where every function abstains',
        correct: true,
        explain:
          '“Please reverse the payment” matches no rule, but a classifier trained on weak labels can learn that it resembles refund requests.',
      },
      {
        text: 'The classifier is always more accurate than the functions on the tickets they cover',
        correct: false,
        explain:
          'Not always. On covered tickets, a precise rule can beat the classifier. The gain comes on tickets the rules do not cover.',
      },
    ],
  },
  {
    id: 'uncertainty-risk',
    type: 'choice',
    prompt:
      'In active.py, uncertainty sampling reaches a threshold error of 0.0011 after 8 labels, against 0.0611 for random sampling. When does uncertainty sampling tend to disappoint in real projects?',
    options: [
      {
        text: 'When the unlabeled pool is large, because ranking every item by uncertainty is too slow',
        correct: false,
        explain:
          'Scoring a pool is one batch prediction; it is rarely the bottleneck. The problem is which items get picked, not how long it takes.',
      },
      {
        text: 'When labels near the boundary are noisy or ambiguous, so it keeps buying labels that teach the model little',
        correct: true,
        explain:
          'The most uncertain items are often the ambiguous ones annotators also disagree on. Mixing in random samples and checking agreement helps.',
      },
      {
        text: 'When the model is a classifier with only two classes, because uncertainty needs three or more',
        correct: false,
        explain: 'The example is a two-class problem; uncertainty is the distance of the probability from 0.5.',
      },
      {
        text: 'When labels are cheap, because active learning then costs more labels than random sampling',
        correct: false,
        explain:
          'Active learning does not use more labels than random sampling with the same budget. Cheap labels just make the savings less important.',
      },
    ],
  },
  {
    id: 'pick-strategy',
    type: 'choice',
    prompt:
      'You must label 2 million product reviews by sentiment in two weeks. Two experts are available, and an older sentiment model exists. Which plan fits best?',
    options: [
      {
        text: 'The experts label reviews in random order until the deadline',
        correct: false,
        explain:
          'Two people cannot label more than a tiny fraction of 2 million reviews, and random order spends their time on easy cases.',
      },
      {
        text: 'Use the old model’s predictions as the final labels for every review',
        correct: false,
        explain:
          'That trains a new model to copy the old one’s mistakes. Its predictions are a useful source, not a replacement for checking.',
      },
      {
        text: 'Weak labels from rules plus the old model, a gold set from the experts, and active learning for the rest',
        correct: true,
        explain:
          'Cheap sources give coverage, the experts give a gold set to measure them, and active learning spends the remaining expert time on the most useful reviews.',
      },
    ],
  },
];

export const weakLabelExercise: Exercise = {
  id: 'weak-label',
  prompt: 'Write `weak_label(votes)`: majority vote over labeling-function outputs, with abstentions and ties.',
  starter: `def weak_label(votes):
    # votes: list of 1, 0 or None (None = the function abstained).
    # Return 1 or 0 by majority among the non-None votes, or None if there are none or they tie.
    return 1 if votes.count(1) >= votes.count(0) else 0`,
  hints: [
    'Ignore None values: count only the 1s and the 0s.',
    'Equal counts, including 0 and 0 when everyone abstained, mean no label: return None.',
  ],
  solution: `def weak_label(votes):
    ones, zeros = votes.count(1), votes.count(0)
    if ones == zeros:
        return None
    return 1 if ones > zeros else 0`,
  explanation:
    'The starter turns every tie and every all-abstain row into a 1, so tickets nobody voted on become refund requests. Returning None keeps them in the queue for a person instead.',
  tests: `assert weak_label([1, None, 1, 0]) == 1
assert weak_label([0, 0, None]) == 0
assert weak_label([None, None]) is None, 'all functions abstained'
assert weak_label([1, 0]) is None, 'a tie is not a label'
assert weak_label([]) is None`,
};
