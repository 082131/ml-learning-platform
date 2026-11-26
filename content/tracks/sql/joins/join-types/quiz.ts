import { hasColumns, orderIs, rowCount, sameRows } from '@/lib/sql/checks';
import type { SqlExerciseDef } from '@/lib/sql/types';
import type { QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'left-count',
    type: 'numeric',
    prompt: 'A table of 5 authors and a table of 9 books. Every book has exactly one author_id; 2 authors have no books and one author wrote 4 books. How many rows does authors LEFT JOIN books ON books.author_id = authors.id return?',
    answer: 11,
    tolerance: 0,
    hint: 'Count the matched pairs first, then add one row for each author with no match.',
    explain: 'Each of the 9 books matches exactly one author: 9 matched pairs. The 2 authors without books are kept once each with NULL book columns: 9 + 2 = 11. How many books one author has does not change the total; it only decides how often that author repeats.',
  },
  {
    id: 'where-kills-left',
    type: 'choice',
    prompt: "customers LEFT JOIN orders ON o.customer_id = c.id WHERE o.order_date >= '2026-03-01'. Which customers can appear in the result?",
    options: [
      { text: 'Only customers with at least one order in March or later', correct: true, explain: "For a customer with no matching order, o.order_date is NULL, NULL >= '2026-03-01' is UNKNOWN, and WHERE drops the row. The LEFT JOIN kept them and WHERE threw them away: the query behaves like an inner join. Put the date test in ON to keep every customer." },
      { text: 'Every customer, because it is a LEFT JOIN', correct: false, explain: 'The LEFT JOIN keeps them, but WHERE runs after the join and tests every row, including the NULL-padded ones.' },
      { text: 'Every customer, but those without March orders show NULL dates', correct: false, explain: 'That is what you get when the date test is in ON, not in WHERE.' },
    ],
  },
  {
    id: 'right-vs-left',
    type: 'choice',
    prompt: 'Which query returns the same rows as customers c RIGHT JOIN orders o ON o.customer_id = c.id?',
    options: [
      { text: 'orders o LEFT JOIN customers c ON o.customer_id = c.id', correct: true, explain: 'A RIGHT JOIN keeps every row of the table on the right. Swapping the tables and writing LEFT keeps the same table. Most teams write only LEFT joins, ordered from the table whose rows must all stay.' },
      { text: 'customers c LEFT JOIN orders o ON o.customer_id = c.id', correct: false, explain: 'This keeps every customer (Gus and Hana with NULL orders) and drops the guest order. The RIGHT join does the opposite.' },
      { text: 'customers c FULL JOIN orders o ON o.customer_id = c.id', correct: false, explain: 'FULL keeps unmatched rows from both sides: 14 rows instead of 12.' },
    ],
  },
  {
    id: 'cross-count',
    type: 'numeric',
    prompt: 'You CROSS JOIN 12 months with 40 stores and then LEFT JOIN sales onto that grid. How many rows does the grid have before the LEFT JOIN?',
    answer: 480,
    tolerance: 0,
    hint: 'A cross join pairs every row with every row.',
    explain: '12 × 40 = 480 (month, store) pairs. LEFT JOINing sales onto it keeps all 480 even when a store sold nothing in a month, so zeros show up in the report instead of silently missing rows.',
  },
  {
    id: 'self-join-why',
    type: 'choice',
    prompt: 'Why does the self-join that lists each employee\'s manager use LEFT JOIN rather than JOIN?',
    options: [
      { text: 'Rosa has no manager (manager_id is NULL), and an inner join would drop her', correct: true, explain: 'NULL matches nothing, so with JOIN the CEO disappears. LEFT JOIN keeps her with a NULL manager.' },
      { text: 'A table cannot be inner-joined to itself', correct: false, explain: 'It can: JOIN employees AS m works and returns the 6 employees who have a manager.' },
      { text: 'LEFT JOIN is faster on small tables', correct: false, explain: 'The choice is about which rows you want, not speed.' },
    ],
  },
  {
    id: 'join-order',
    type: 'order',
    prompt: 'You must report revenue by product category from orders, order_items and products. Order the steps that keep the numbers right.',
    items: [
      'State the grain you want: one row per category',
      'Join orders to order_items on order_id (now one row per order line)',
      'Join products on product_id to get each line’s category',
      'Filter the orders you count (for example status = shipped)',
      'GROUP BY category and SUM(quantity * unit_price)',
    ],
    explain: 'Knowing the target grain first tells you which joins are needed. Each join is along a key, and you can check the row count after each one: 17 order lines stay 17 lines after joining products, because each line has exactly one product.',
  },
];

export const exercise: SqlExerciseDef = {
  id: 'spend-per-customer',
  prompt: 'Return every customer (all 8) with name and spent: the total of their shipped order lines (quantity × unit_price), 0 for customers with none. Highest spend first, ties by name.',
  dataset: 'shop',
  starter: `SELECT c.name, SUM(oi.quantity * oi.unit_price) AS spent
FROM customers AS c
JOIN orders AS o ON o.customer_id = c.id
JOIN order_items AS oi ON oi.order_id = o.id
WHERE o.status = 'shipped'
GROUP BY c.id
ORDER BY spent DESC;`,
  hints: [
    'The inner joins drop customers without shipped orders. Which join keeps every customer?',
    "Move the status test into the ON clause of the orders join, LEFT JOIN order_items too, and wrap the SUM in COALESCE(..., 0).",
  ],
  solution: `SELECT c.name,
       COALESCE(SUM(oi.quantity * oi.unit_price), 0) AS spent
FROM customers AS c
LEFT JOIN orders AS o
  ON o.customer_id = c.id AND o.status = 'shipped'
LEFT JOIN order_items AS oi
  ON oi.order_id = o.id
GROUP BY c.id
ORDER BY spent DESC, c.name;`,
  explanation: "Ada spent 14.50 + 18 + 13 = 45.50 over three shipped orders, Chen 74 (order 110), Dana 31 + 38.50 = 69.50, Ben 59, Eli 41. Fay's only order is pending, and Gus and Hana never ordered: the LEFT JOINs keep them, SUM over their NULLs is NULL, and COALESCE turns it into 0. With the status test in WHERE they would vanish again.",
  checks: [
    rowCount(8, 'all 8 customers'),
    hasColumns(['name', 'spent']),
    sameRows(['name', 'spent'], "SELECT c.name, COALESCE(SUM(oi.quantity * oi.unit_price), 0) AS spent FROM customers c LEFT JOIN orders o ON o.customer_id = c.id AND o.status = 'shipped' LEFT JOIN order_items oi ON oi.order_id = o.id GROUP BY c.id"),
    orderIs('name', ['Chen', 'Dana', 'Ben', 'Ada', 'Eli', 'Fay', 'Gus', 'Hana'], 'highest spend first, ties by name'),
  ],
};
