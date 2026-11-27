import { hasColumns, orderIs, rowCount, sameRows } from '@/lib/sql/checks';
import type { SqlExerciseDef } from '@/lib/sql/types';
import type { QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'what-step-sees',
    type: 'choice',
    prompt: 'In WITH RECURSIVE team AS (anchor UNION ALL step), which rows of team does the step read in each iteration?',
    options: [
      { text: 'Only the rows added by the previous iteration', correct: true, explain: 'That is why the walk moves one level at a time: step 1 sees Rosa and finds Sam and Tara; step 2 sees only Sam and Tara and finds Uma, Vic and Wen. If the step saw every row so far, it would find Sam and Tara again and again.' },
      { text: 'Every row found so far', correct: false, explain: 'Then each iteration would re-find the earlier levels and the query would never stop.' },
      { text: 'Only the anchor rows', correct: false, explain: 'Then the walk could only go one level deep.' },
    ],
  },
  {
    id: 'when-stop',
    type: 'choice',
    prompt: 'What makes a recursive CTE stop?',
    options: [
      { text: 'An iteration whose step returns no new rows', correct: true, explain: 'In the org chart that happens when the last level (Xia) has no reports. In the counter it happens when WHERE i < 5 is false for the last row. No new rows, nothing to feed the next step, so it ends.' },
      { text: 'Reaching the number of rows in the base table', correct: false, explain: 'The database does not know how many rows the answer should have; a counter can generate millions of rows from a table with none.' },
      { text: 'A built-in depth limit of 100 levels', correct: false, explain: 'SQLite and PostgreSQL have no default depth limit; a recursion without a stop condition runs until it is killed (here, by the 10-second watchdog).' },
    ],
  },
  {
    id: 'levels',
    type: 'numeric',
    prompt: 'Starting the "down" walk from Sam, how many iterations run, counting the anchor and the final empty step?',
    answer: 4,
    tolerance: 0,
    hint: 'Sam → his reports → their reports → ...',
    explain: 'Anchor: Sam. Step 1: Uma and Vic. Step 2: Xia (Uma’s report). Step 3: no one reports to Xia, so it adds nothing and the recursion stops. 4 iterations, 4 rows.',
  },
  {
    id: 'spine-why',
    type: 'choice',
    prompt: 'Why does the February report use a generated list of dates LEFT JOINed to orders, instead of GROUP BY order_date on orders?',
    options: [
      { text: 'GROUP BY on orders only has rows for days that had orders, so 22 zero days would be missing', correct: true, explain: 'A chart drawn from the grouped orders alone would connect 3 February to 5 February as if 4 February never happened. The date spine supplies every day; COUNT(o.id) turns the unmatched days into 0.' },
      { text: 'GROUP BY cannot group text dates', correct: false, explain: 'It can; dates stored as text group like any other value.' },
      { text: 'The spine makes the query faster', correct: false, explain: 'It does more work, not less; it exists for correctness of the report.' },
    ],
  },
  {
    id: 'cycle',
    type: 'choice',
    prompt: 'A data-entry error makes Uma the manager of Sam while Sam is still Uma’s manager. What does the "down" walk starting from Sam do?',
    options: [
      { text: 'It finds Uma and Vic, then Sam and Xia, then Uma and Vic again, forever, unless something limits it', correct: true, explain: 'UNION ALL keeps adding the same people at ever higher levels, because each iteration feeds the next. Guard real hierarchies with a depth limit (WHERE level < 50), a visited-path check, or PostgreSQL’s CYCLE clause. Here the 10-second watchdog would stop it.' },
      { text: 'It stops after one loop, because Sam was already found', correct: false, explain: 'UNION ALL does not remember which rows it has seen. UNION (without ALL) removes exact duplicate rows, which only helps if the rows are identical, and a level or path column makes them different.' },
      { text: 'SQLite detects the cycle and raises an error', correct: false, explain: 'Neither SQLite nor PostgreSQL detects cycles unless you ask (PostgreSQL 14+ has a CYCLE clause).' },
    ],
  },
];

export const exercise: SqlExerciseDef = {
  id: 'march-week',
  prompt: 'Return one row per day from 2026-03-01 to 2026-03-07 (7 rows) with day and orders (the number of orders placed that day, 0 if none), in date order.',
  dataset: 'shop',
  starter: `SELECT order_date AS day, COUNT(*) AS orders
FROM orders
WHERE order_date BETWEEN '2026-03-01' AND '2026-03-07'
GROUP BY order_date
ORDER BY day;`,
  hints: [
    'The starter only returns days that had orders (2). Generate the 7 days with WITH RECURSIVE first.',
    "Anchor: SELECT '2026-03-01'. Step: SELECT date(day, '+1 day') FROM days WHERE day < '2026-03-07'. Then LEFT JOIN orders and COUNT(o.id).",
  ],
  solution: `WITH RECURSIVE days(day) AS (
  SELECT '2026-03-01'
  UNION ALL
  SELECT date(day, '+1 day') FROM days WHERE day < '2026-03-07'
)
SELECT d.day, COUNT(o.id) AS orders
FROM days AS d
LEFT JOIN orders AS o ON o.order_date = d.day
GROUP BY d.day
ORDER BY d.day;`,
  explanation: 'The spine has all 7 days. Orders 110 (2 March) and 111 (4 March) match, so those days count 1 and the other 5 days count 0. COUNT(o.id) rather than COUNT(*) is what turns an unmatched day into 0.',
  checks: [
    rowCount(7, 'one row per day'),
    hasColumns(['day', 'orders']),
    sameRows(['day', 'orders'], "WITH RECURSIVE d(day) AS (SELECT '2026-03-01' UNION ALL SELECT date(day, '+1 day') FROM d WHERE day < '2026-03-07') SELECT d.day, (SELECT COUNT(*) FROM orders o WHERE o.order_date = d.day) AS orders FROM d", 'every day has the right count'),
    orderIs('day', ['2026-03-01', '2026-03-02', '2026-03-03', '2026-03-04', '2026-03-05', '2026-03-06', '2026-03-07'], 'in date order'),
  ],
};
