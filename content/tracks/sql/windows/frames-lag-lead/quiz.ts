import { hasColumns, orderIs, rowCount, sameRows } from '@/lib/sql/checks';
import type { SqlExerciseDef } from '@/lib/sql/types';
import type { QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'default-frame',
    type: 'choice',
    prompt: 'SUM(amount) OVER (ORDER BY day) on a table with two rows for 1 May (10 and 5) and one for 2 May (20). What does it return for the two 1 May rows?',
    options: [
      { text: '15 and 15', correct: true, explain: 'With ORDER BY and no frame, the default frame is RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW, and RANGE includes every row with the same ORDER BY value (the current row’s peers). Both 1 May rows see both 1 May rows.' },
      { text: '10 and 15', correct: false, explain: 'That is the ROWS frame, which takes rows one at a time. You must ask for it explicitly, and the order of the two tied rows is then unspecified.' },
      { text: '15 and 35', correct: false, explain: 'The 2 May row is after both of them, so it is not in either window.' },
    ],
  },
  {
    id: 'lag-first',
    type: 'choice',
    prompt: 'Growth is computed as 100.0 * (revenue - LAG(revenue) OVER (ORDER BY month)) / LAG(revenue) OVER (ORDER BY month). What does the first month show, and why?',
    options: [
      { text: 'NULL, because there is no previous row, so LAG returns NULL and the arithmetic stays NULL', correct: true, explain: 'NULL is the honest answer: growth of the first month is undefined. Do not COALESCE it to 0 percent, which claims "no change". LAG(revenue, 1, 0) would make it worse: a division by zero.' },
      { text: '0, because LAG fills missing rows with 0', correct: false, explain: 'LAG returns NULL when there is no row, unless you give it a third argument as the default.' },
      { text: '100 percent, because everything is new', correct: false, explain: 'Nothing in the formula produces 100 for the first row.' },
    ],
  },
  {
    id: 'moving-count',
    type: 'numeric',
    prompt: 'AVG(total) OVER (ORDER BY order_date ROWS BETWEEN 2 PRECEDING AND CURRENT ROW): over how many rows is the SECOND row’s average taken?',
    answer: 2,
    tolerance: 0,
    hint: 'How many rows exist before the second row?',
    explain: 'Only one row precedes it, so its frame is that row and itself: 2 rows. The first rows of a moving average use shorter windows, which makes them noisier. Mark or drop them if that matters.',
  },
  {
    id: 'partition-lead',
    type: 'choice',
    prompt: 'In the days-to-next-order query, why does LEAD use PARTITION BY customer_id?',
    options: [
      { text: 'Without it, the "next order" would be whoever ordered next in the whole shop, not the same customer', correct: true, explain: 'The partition limits each row’s neighbours to the same customer. Each customer’s last order then has no next row, so LEAD returns NULL there.' },
      { text: 'LEAD requires a partition', correct: false, explain: 'It does not; without PARTITION BY the whole result is one window.' },
      { text: 'To make the query faster', correct: false, explain: 'It changes the answer, not just the speed.' },
    ],
  },
  {
    id: 'frame-vs-partition',
    type: 'choice',
    prompt: 'What is the difference between a partition and a frame?',
    options: [
      { text: 'The partition is the group of rows a row can see at all; the frame is the slice of that partition an aggregate actually uses for this row', correct: true, explain: 'PARTITION BY month means a January row never sees February. Inside January, the frame (for example UNBOUNDED PRECEDING to CURRENT ROW) decides which January rows go into its running sum. Ranking functions and LAG/LEAD ignore the frame.' },
      { text: 'They are two names for the same thing', correct: false, explain: 'A partition is fixed for all rows in it; a frame moves with each row.' },
      { text: 'A frame is a partition with an ORDER BY', correct: false, explain: 'ORDER BY orders the partition; the frame clause (ROWS/RANGE BETWEEN ...) is separate and defaults depending on whether ORDER BY is present.' },
    ],
  },
];

export const exercise: SqlExerciseDef = {
  id: 'customer-running',
  prompt: "For every order of a known customer, return customer_id, id, order_date, total and lifetime: the customer's running total of order values up to and including that order. Sort by customer_id, then order_date.",
  dataset: 'shop',
  starter: `SELECT customer_id, id, order_date, total,
       SUM(total) OVER (ORDER BY order_date) AS lifetime
FROM order_totals
WHERE customer_id IS NOT NULL
ORDER BY customer_id, order_date;`,
  hints: [
    "The starter's running total runs across the whole shop. Each customer needs their own window.",
    'Add PARTITION BY customer_id inside OVER, before ORDER BY.',
  ],
  solution: `SELECT customer_id, id, order_date, total,
       SUM(total) OVER (PARTITION BY customer_id ORDER BY order_date) AS lifetime
FROM order_totals
WHERE customer_id IS NOT NULL
ORDER BY customer_id, order_date;`,
  explanation: "Each customer's window starts again at their first order. Ada’s orders give 14.50, then 14.50 + 18 = 32.50, then 32.50 + 13 = 45.50. No customer has two orders on the same day, so the default RANGE frame and a ROWS frame agree here.",
  checks: [
    rowCount(11, 'one row per order of a known customer'),
    hasColumns(['customer_id', 'id', 'lifetime']),
    sameRows(['id', 'lifetime'], 'SELECT t.id, (SELECT SUM(u.total) FROM order_totals u WHERE u.customer_id = t.customer_id AND u.order_date <= t.order_date) AS lifetime FROM order_totals t WHERE t.customer_id IS NOT NULL', 'each running total restarts per customer'),
    orderIs('id', [101, 103, 108, 102, 106, 104, 110, 105, 112, 107, 111], 'sorted by customer, then date'),
  ],
};
