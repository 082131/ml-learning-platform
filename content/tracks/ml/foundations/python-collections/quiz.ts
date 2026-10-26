import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'slice-basic',
    type: 'choice',
    prompt: 'With `xs = [10, 20, 30, 40, 50]`, what is `xs[1:4]`?',
    options: [
      {
        text: '[20, 30, 40]',
        correct: true,
        explain: 'Positions 1, 2 and 3. The stop position 4 is not included.',
      },
      {
        text: '[10, 20, 30, 40]',
        correct: false,
        explain: 'Positions start at 0, so position 1 is 20, not 10.',
      },
      {
        text: '[20, 30, 40, 50]',
        correct: false,
        explain: 'That would be xs[1:5] or xs[1:]. The stop, 4, is excluded.',
      },
    ],
  },
  {
    id: 'slice-negative',
    type: 'choice',
    prompt: 'With the same `xs`, what is `xs[::-2]`?',
    options: [
      {
        text: '[50, 30, 10]',
        correct: true,
        explain:
          'A negative step walks right to left. With start and stop blank, it starts at the last item and takes every 2nd one.',
      },
      {
        text: '[10, 30, 50]',
        correct: false,
        explain: 'Those are the right items in the wrong order: a negative step goes backwards.',
      },
      {
        text: '[]',
        correct: false,
        explain:
          'Blank bounds adapt to the direction, so a negative step with blank bounds covers the whole list.',
      },
    ],
  },
  {
    id: 'slice-empty',
    type: 'numeric',
    prompt: 'How many items does `xs[3:1]` have?',
    answer: 0,
    tolerance: 0,
    hint: 'With the default step of 1, the slice moves right from position 3. Is position 1 to its right?',
    explain:
      'Moving right from 3 never reaches 1, so the slice is empty: []. Slices never raise an error for bounds like this.',
  },
  {
    id: 'shared-list',
    type: 'choice',
    prompt: '`a = [1, 2, 3]`, `b = a`, `b.append(4)`. What does `print(a)` show?',
    options: [
      {
        text: '[1, 2, 3, 4]',
        correct: true,
        explain:
          'b = a does not copy the list: both names refer to the same list, so appending through b changes what a shows.',
      },
      {
        text: '[1, 2, 3]',
        correct: false,
        explain: 'That is what you get with b = a.copy(), which makes a separate list.',
      },
      {
        text: 'An error',
        correct: false,
        explain: 'Appending to a list is fine; the surprise is only that a sees it too.',
      },
    ],
  },
  {
    id: 'dict-or-list',
    type: 'choice',
    prompt: 'You need the price of a product given its name, for thousands of products. Which fits best?',
    options: [
      {
        text: 'A dict from name to price: prices["apples"]',
        correct: true,
        explain:
          'Looking up a dict key takes about the same time however many keys there are, and the code says what it means.',
      },
      {
        text: 'A list of prices, found by position',
        correct: false,
        explain:
          'You would have to remember which position holds which product, or search the list item by item.',
      },
      {
        text: 'A string with all names and prices',
        correct: false,
        explain: 'You would have to search and parse the text on every lookup.',
      },
    ],
  },
];

export const countsExercise: Exercise = {
  id: 'word-counts',
  prompt:
    'Write `word_counts(words)` that returns a dict from each word in the list `words` to how many times it appears.',
  starter: `def word_counts(words):
    counts = {}
    # Add 1 to the word's count for every word in the list.
    return counts`,
  hints: [
    'Loop with `for w in words:`.',
    '`counts.get(w, 0)` is the count so far, or 0 for a new word.',
    '`counts[w] = counts.get(w, 0) + 1`.',
  ],
  solution: `def word_counts(words):
    counts = {}
    for w in words:
        counts[w] = counts.get(w, 0) + 1
    return counts`,
  explanation:
    'This is the same pattern the spam filter used to learn word scores. Python also has collections.Counter, which does this in one call.',
  tests: `assert word_counts(["free", "money", "free"]) == {"free": 2, "money": 1}, f'got {word_counts(["free", "money", "free"])}'
assert word_counts([]) == {}, 'no words give an empty dict'
assert word_counts(["a"] * 5) == {"a": 5}, 'five times "a" should give {"a": 5}'`,
};
