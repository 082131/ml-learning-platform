import { hasColumns, orderIs, rowCount, sameRows } from '@/lib/sql/checks';
import type { SqlExerciseDef } from '@/lib/sql/types';
import type { QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'order-of-eval',
    type: 'order',
    prompt: 'Put the clauses of this query in the order SQL evaluates them: SELECT name FROM products WHERE price > 10 ORDER BY name LIMIT 3.',
    items: ['FROM products', 'WHERE price > 10', 'SELECT name', 'ORDER BY name', 'LIMIT 3'],
    explain: 'Rows first (FROM), then the per-row test (WHERE), then the output columns (SELECT), then sorting the finished rows (ORDER BY), and only then cutting the sorted list (LIMIT).',
  },
  {
    id: 'limit-without-order',
    type: 'choice',
    prompt: 'A colleague writes SELECT name FROM customers LIMIT 3 to get "the first three customers who signed up". What is the real problem?',
    options: [
      { text: 'LIMIT must come before FROM, so the query fails', correct: false, explain: 'LIMIT is written last and the query runs fine. The problem is what it returns.' },
      { text: 'Without ORDER BY, which three rows come back is not defined', correct: true, explain: 'LIMIT cuts whatever order the rows happen to arrive in. It often looks right on a small table and then changes after an index or a reload. ORDER BY signup_date LIMIT 3 says what "first" means.' },
      { text: 'LIMIT 3 returns three random rows every time it runs', correct: false, explain: 'Not random either: the order is just unspecified. It can be stable for months and then change, which is worse than random because nobody notices.' },
      { text: 'LIMIT counts from 0, so it returns four rows', correct: false, explain: 'LIMIT 3 returns at most three rows. OFFSET, not LIMIT, says how many rows to skip.' },
    ],
  },
  {
    id: 'where-before-select',
    type: 'choice',
    prompt: 'In PostgreSQL, SELECT price * 1.2 AS gross FROM products WHERE gross > 30 fails with "column gross does not exist". Why, given that the alias is defined in the same query?',
    options: [
      { text: 'Aliases can only be used inside GROUP BY', correct: false, explain: 'Aliases are usable in ORDER BY in every database, so it is not about GROUP BY.' },
      { text: 'WHERE is evaluated before SELECT, so the alias does not exist yet', correct: true, explain: 'WHERE tests rows before the output columns are computed. Repeat the expression (WHERE price * 1.2 > 30) or compute it in a subquery or CTE first. SQLite accepts the alias as an extension, which is why such queries break when moved to another database.' },
      { text: 'AS is not allowed on calculated columns', correct: false, explain: 'Naming calculated columns is exactly what AS is for.' },
    ],
  },
  {
    id: 'text-compare',
    type: 'choice',
    prompt: "The customers table has Hana with city 'London'. Which condition does NOT find her in SQLite?",
    options: [
      { text: "city = 'london'", correct: true, explain: "= compares text exactly, including case, so 'london' is not 'London'. LIKE ignores the case of ASCII letters in SQLite, which is why the other options match." },
      { text: "city LIKE 'lon%'", correct: false, explain: 'LIKE in SQLite is case-insensitive for ASCII letters by default, and % matches any run of characters, so this matches.' },
      { text: "city IN ('Paris', 'London')", correct: false, explain: "IN is a list of = tests, and 'London' = 'London' is true." },
      { text: "city BETWEEN 'L' AND 'M'", correct: false, explain: "Text compares letter by letter, and 'L' <= 'London' <= 'M', so this matches (surprisingly)." },
    ],
  },
  {
    id: 'date-range',
    type: 'choice',
    prompt: "Dates are stored as text like '2026-02-14'. Why does the lesson filter February with order_date >= '2026-02-01' AND order_date < '2026-03-01' instead of BETWEEN '2026-02-01' AND '2026-02-28'?",
    options: [
      { text: 'BETWEEN is slower on text columns', correct: false, explain: 'Both forms are range tests and use an index the same way.' },
      { text: 'The half-open range still works if the column later holds times or the month has 29 days', correct: true, explain: "'2026-02-28 18:30' is greater than '2026-02-28', so BETWEEN would drop the last evening; and February is not always 28 days. >= start AND < next start is correct for any month and any time precision." },
      { text: 'BETWEEN does not include its end points', correct: false, explain: 'BETWEEN includes both end points. That is part of why it is easy to get wrong at the top of a range.' },
    ],
  },
  {
    id: 'distinct-count',
    type: 'numeric',
    prompt: 'SELECT DISTINCT city FROM customers returns how many rows? (Cities: London, Paris, London, Berlin, Paris, NULL, Berlin, London.)',
    answer: 4,
    tolerance: 0,
    hint: 'DISTINCT keeps one copy of each different value. Is NULL a value it keeps?',
    explain: 'Berlin, London, Paris, and one NULL row: 4. DISTINCT treats all NULLs as one group, even though NULL = NULL is not true. The next lesson explains why NULL behaves differently in different places.',
  },
];

export const exercise: SqlExerciseDef = {
  id: 'mid-priced',
  prompt: 'Return name, category and price of home or stationery products costing from 5 to 15 (both included), most expensive first.',
  dataset: 'shop',
  starter: `SELECT name, category, price
FROM products
-- add the filters and the sort
;`,
  hints: [
    "Two conditions joined with AND: one on category (IN is a short way to write two = tests) and one on price.",
    'BETWEEN 5 AND 15 includes both ends. Most expensive first means ORDER BY price DESC.',
  ],
  solution: `SELECT name, category, price
FROM products
WHERE category IN ('home', 'stationery')
  AND price BETWEEN 5 AND 15
ORDER BY price DESC;`,
  explanation: 'WHERE keeps 3 of the 7 products (Pen set 6.50, Mug 9.00, Poster 12.00): the Notebook is too cheap and the Desk lamp too expensive, and the electronics fail the category test. ORDER BY then sorts the survivors.',
  checks: [
    rowCount(3),
    hasColumns(['name', 'category', 'price']),
    sameRows(['name', 'category', 'price'], "SELECT name, category, price FROM products WHERE category IN ('home', 'stationery') AND price BETWEEN 5 AND 15"),
    orderIs('name', ['Poster', 'Mug', 'Pen set'], 'most expensive first'),
  ],
};
