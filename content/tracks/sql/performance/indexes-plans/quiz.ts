import { rowCount, someRowLike } from '@/lib/sql/checks';
import type { SqlExerciseDef } from '@/lib/sql/types';
import type { QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'leftmost-prefix',
    type: 'choice',
    prompt: 'big_orders has an index on (country, order_date). Which WHERE clause can SEARCH that index on both columns?',
    options: [
      { text: "order_date >= '2026-12-01' AND country = 'DE'", correct: true, explain: 'The order you write the conditions in does not matter; what matters is that the first index column has an equality and the second a range. The planner rearranges them.' },
      { text: "order_date >= '2026-12-01'", correct: false, explain: 'The second column alone: December rows are spread across every country in the index, so there is no single range to read.' },
      { text: "country IN ('DE', 'FR') OR order_date >= '2026-12-01'", correct: false, explain: 'The OR means rows of any country can match through the date condition, so one index range cannot cover the result.' },
    ],
  },
  {
    id: 'equality-first',
    type: 'choice',
    prompt: "For WHERE country = 'DE' AND order_date >= '2026-12-01', the explorer shows (country, order_date) reading 1,644 entries but (order_date, country) reading 8,493, although both are covering. Why the difference?",
    options: [
      { text: 'SQLite prefers whichever index was created first and so walked a larger part of the second one', correct: false, explain: 'Creation order does not decide this; the column order inside the index does.' },
      { text: 'With order_date first, the matching DE rows are interleaved with other countries inside the date range, so the whole range must be read and filtered', correct: true, explain: 'In (country, order_date) all DE entries are together and sorted by date, so the December DE rows form one short run. Equality columns first, the range column last.' },
      { text: 'The second index is bigger', correct: false, explain: 'Both hold the same two columns for the same 200,000 rows.' },
    ],
  },
  {
    id: 'sargable',
    type: 'choice',
    prompt: "WHERE substr(order_date, 1, 7) = '2026-12' scans the table even with an index on order_date. What is the underlying reason?",
    options: [
      { text: 'substr is slow to compute', correct: false, explain: 'Computing substr is cheap. The cost is reading 200,000 rows to compute it.' },
      { text: 'Indexes cannot be used for text columns', correct: false, explain: 'order_date is text and the range version of the same query searches the index.' },
      { text: 'The index is sorted by order_date, and the planner cannot turn a condition on substr(order_date) into a range of order_date values', correct: true, explain: 'Rewrite it as order_date >= \'2026-12-01\' AND order_date < \'2027-01-01\', which states the range directly. (An index on the expression itself would also work.)' },
    ],
  },
  {
    id: 'covering',
    type: 'choice',
    prompt: 'What does USING COVERING INDEX tell you that USING INDEX does not?',
    options: [
      { text: 'Every column the query needs is in the index, so the table itself is never read', correct: true, explain: 'An ordinary index search finds row ids in the index and then looks up each row in the table. A covering index answers from the index alone, skipping those lookups.' },
      { text: 'The index covers every row of the table', correct: false, explain: 'Every index has an entry per row; "covering" is about columns, not rows.' },
      { text: 'The query is guaranteed to be fast', correct: false, explain: 'A covering SCAN still reads every entry; covering only removes the table lookups.' },
    ],
  },
  {
    id: 'selective',
    type: 'numeric',
    prompt: "With an index on (country), WHERE country = 'DE' reads index entries and then looks up the matching table rows. Out of 200,000, how many table rows does it look up?",
    answer: 40000,
    tolerance: 0,
    hint: 'The five countries are equally common.',
    explain: 'One in five rows is DE: 40,000 index entries and 40,000 individual table lookups, compared with one sequential pass over 200,000 rows for a scan. An index that matches a large share of the table saves little, and on disk the random lookups can make it slower.',
  },
];

export const exercise: SqlExerciseDef = {
  id: 'covering-for-customer',
  prompt: 'Create an index on big_orders so that the query below needs no table lookups and no separate sort, then end your script with EXPLAIN QUERY PLAN of the query.\n\nSELECT order_date, amount FROM big_orders WHERE customer_id = 4242 ORDER BY order_date;',
  dataset: 'shop-big',
  starter: `CREATE INDEX idx_customer ON big_orders (customer_id);

EXPLAIN QUERY PLAN
SELECT order_date, amount FROM big_orders
WHERE customer_id = 4242
ORDER BY order_date;`,
  hints: [
    'Run the starter: the plan searches the index, then looks up each row (USING INDEX, not COVERING) and sorts the result (USE TEMP B-TREE FOR ORDER BY).',
    'Put the equality column first, then the ORDER BY column, then the remaining selected column: (customer_id, order_date, amount).',
  ],
  solution: `CREATE INDEX idx_customer_date_amount ON big_orders (customer_id, order_date, amount);

EXPLAIN QUERY PLAN
SELECT order_date, amount FROM big_orders
WHERE customer_id = 4242
ORDER BY order_date;`,
  explanation: 'Inside the index, one customer’s entries are contiguous and already sorted by order_date, so the ORDER BY needs no extra sort. Because amount is in the index too, the query never touches the table: SEARCH big_orders USING COVERING INDEX ... (customer_id=?). The cost is a bigger index to store and keep up to date on every insert.',
  checks: [
    someRowLike('detail', 'SEARCH big_orders USING %INDEX % (customer_id=?)', 'the plan does not search an index on customer_id (end the script with EXPLAIN QUERY PLAN of the query)', 'searches an index on customer_id'),
    someRowLike('detail', '%COVERING INDEX%', 'the plan still looks up table rows: the index must contain every column the query reads', 'covering: no table lookups'),
    someRowLike('detail', '%TEMP B-TREE%', 'the plan still sorts (USE TEMP B-TREE FOR ORDER BY): put order_date right after customer_id in the index', 'no separate sort', false),
    rowCount(1, 'a one-line plan'),
  ],
};
