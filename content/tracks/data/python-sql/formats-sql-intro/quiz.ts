import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'where-before-group',
    type: 'numeric',
    prompt:
      "Run SELECT city, SUM(amount) AS total FROM sales WHERE amount >= 15 GROUP BY city on the lesson's table. What is the total for Leeds?",
    answer: 45,
    tolerance: 0,
    hint: 'WHERE removes rows before grouping. Leeds has 30, 15 and 9; which of them pass amount >= 15?',
    explain: 'The 9 is filtered out first, so Leeds is 30 + 15 = 45. Without the filter it would be 54.',
  },
  {
    id: 'order',
    type: 'choice',
    prompt: 'A query has no ORDER BY. What does SQL promise about the order of its rows?',
    options: [
      {
        text: 'Nothing: the database may return them in any order, and the order can change',
        correct: true,
        explain:
          'SQLite happens to return groups sorted by key here, because of how it groups. Another database, or the same one with an index added, may not.',
      },
      {
        text: 'They come back in the order they were inserted',
        correct: false,
        explain:
          'Often true for a small table, but not guaranteed. Code that depends on it breaks later without warning.',
      },
      {
        text: 'They come back sorted by the primary key',
        correct: false,
        explain: 'Only ORDER BY guarantees an order. Write ORDER BY id if you need it.',
      },
    ],
  },
  {
    id: 'clauses',
    type: 'order',
    prompt: 'Put the clauses in the order the database applies them.',
    items: [
      'FROM sales: start from every row of the table',
      'WHERE: keep only the rows that pass the filter',
      'GROUP BY: collapse the kept rows into one row per group',
      'SELECT: compute the output columns, such as SUM(amount)',
      'ORDER BY: sort the result rows',
    ],
    explain:
      'The query is written SELECT first, but it is evaluated from FROM onward. That is why ORDER BY can use the alias total, and WHERE cannot use SUM.',
  },
  {
    id: 'format',
    type: 'choice',
    prompt:
      'A data science team reads 3 of 40 columns from a 50 GB table every day. Which format should the daily export use?',
    options: [
      {
        text: 'Parquet: it is stored column by column, so a reader fetches only the 3 columns it needs, and it keeps the types',
        correct: true,
        explain:
          'Columnar layout plus compression means far fewer bytes read, and no guessing types on every read.',
      },
      {
        text: 'CSV, because every tool can open it',
        correct: false,
        explain: 'Every reader would parse all 40 columns of every row as text, and guess the types again.',
      },
      {
        text: 'JSON Lines, because it is human-readable',
        correct: false,
        explain:
          'It repeats every key on every row: in the lesson it was about five times the size of the Parquet file.',
      },
    ],
  },
  {
    id: 'schema',
    type: 'choice',
    prompt: 'The schema declares amount INTEGER. What does that buy you?',
    options: [
      {
        text: 'Queries can rely on amount being a number, so SUM and comparisons work without converting text',
        correct: true,
        explain:
          'A schema is a contract about every row. (SQLite is lenient and may still store text in an INTEGER column; stricter databases reject it.)',
      },
      {
        text: 'It guarantees that every amount is correct',
        correct: false,
        explain:
          'A type says what kind of value is stored, not whether it is right. 4550 instead of 45.50 is still an integer.',
      },
    ],
  },
];

export const groupExercise: Exercise = {
  id: 'group-totals',
  prompt: 'Write `group_totals(rows, key)`, the plain-Python version of GROUP BY with COUNT and SUM.',
  starter: `def group_totals(rows, key):
    # rows: list of dicts with "city", "product" and "amount"
    # Return a list of (group, count, total) tuples, sorted by group.
    return []`,
  hints: [
    'Use a dict from group value to a running [count, total].',
    'For each row: `g = row[key]`, then add 1 to the count and `row["amount"]` to the total.',
    'Finish with `sorted(...)` over the dict items, building one tuple per group.',
  ],
  solution: `def group_totals(rows, key):
    acc = {}
    for row in rows:
        count, total = acc.get(row[key], (0, 0))
        acc[row[key]] = (count + 1, total + row["amount"])
    return [(g, count, total) for g, (count, total) in sorted(acc.items())]`,
  explanation:
    'This is what the database does for `SELECT key, COUNT(*), SUM(amount) ... GROUP BY key ORDER BY key`: one pass that keeps a running count and sum per group. In a real pipeline let the database do it, close to the data, and pull only the small result into Python.',
  tests: `rows = [
    {"city": "Oslo", "product": "tea", "amount": 12},
    {"city": "Leeds", "product": "coffee", "amount": 30},
    {"city": "Oslo", "product": "coffee", "amount": 25},
    {"city": "Austin", "product": "tea", "amount": 8},
]
assert group_totals(rows, "city") == [("Austin", 1, 8), ("Leeds", 1, 30), ("Oslo", 2, 37)], 'group by city: Oslo is 12 + 25 = 37 from 2 rows'
assert group_totals(rows, "product") == [("coffee", 2, 55), ("tea", 2, 20)], 'the key argument chooses the column to group by'
assert group_totals([], "city") == [], 'no rows gives no groups'`,
};
