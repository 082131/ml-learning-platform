import type { Exercise, QuizQuestion } from '@/lib/types';

/** Self-assessment: answer these about your own pipeline before you call it done. */
export const questions: QuizQuestion[] = [
  {
    id: 'week3-stop',
    type: 'choice',
    prompt:
      'In week 3 ana fails a gold question, and the pipeline then stops with kappa 0.57 between ben and chen, who both passed. What is the best next step?',
    options: [
      {
        text: 'Lower the threshold to 0.55 so that the week’s labels can be used',
        correct: false,
        explain:
          'A threshold moved after seeing the batch is no longer a gate. Change it only for a written reason that applies to every future batch.',
      },
      {
        text: 'Keep only the items where the two annotators agree and publish them',
        correct: false,
        explain:
          'If one of them guessed on part of the batch, agreement on those items is partly chance: a guess matches the right label half the time.',
      },
      {
        text: 'Look at where they disagree, by session and by class, before any of it is published',
        correct: true,
        explain:
          'Split by session, the disagreements point at ben’s first session, where ben was careless and passed the gold questions by luck. The fix may be relabeling that session, retraining an annotator, or clarifying the guidelines.',
      },
      {
        text: 'Add a third annotator to break ties by majority vote',
        correct: false,
        explain:
          'Ana, the obvious third vote, already failed the gold check; and a tie-break hides why agreement fell instead of explaining it.',
      },
    ],
  },
  {
    id: 'gold-passed',
    type: 'choice',
    prompt:
      'In week 3 ben was careless in the first session yet passed both of its gold questions. What does that say about the gold set?',
    options: [
      {
        text: 'Two questions are too few: someone guessing passes both a quarter of the time, so use more and rotate them',
        correct: true,
        explain:
          'With 50% errors, passing two gold items has probability 0.25. Gold checks need enough items to make lucky passes rare.',
      },
      {
        text: 'Gold questions do not work for binary labels, so agreement alone should decide',
        correct: false,
        explain:
          'They work; they just need enough of them. Agreement alone cannot tell which of two disagreeing annotators is wrong.',
      },
      {
        text: 'The gold answers were probably wrong and should be relabeled by the same annotators',
        correct: false,
        explain:
          'Nothing suggests the gold answers are wrong, and gold must be set by experts or adjudication, not by the people it checks.',
      },
    ],
  },
  {
    id: 'erasure-proof',
    type: 'choice',
    prompt:
      'A user asks to be deleted. Which evidence best shows your pipeline handled it?',
    options: [
      {
        text: 'The DELETE statement on the main table reported 3 rows affected',
        correct: false,
        explain:
          'It says nothing about old versions, branches or exports, which still hold the rows until retention or a rewrite removes them.',
      },
      {
        text: 'The request’s log lists every copy, each with a completion time inside the deadline, and a test shows the token is absent from the latest version',
        correct: true,
        explain:
          'Erasure is a process across copies. In the reference run the version ID also changes (418386894193 to ca3037af216e), which ties the deletion to a specific published set.',
      },
      {
        text: 'The person’s email no longer appears anywhere in the training data',
        correct: false,
        explain:
          'The training data never contained the email, only its token. Checking for the email proves nothing; check for the token and every copy.',
      },
    ],
  },
  {
    id: 'version-id',
    type: 'choice',
    prompt:
      'You rebuild last month’s training set from the raw exports and get a different version ID from the one in the model registry. What is the most likely explanation?',
    options: [
      {
        text: 'Hashes are not stable between Python versions',
        correct: false,
        explain:
          'SHA-256 of the same bytes is identical everywhere. Differences come from the bytes: row order, serialization, or the rows themselves.',
      },
      {
        text: 'An input changed since then: an erasure, a relabel, a threshold, or rows serialized in a different order',
        correct: true,
        explain:
          'The ID is a hash of content. Sort rows and keys before hashing so only real changes alter it; then find which input changed.',
      },
      {
        text: 'The model registry truncated the ID when it stored it',
        correct: false,
        explain:
          'Truncation would make the registry ID a prefix of yours, not a different value. Check the content first.',
      },
    ],
  },
  {
    id: 'threshold-source',
    type: 'choice',
    prompt:
      'A reviewer asks where your PSI threshold of 0.25 comes from. Which answer would satisfy a careful reviewer?',
    options: [
      {
        text: 'It is the industry standard for PSI',
        correct: false,
        explain:
          '0.25 is a common rule of thumb, not a standard; it depends on bin count, sample size and how much a shift costs your model.',
      },
      {
        text: 'It is the value that let last month’s batches through',
        correct: false,
        explain:
          'A threshold fitted to pass the batches you already had cannot catch anything like them.',
      },
      {
        text: 'It is the largest PSI we can compute with five bins',
        correct: false,
        explain: 'PSI has no upper limit; it grows without bound as the bin shares diverge.',
      },
      {
        text: 'Our baseline batches vary up to about 0.07 between weeks, and shifts above 0.25 cost measurable accuracy in a backtest',
        correct: true,
        explain:
          'A threshold should rest on the normal variation of your data and on evidence about harm, and be written down with that reason.',
      },
    ],
  },
];

export const consolidateExercise: Exercise = {
  id: 'consolidate',
  prompt: 'Write `consolidate(items, gold)`: find the trusted annotators and keep only the items they label unanimously.',
  starter: `def consolidate(items, gold):
    # items: dict item_id -> dict annotator -> label. gold: dict item_id -> correct label.
    # Return (trusted, labels): trusted is the sorted list of annotators who answer every gold item correctly;
    # labels maps each non-gold item to its label when all trusted annotators agree on it.
    return [], {}`,
  hints: [
    'An annotator is trusted when, for every gold item, their label equals the gold label.',
    'Skip gold items when building labels, and skip items where the trusted annotators give more than one label.',
  ],
  solution: `def consolidate(items, gold):
    annotators = sorted({a for votes in items.values() for a in votes})
    trusted = [a for a in annotators if all(items[i][a] == g for i, g in gold.items())]
    labels = {}
    for i, votes in items.items():
        if i in gold or not trusted:
            continue
        chosen = {votes[a] for a in trusted}
        if len(chosen) == 1:
            labels[i] = chosen.pop()
    return trusted, labels`,
  explanation:
    'This is the reference pipeline’s gold check and unanimity filter. Items the trusted annotators split on are not dropped silently in a real pipeline: they go to an adjudication queue.',
  tests: `items = {
    "g1": {"ana": 1, "ben": 1, "chen": 0},
    "g2": {"ana": 0, "ben": 0, "chen": 0},
    "x1": {"ana": 1, "ben": 1, "chen": 0},
    "x2": {"ana": 0, "ben": 1, "chen": 1},
    "x3": {"ana": 0, "ben": 0, "chen": 1},
}
trusted, labels = consolidate(items, {"g1": 1, "g2": 0})
assert trusted == ["ana", "ben"], 'chen fails gold item g1'
assert labels == {"x1": 1, "x3": 0}, 'x2 is split between the trusted annotators, and gold items are left out'
assert consolidate(items, {"g1": 0}) == (["chen"], {"g2": 0, "x1": 0, "x2": 1, "x3": 1}), 'a single trusted annotator decides alone'
assert consolidate(items, {"g1": 1, "g2": 1}) == ([], {}), 'nobody trusted means nothing is labeled'`,
};
