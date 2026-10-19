import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'left-rows',
    type: 'numeric',
    prompt:
      'customers has 4 rows. orders has 5 rows: two for customer 1, one each for customers 2 and 3, and one with customer_id NULL. How many rows does customers LEFT JOIN orders return?',
    answer: 5,
    tolerance: 0,
    hint: 'Count the matched pairs, then add one row for each customer with no match.',
    explain:
      '4 matched pairs (101, 103, 104, 102) plus Margaret, who has no orders and is kept with NULLs: 4 + 1 = 5. The NULL order matches nobody and a LEFT JOIN does not keep unmatched right rows.',
  },
  {
    id: 'null-match',
    type: 'choice',
    prompt:
      'Order 105 has customer_id NULL. Which joins include it in the result of customers ⋈ orders ON o.customer_id = c.id?',
    options: [
      {
        text: 'Only FULL OUTER JOIN, with NULL customer columns',
        correct: true,
        explain:
          'NULL = anything is NULL, not true, so it matches no customer. Only a join that keeps unmatched right rows (FULL or RIGHT) shows it.',
      },
      {
        text: 'All three, because NULL matches the missing customer',
        correct: false,
        explain: 'There is no "missing customer" row. NULL compared with any value, even NULL, is not true.',
      },
      {
        text: 'LEFT JOIN and FULL OUTER JOIN',
        correct: false,
        explain: 'A LEFT JOIN keeps every row of the left table (customers). Order 105 is on the right.',
      },
    ],
  },
  {
    id: 'where-filter',
    type: 'choice',
    prompt:
      'You add WHERE o.amount > 10 to customers LEFT JOIN orders. What happens to Margaret, who has no orders?',
    options: [
      {
        text: 'She disappears: her o.amount is NULL, and NULL > 10 is not true',
        correct: true,
        explain:
          'WHERE runs after the join and removes the padded row. To keep her, move the test into the join: ON o.customer_id = c.id AND o.amount > 10.',
      },
      {
        text: 'She stays, because a LEFT JOIN keeps every customer',
        correct: false,
        explain:
          'The LEFT JOIN keeps her, but the WHERE clause filters the joined rows afterwards and drops her.',
      },
      {
        text: 'The query fails because o.amount is NULL',
        correct: false,
        explain:
          'Comparisons with NULL do not raise errors. They evaluate to NULL, which WHERE treats as false.',
      },
    ],
  },
  {
    id: 'probes',
    type: 'numeric',
    prompt:
      'A sorted index has 1,000,000 entries. At most how many probes does the binary search in index_lookup need to find where a customer starts?',
    answer: 20,
    tolerance: 0,
    hint: 'Each probe halves the range. How many halvings take 1,000,000 down to 1? 2^20 = 1,048,576.',
    explain:
      'log₂ 1,000,000 ≈ 19.9, so 20 probes at most (19 or 20, depending on the target), against 1,000,000 reads for a full scan.',
  },
  {
    id: 'index-when',
    type: 'choice',
    prompt: 'When does an index on orders(customer_id) not help?',
    options: [
      {
        text: 'When the query reads most of the table anyway, for example a total over all orders',
        correct: true,
        explain:
          'An index helps find a few rows. If almost every row is needed, a scan is as cheap or cheaper, and planners often choose it.',
      },
      {
        text: 'When the table has more than a million rows',
        correct: false,
        explain: 'Large tables are where an index helps most: the scan grows with n, the search with log n.',
      },
      {
        text: 'When the query filters on customer_id = 3',
        correct: false,
        explain:
          'That is exactly the lookup this index serves. EXPLAIN QUERY PLAN shows SEARCH ... USING INDEX for it.',
      },
    ],
  },
  {
    id: 'query-steps',
    type: 'order',
    prompt: 'Put the steps of answering SELECT ... WHERE customer_id = 3 with an index in order.',
    items: [
      'The planner sees an index on customer_id and chooses a SEARCH',
      'Binary search the index for the first entry with customer_id 3',
      'Read index entries forward while customer_id is 3',
      'Fetch each matching row from the table',
    ],
    explain:
      'Plan first, then search the sorted index, read the run of matches, and fetch the rows they point to.',
  },
];

export const leftJoinExercise: Exercise = {
  id: 'left-join',
  prompt:
    'Write `left_join(customers, orders)` in plain Python. customers holds (id, name) tuples and orders holds (order_id, customer_id, amount) tuples.',
  starter: `def left_join(customers, orders):
    # Return (customer_id, name, order_id, amount) tuples: one per matching order,
    # or one with None, None for a customer with no orders. Keep the customers' order.
    pass`,
  hints: [
    'Build a dict from customer_id to a list of (order_id, amount) first, skipping orders whose customer_id is None.',
    'Then loop over customers in order and look each one up with `by_customer.get(customer_id, [])`.',
    'If the list is empty, append `(customer_id, name, None, None)`; otherwise append one tuple per order.',
  ],
  solution: `def left_join(customers, orders):
    by_customer = {}
    for order_id, customer_id, amount in orders:
        if customer_id is not None:
            by_customer.setdefault(customer_id, []).append((order_id, amount))
    rows = []
    for customer_id, name in customers:
        matches = by_customer.get(customer_id, [])
        if not matches:
            rows.append((customer_id, name, None, None))
        for order_id, amount in matches:
            rows.append((customer_id, name, order_id, amount))
    return rows`,
  explanation:
    'This is a hash join: one pass to build a dict over orders, one pass to probe it from customers, so the work grows with len(customers) + len(orders) instead of their product. Skipping None keys copies SQL, where NULL matches nothing.',
  tests: `customers = [(1, "Ada"), (2, "Grace"), (3, "Linus"), (4, "Margaret")]
orders = [(101, 1, 30), (102, 3, 45), (103, 1, 12), (104, 2, 8), (105, None, 20)]
assert left_join(customers, orders) == [(1, "Ada", 101, 30), (1, "Ada", 103, 12), (2, "Grace", 104, 8), (3, "Linus", 102, 45), (4, "Margaret", None, None)], 'the lesson tables should give 5 rows, with Margaret padded with None'
assert left_join(customers, []) == [(1, "Ada", None, None), (2, "Grace", None, None), (3, "Linus", None, None), (4, "Margaret", None, None)], 'with no orders, every customer is kept once with None'
assert left_join([], orders) == [], 'with no customers the result is empty: a LEFT JOIN keeps left rows only'
assert left_join([(7, "Eve")], [(1, None, 5)]) == [(7, "Eve", None, None)], 'an order with customer_id None matches nobody'
assert len(left_join([(1, "Ada")], [(1, 1, 5), (2, 1, 6), (3, 1, 7)])) == 3, 'one customer with three orders gives three rows'`,
};
