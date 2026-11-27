import { hasColumns, orderIs, rowCount, sameRows } from '@/lib/sql/checks';
import type { SqlExerciseDef } from '@/lib/sql/types';
import type { QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'scalar-many',
    type: 'choice',
    prompt: 'WHERE price > (SELECT price FROM products WHERE category = \'home\'). The home category has 3 products. What happens?',
    options: [
      { text: 'PostgreSQL raises "more than one row returned by a subquery used as an expression"; SQLite silently uses the first row', correct: true, explain: 'A scalar subquery must return one value. PostgreSQL enforces it; SQLite takes the first row it finds, which is an arbitrary choice. Make the intent explicit with MAX, MIN or AVG.' },
      { text: 'It compares price with each of the 3 values and keeps rows greater than all of them', correct: false, explain: 'That is what > ALL (subquery) does in databases that support it. A bare scalar subquery is not a list.' },
      { text: 'It keeps rows greater than any of the 3 values', correct: false, explain: 'That would be > ANY in PostgreSQL. A scalar subquery is one value.' },
    ],
  },
  {
    id: 'correlated-runs',
    type: 'choice',
    prompt: 'What makes the subquery in WHERE p.price > (SELECT AVG(q.price) FROM products q WHERE q.category = p.category) "correlated"?',
    options: [
      { text: 'It mentions p.category, a column of the outer query’s current row', correct: true, explain: 'So its result depends on which outer row is being tested: 39 for electronics, 17.67 for home, 5.25 for stationery. Conceptually it runs once per outer row; optimizers often rewrite it as a join with a grouped subquery.' },
      { text: 'It uses an aggregate function', correct: false, explain: '(SELECT AVG(price) FROM products) also aggregates but is not correlated: it gives one value for the whole query.' },
      { text: 'It reads the same table as the outer query', correct: false, explain: 'Reading the same table is not what matters; referencing the outer row is.' },
    ],
  },
  {
    id: 'cte-grain',
    type: 'order',
    prompt: 'The lesson’s CTE finds customers who spent more than the average customer. Order its steps by grain, from finest to coarsest.',
    items: ['one shipped order line', 'one customer', 'one row for the whole shop', 'one row per above-average customer'],
    explain: 'shipped_lines (13 order lines) is summed to customer_spend (5 customers), averaged to one row, and then the final SELECT compares each customer with that one row. Writing the grain of each step is the quickest way to spot a wrong join.',
  },
  {
    id: 'avg-of-what',
    type: 'choice',
    prompt: 'Why does the lesson compute the average from customer_spend instead of AVG(amount) over shipped_lines?',
    options: [
      { text: 'AVG over shipped_lines is the average order LINE (22.23), not the average customer’s spend (57.80)', correct: true, explain: 'The same AVG over a different grain answers a different question. "Customers who spent more than average" compares customers, so the average must be over customers.' },
      { text: 'AVG cannot read a CTE directly', correct: false, explain: 'It can; a CTE is read like a table.' },
      { text: 'There is no difference; both give 57.80', correct: false, explain: '289 spread over 13 lines is about 22.23 per line, a very different number.' },
    ],
  },
  {
    id: 'cte-vs-subquery',
    type: 'choice',
    prompt: 'When is a CTE clearly better than the same logic as nested subqueries?',
    options: [
      { text: 'When a step is used twice, or the query has several steps that someone must read and check', correct: true, explain: 'A CTE names a step once and lets you reference it repeatedly, and steps read top to bottom in the order they happen. Speed is usually the same: modern optimizers can inline CTEs (PostgreSQL 12+ does by default).' },
      { text: 'Always, because CTEs are cached and therefore faster', correct: false, explain: 'Whether a CTE is computed once (materialized) or inlined is up to the optimizer. Materializing can even be slower, because filters from outside cannot be pushed into it.' },
      { text: 'Only when the query is recursive', correct: false, explain: 'Recursion needs WITH RECURSIVE, but ordinary CTEs are useful far beyond recursion.' },
    ],
  },
];

export const exercise: SqlExerciseDef = {
  id: 'top-per-category',
  prompt: 'Using a CTE, return category, name and price of the most expensive product in each category, ordered by category.',
  dataset: 'shop',
  starter: `WITH top AS (
  SELECT category, MAX(price) AS top_price
  FROM products
  GROUP BY category
)
SELECT * FROM top;`,
  hints: [
    'The CTE already finds the top price per category. The product name is in products, so join products back to it.',
    'Join on both category and price: ON p.category = t.category AND p.price = t.top_price.',
  ],
  solution: `WITH top AS (
  SELECT category, MAX(price) AS top_price
  FROM products
  GROUP BY category
)
SELECT p.category, p.name, p.price
FROM products AS p
JOIN top AS t
  ON t.category = p.category
 AND t.top_price = p.price
ORDER BY p.category;`,
  explanation: 'Step 1 (top) has one row per category with its highest price. Step 2 joins each product to its category’s top price and keeps only exact matches: Headphones (59), Desk lamp (32), Pen set (6.50). If two products tied for the top price, both would be returned, which is usually what "the most expensive" should mean. The window-functions lesson shows another way.',
  checks: [
    rowCount(3, 'one row per category'),
    hasColumns(['category', 'name', 'price']),
    sameRows(['category', 'name', 'price'], 'SELECT p.category, p.name, p.price FROM products p WHERE p.price = (SELECT MAX(price) FROM products q WHERE q.category = p.category)'),
    orderIs('category', ['electronics', 'home', 'stationery'], 'ordered by category'),
  ],
};
