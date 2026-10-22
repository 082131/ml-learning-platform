import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'which-is-ml',
    type: 'choice',
    prompt: 'Which of these programs is machine learning?',
    options: [
      {
        text: 'A filter whose word scores were computed from 10,000 emails that people had labeled',
        correct: true,
        explain: 'The behavior (the scores) came from labeled examples, not from a person writing the rule.',
      },
      {
        text: 'A filter that blocks every email containing "lottery", from a list an engineer wrote',
        correct: false,
        explain:
          'That is a hand-written rule. It is still AI in the broad sense, but nothing was learned from data.',
      },
      {
        text: 'A calculator that adds up a shopping bill',
        correct: false,
        explain: 'It follows fixed arithmetic. There is no data to learn from and nothing to adjust.',
      },
    ],
  },
  {
    id: 'score',
    type: 'numeric',
    prompt:
      'With the learned scores free = 3, claim = 3, your = 0 and now = 3 (and unknown words scoring 0), what is the score of "claim your free gift now"?',
    answer: 9,
    tolerance: 0,
    hint: 'Add the score of each word. "gift" never appeared in training, so it adds 0.',
    explain: 'claim 3 + your 0 + free 3 + gift 0 + now 3 = 9, which is above the threshold 1: spam.',
  },
  {
    id: 'new-data',
    type: 'choice',
    prompt:
      'The learned filter gets all 10 training emails right but only 4 of the 6 new ones. What does that tell you?',
    options: [
      {
        text: 'Doing well on the training examples does not guarantee doing well on new ones',
        correct: true,
        explain:
          'The new spam uses words such as "winner" and "flights" that the filter never saw. How a model does on new data is what matters, so it is always measured on examples kept out of training.',
      },
      {
        text: 'The program has a bug, because a learned model should be perfect',
        correct: false,
        explain:
          'No model is perfect on new data. With only 10 examples, many spam words were simply never seen.',
      },
      {
        text: 'Hand-written rules are always better',
        correct: false,
        explain:
          'With the keywords "free" and "prize", the rule also gets 4 of 6 new emails right, and it calls the lunch invitation spam. Neither is always better; learned models win when there is plenty of data.',
      },
    ],
  },
  {
    id: 'deep',
    type: 'choice',
    prompt: 'How do AI, machine learning and deep learning relate?',
    options: [
      {
        text: 'Deep learning is part of machine learning, which is part of AI',
        correct: true,
        explain: 'Each is a narrower kind of the one before: AI ⊃ ML ⊃ deep learning.',
      },
      {
        text: 'They are three names for the same thing',
        correct: false,
        explain:
          'A hand-written spam rule is AI but not ML, and the word-score filter is ML but not deep learning.',
      },
      {
        text: 'Machine learning is part of deep learning',
        correct: false,
        explain:
          'It is the other way round: deep learning is machine learning with many-layered neural networks.',
      },
    ],
  },
  {
    id: 'parts',
    type: 'order',
    prompt: 'Put the steps of building the learned spam filter in order.',
    items: [
      'Collect emails and label each one spam or ham',
      'Turn each email into features (its words)',
      'Train: compute a score for every word from the labeled emails',
      'Use the model on a new email: add up its word scores and compare with the threshold',
    ],
    explain:
      'Data first, then features, then training, then inference on new inputs. The same four steps appear in every ML project.',
  },
];

export const scoresExercise: Exercise = {
  id: 'learn-scores',
  prompt:
    'Write `learn_scores(emails)`: for a list of (text, label) pairs, return a dict that gives each word +1 for every spam email it appears in and −1 for every ham email. Count a word once per email.',
  starter: `def learn_scores(emails):
    scores = {}
    # For each email, go through its distinct words and add +1 or -1.
    return scores`,
  hints: [
    'Loop with `for text, label in emails:`, and over the distinct words with `for word in set(text.split()):`.',
    'Pick the change with `1 if label == "spam" else -1`.',
    '`scores.get(word, 0)` returns 0 for a word you have not seen yet: `scores[word] = scores.get(word, 0) + change`.',
  ],
  solution: `def learn_scores(emails):
    scores = {}
    for text, label in emails:
        for word in set(text.split()):
            change = 1 if label == "spam" else -1
            scores[word] = scores.get(word, 0) + change
    return scores`,
  explanation:
    'Training here is counting: words that show up more in spam end up positive, words that show up more in normal email end up negative. The set makes a word count once per email, so one email that repeats a word cannot dominate.',
  tests: `s = learn_scores([("free money", "spam"), ("free lunch", "ham"), ("money money now", "spam")])
assert isinstance(s, dict), 'learn_scores should return a dict'
assert s.get("money") == 2, f'"money" is in 2 spam emails, so its score should be 2, got {s.get("money")}'
assert s.get("free") == 0, f'"free" is in 1 spam and 1 ham email, so its score should be 0, got {s.get("free")}'
assert s.get("lunch") == -1, f'"lunch" is only in 1 ham email, so its score should be -1, got {s.get("lunch")}'
assert s.get("now") == 1, f'"now" should be 1, got {s.get("now")}'
assert learn_scores([]) == {}, 'no emails should give an empty dict'`,
};
