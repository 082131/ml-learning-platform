import { hasColumns, rowCount, sameRows } from '@/lib/sql/checks';
import type { SqlExerciseDef } from '@/lib/sql/types';
import type { QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'fanout-factor',
    type: 'numeric',
    prompt: 'An order has 3 items worth 50 in total and 4 tracking events. A query joins orders to items and to tracking events, then reports SUM(item value). What does it report?',
    answer: 200,
    tolerance: 0,
    hint: 'Each item row is repeated once per tracking event.',
    explain: 'The joins make 3 × 4 = 12 rows, and every item appears 4 times, so its value is summed 4 times: 50 × 4 = 200. The inflation factor is the size of the OTHER one-to-many side.',
  },
  {
    id: 'distinct-fix',
    type: 'choice',
    prompt: 'A colleague fixes a fanned-out revenue sum with SUM(DISTINCT oi.quantity * oi.unit_price). Why is that not a safe fix?',
    options: [
      { text: 'It also removes legitimately equal values, such as two different lines that both cost 9.00', correct: true, explain: 'DISTINCT works on values, not on rows: two real lines of 9.00 count once. It can look right on test data and be wrong on real data. Aggregate each side to the join key first instead.' },
      { text: 'SUM(DISTINCT ...) is not valid SQL', correct: false, explain: 'It is valid in SQLite, PostgreSQL and most databases. The problem is what it computes.' },
      { text: 'It is correct but slow, because DISTINCT sorts the values', correct: false, explain: 'Speed is not the issue; the answer can be wrong.' },
    ],
  },
  {
    id: 'semi-vs-join',
    type: 'choice',
    prompt: 'You want the list of customers who have at least one returned order. Why is WHERE EXISTS (...) better than JOIN orders ... WHERE status = \'returned\'?',
    options: [
      { text: 'EXISTS returns each customer once however many returned orders they have; the join repeats them per order', correct: true, explain: 'A semi-join answers a yes/no question per customer. A join answers "give me every matching pair". You could add DISTINCT to the join, but that hides the intent and can hide other duplication bugs.' },
      { text: 'A join cannot filter on a column of the joined table', correct: false, explain: "It can; WHERE o.status = 'returned' works. The difference is duplicates." },
      { text: 'EXISTS includes customers with no orders', correct: false, explain: 'EXISTS is TRUE only when the subquery finds a row, so customers without orders are excluded.' },
    ],
  },
  {
    id: 'not-in',
    type: 'choice',
    prompt: 'WHERE id NOT IN (SELECT manager_id FROM employees) is meant to list employees who manage nobody. It returns no rows. Why?',
    options: [
      { text: "Rosa's manager_id is NULL, so the list contains NULL and 'id <> NULL' is UNKNOWN for every row", correct: true, explain: 'NOT IN is a chain of <> tests joined by AND. One UNKNOWN in the chain makes the result UNKNOWN for every id that is not in the list. Use NOT EXISTS, or add WHERE manager_id IS NOT NULL inside the subquery.' },
      { text: 'Every employee manages someone', correct: false, explain: 'Wen, Vic and Xia manage nobody, so a correct query returns them.' },
      { text: 'A subquery inside NOT IN must return one row', correct: false, explain: 'IN and NOT IN accept a subquery that returns many rows, one column.' },
    ],
  },
  {
    id: 'anti-left',
    type: 'choice',
    prompt: 'In the anti-join LEFT JOIN order_items oi ON oi.product_id = p.id WHERE oi.product_id IS NULL, why test oi.product_id and not some other column of oi?',
    options: [
      { text: 'Because it is the join key, it can only be NULL in rows the LEFT JOIN padded, never in a real match', correct: true, explain: 'A matched row has oi.product_id = p.id, which is not NULL. A nullable column such as a discount code could be NULL in a real match and turn the test into "no match OR missing discount".' },
      { text: 'Any column works the same, it is just a convention', correct: false, explain: 'Only a column that is never NULL in a real match tells padded rows apart reliably. The join key (or the primary key) is the safe choice.' },
      { text: 'IS NULL only works on key columns', correct: false, explain: 'IS NULL works on any column.' },
    ],
  },
];

export const exercise: SqlExerciseDef = {
  id: 'balance-check',
  prompt: 'For every order that has at least one payment, return id, items_total (sum of its lines) and paid (sum of its payments), with no fan-out.',
  dataset: 'shop',
  starter: `SELECT o.id,
       SUM(oi.quantity * oi.unit_price) AS items_total,
       SUM(p.amount) AS paid
FROM orders AS o
JOIN order_items AS oi ON oi.order_id = o.id
JOIN payments AS p ON p.order_id = o.id
GROUP BY o.id;`,
  hints: [
    'Run the starter and compare orders 107 and 110 with their real totals (41 and 74): both are doubled.',
    'Aggregate order_items and payments each to one row per order_id in subqueries, then join those to orders.',
  ],
  solution: `SELECT o.id, i.items_total, p.paid
FROM orders AS o
JOIN (SELECT order_id, SUM(quantity * unit_price) AS items_total
      FROM order_items GROUP BY order_id) AS i ON i.order_id = o.id
JOIN (SELECT order_id, SUM(amount) AS paid
      FROM payments GROUP BY order_id) AS p ON p.order_id = o.id;`,
  explanation: 'Each subquery has exactly one row per order, so the joins are one-to-one and nothing repeats. 10 orders have payments (104 was cancelled and 111 is pending), and for every one of them items_total equals paid, which is a useful reconciliation check in itself.',
  checks: [
    rowCount(10, 'one row per paid order'),
    hasColumns(['id', 'items_total', 'paid']),
    sameRows(['id', 'items_total', 'paid'], 'SELECT o.id, i.t AS items_total, p.t AS paid FROM orders o JOIN (SELECT order_id, SUM(quantity * unit_price) t FROM order_items GROUP BY order_id) i ON i.order_id = o.id JOIN (SELECT order_id, SUM(amount) t FROM payments GROUP BY order_id) p ON p.order_id = o.id', 'totals are not inflated'),
  ],
};
