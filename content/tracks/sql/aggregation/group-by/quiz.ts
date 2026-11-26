import { hasColumns, orderIs, rowCount, sameRows } from '@/lib/sql/checks';
import type { SqlExerciseDef } from '@/lib/sql/types';
import type { QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'rows-out',
    type: 'numeric',
    prompt: "SELECT city, COUNT(*) FROM customers GROUP BY city. How many rows does it return? (Cities: London ×3, Paris ×2, Berlin ×2, and Fay's NULL.)",
    answer: 4,
    tolerance: 0,
    hint: 'One output row per group. Does NULL get a group?',
    explain: 'GROUP BY puts all NULLs in one group, so the groups are Berlin, London, Paris and NULL: 4 rows. GROUP BY treats NULLs as equal to each other, even though NULL = NULL is UNKNOWN in a WHERE.',
  },
  {
    id: 'count-variants',
    type: 'choice',
    prompt: 'A table of 10 survey answers has 3 NULLs in the rating column and the non-NULL ratings are 4, 4, 5, 5, 5, 3, 4. Which is true?',
    options: [
      { text: 'COUNT(*) = 10, COUNT(rating) = 7, COUNT(DISTINCT rating) = 3', correct: true, explain: 'COUNT(*) counts rows, COUNT(rating) counts non-NULL ratings, and COUNT(DISTINCT rating) counts the different non-NULL values (3, 4, 5).' },
      { text: 'COUNT(*) = 7, COUNT(rating) = 7, COUNT(DISTINCT rating) = 3', correct: false, explain: 'COUNT(*) counts every row, NULL or not.' },
      { text: 'COUNT(*) = 10, COUNT(rating) = 10, COUNT(DISTINCT rating) = 4', correct: false, explain: 'COUNT(column) skips NULLs, and DISTINCT does not count NULL as a value.' },
    ],
  },
  {
    id: 'avg-null',
    type: 'choice',
    prompt: "Five deliveries took 2, 4 and 6 days; two are still in transit with days = NULL. A dashboard shows AVG(days) = 4. What is the most accurate reading?",
    options: [
      { text: 'The average over delivered orders is 4; the two in transit are not in it', correct: true, explain: 'AVG divides the sum of non-NULL values (12) by their count (3). Whether that is the metric you want is a business decision: in-transit orders are usually the slow ones, so this average flatters.' },
      { text: 'The average over all five orders is 4, counting the NULLs as 0', correct: false, explain: 'That would be 12 / 5 = 2.4. AVG skips NULLs; it does not treat them as 0.' },
      { text: 'AVG returns NULL because two values are NULL', correct: false, explain: 'Aggregates skip NULLs. AVG is NULL only if every value in the group is NULL.' },
    ],
  },
  {
    id: 'where-or-having',
    type: 'choice',
    prompt: 'You want each customer\'s total spend, counting only orders after 1 February, and only customers whose total is above 50. Where do the two conditions go?',
    options: [
      { text: "Date in WHERE, total in HAVING", correct: true, explain: 'The date is a fact about each order, so it filters rows before grouping. The total only exists after grouping, so it goes in HAVING.' },
      { text: 'Both in HAVING', correct: false, explain: 'It works in some databases, but the date test then runs on groups instead of rows and you lose the early filtering; in standard SQL a non-grouped column in HAVING is an error.' },
      { text: 'Both in WHERE', correct: false, explain: 'WHERE runs before GROUP BY, so SUM(...) > 50 has nothing to sum yet; it is an error ("misuse of aggregate").' },
      { text: 'Total in WHERE, date in HAVING', correct: false, explain: 'Backwards: aggregates are not available in WHERE.' },
    ],
  },
  {
    id: 'grain-sum',
    type: 'choice',
    prompt: 'order_items has one row per product per order. Someone runs SELECT COUNT(*) FROM order_items WHERE order_date >= ... (after adding order_date) and reports it as "number of orders". What did they actually count?',
    options: [
      { text: 'Order lines, because the grain of order_items is one product in one order', correct: true, explain: 'An order with 2 products is 2 rows. COUNT(DISTINCT order_id) counts orders. Always ask "what does one row stand for?" before counting.' },
      { text: 'Orders, because every row has an order_id', correct: false, explain: 'Rows repeat the order_id once per product, so orders with several products are counted several times.' },
      { text: 'Units sold, because each row is one unit', correct: false, explain: 'Units are SUM(quantity); one row can hold quantity 5.' },
    ],
  },
  {
    id: 'pivot',
    type: 'numeric',
    prompt: "In February there were 6 orders: 4 shipped, 1 cancelled, 1 returned. What does ROUND(100.0 * SUM(CASE WHEN status = 'shipped' THEN 1 ELSE 0 END) / COUNT(*), 1) return for February?",
    answer: 66.7,
    tolerance: 0.05,
    hint: 'The CASE turns each shipped row into 1 and every other row into 0, so the SUM counts shipped orders.',
    explain: '100.0 × 4 / 6 = 66.67, rounded to 66.7. The 100.0 (not 100) keeps the division decimal.',
  },
];

export const exercise: SqlExerciseDef = {
  id: 'busy-customers',
  prompt: 'For each customer with at least 2 orders that were not cancelled, return customer_id, the number of such orders (orders), and the date of their latest such order (last_order). Busiest first; ties by customer_id.',
  dataset: 'shop',
  starter: `SELECT customer_id, COUNT(*) AS orders
FROM orders
GROUP BY customer_id;`,
  hints: [
    "Two filters: 'not cancelled' is about each order (WHERE), 'at least 2' is about each customer's group (HAVING).",
    'MAX(order_date) gives the latest date in each group. Sort with ORDER BY orders DESC, customer_id.',
  ],
  solution: `SELECT customer_id,
       COUNT(*)        AS orders,
       MAX(order_date) AS last_order
FROM orders
WHERE status <> 'cancelled'
GROUP BY customer_id
HAVING COUNT(*) >= 2
ORDER BY orders DESC, customer_id;`,
  explanation: "WHERE removes order 104 (Chen's cancelled order) before grouping, so Chen has only 1 remaining order and HAVING drops him. Ada (3 orders), Ben (2) and Dana (2) remain. The guest order (customer_id NULL) forms its own group of 1 and is dropped by HAVING too. Testing status <> 'cancelled' is safe here because status is NOT NULL in this table.",
  checks: [
    rowCount(3),
    hasColumns(['customer_id', 'orders', 'last_order']),
    sameRows(['customer_id', 'orders', 'last_order'], "SELECT customer_id, COUNT(*) AS orders, MAX(order_date) AS last_order FROM orders WHERE status <> 'cancelled' GROUP BY customer_id HAVING COUNT(*) >= 2"),
    orderIs('customer_id', [1, 2, 4], 'busiest first, then by customer_id'),
  ],
};
