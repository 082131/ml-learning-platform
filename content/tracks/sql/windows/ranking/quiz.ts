import { hasColumns, rowCount, sameRows } from '@/lib/sql/checks';
import type { SqlExerciseDef } from '@/lib/sql/types';
import type { QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'rows-out',
    type: 'choice',
    prompt: 'order_totals has 12 rows in 3 months. How many rows do SELECT month, SUM(total) FROM order_totals GROUP BY month and SELECT month, SUM(total) OVER (PARTITION BY month) FROM order_totals return?',
    options: [
      { text: '3 and 12', correct: true, explain: 'GROUP BY collapses each month into one row. A window function computes the same month sum but attaches it to every row, so all 12 stay. That is the whole difference: same buckets, but the window keeps the detail.' },
      { text: '3 and 3', correct: false, explain: 'PARTITION BY splits rows into windows but does not collapse them.' },
      { text: '12 and 12', correct: false, explain: 'GROUP BY month returns one row per month.' },
    ],
  },
  {
    id: 'rank-after-tie',
    type: 'numeric',
    prompt: 'Scores in descending order: 90, 85, 85, 85, 70. What RANK() does the 70 get?',
    answer: 5,
    tolerance: 0,
    hint: 'RANK counts how many rows come strictly before, plus 1.',
    explain: 'Four rows score higher than 70 (90 and three 85s), so its rank is 4 + 1 = 5. DENSE_RANK would give 3, because it counts distinct higher values (90 and 85). ROW_NUMBER also gives 5, but would number the three 85s 2, 3, 4 in an unspecified order.',
  },
  {
    id: 'which-rank',
    type: 'choice',
    prompt: 'A prize goes to "every salesperson in the top 3 sales amounts", and two people tie for second place. Which function picks the winners fairly?',
    options: [
      { text: 'DENSE_RANK() <= 3, because it gives ties the same number and still reaches the third-highest amount', correct: true, explain: 'With amounts 100, 90, 90, 80, DENSE_RANK gives 1, 2, 2, 3: four winners, everyone with one of the top 3 amounts. RANK gives 1, 2, 2, 4 and leaves the 80 out; ROW_NUMBER gives 1, 2, 3, 4 and arbitrarily drops one of the tied people.' },
      { text: 'ROW_NUMBER() <= 3, because it always returns exactly 3 people', correct: false, explain: 'Exactly 3 is the problem: one of the two people tied on 90 would be dropped, and which one is arbitrary.' },
      { text: 'RANK() <= 3, because it handles ties', correct: false, explain: 'RANK handles ties by skipping: 1, 2, 2, 4. The person with the third-highest amount gets rank 4 and misses out.' },
    ],
  },
  {
    id: 'where-window',
    type: 'choice',
    prompt: 'Why does WHERE ROW_NUMBER() OVER (ORDER BY price DESC) <= 2 fail with "misuse of window function"?',
    options: [
      { text: 'Window functions are computed in the SELECT stage, after WHERE has already run', correct: true, explain: 'The same logical order as for aliases: WHERE filters rows before anything in SELECT is computed. Number the rows in a CTE or subquery, then filter on that column outside it. (Some warehouses offer QUALIFY for this; SQLite and PostgreSQL do not.)' },
      { text: 'ROW_NUMBER needs a PARTITION BY', correct: false, explain: 'PARTITION BY is optional; without it the whole result is one window.' },
      { text: 'Window functions cannot be compared with numbers', correct: false, explain: 'They return ordinary numbers; the problem is when they are evaluated.' },
    ],
  },
  {
    id: 'pct',
    type: 'numeric',
    prompt: 'In January the orders total 14.50, 59 and 18. What does ROUND(100.0 * total / SUM(total) OVER (PARTITION BY month), 1) return for the 59.00 order?',
    answer: 64.5,
    tolerance: 0.05,
    hint: 'First find the window sum for January.',
    explain: 'The January window sums to 14.5 + 59 + 18 = 91.5, and 100 × 59 / 91.5 = 64.48, rounded to 64.5. The window gives every row its group total without a join back to a grouped subquery.',
  },
];

export const exercise: SqlExerciseDef = {
  id: 'biggest-order',
  prompt: "Return each known customer's biggest order (customer_id, id, total) from order_totals. If a customer's two biggest orders tie, return both.",
  dataset: 'shop',
  starter: `WITH ranked AS (
  SELECT customer_id, id, total,
         ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY total DESC) AS r
  FROM order_totals
  WHERE customer_id IS NOT NULL
)
SELECT customer_id, id, total
FROM ranked
WHERE r = 1;`,
  hints: [
    'Ben has two orders of exactly 59.00. How many of them does ROW_NUMBER() = 1 keep?',
    'Which ranking function gives tied rows the same number?',
  ],
  solution: `WITH ranked AS (
  SELECT customer_id, id, total,
         RANK() OVER (PARTITION BY customer_id ORDER BY total DESC) AS r
  FROM order_totals
  WHERE customer_id IS NOT NULL
)
SELECT customer_id, id, total
FROM ranked
WHERE r = 1
ORDER BY customer_id, id;`,
  explanation: 'RANK gives both of Ben’s 59.00 orders (102 and 106) rank 1, so both are kept: 7 rows for 6 customers. ROW_NUMBER would keep only one of them, and which one is not defined. DENSE_RANK would work too, since only rank 1 is kept.',
  checks: [
    rowCount(7, '7 rows: one per customer, two for Ben'),
    hasColumns(['customer_id', 'id', 'total']),
    sameRows(['customer_id', 'id', 'total'], 'SELECT customer_id, id, total FROM order_totals t WHERE customer_id IS NOT NULL AND total = (SELECT MAX(total) FROM order_totals u WHERE u.customer_id = t.customer_id)', 'the biggest orders, ties included'),
  ],
};
