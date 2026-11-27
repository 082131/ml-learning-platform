import { hasColumns, orderIs, rowCount, sameRows } from '@/lib/sql/checks';
import type { SqlExerciseDef } from '@/lib/sql/types';
import type { QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'leak-signal',
    type: 'choice',
    prompt: 'In the leaky training table at cutoff 2026-02-01, every customer has a negative days_since_last. A model trained on it scores almost perfectly. Why does it fail in production?',
    options: [
      { text: 'At prediction time the future orders do not exist yet, so the feature can never be negative and its strongest signal disappears', correct: true, explain: 'The model learned "a negative or recent last order means a purchase", which is true only because the purchase itself was in the feature. In production the feature is computed from the past only, so the learned rule never fires.' },
      { text: 'Most model libraries reject or silently clip negative feature values, so the days_since_last column is mangled once it reaches production code', correct: false, explain: 'Models handle negative values fine; the problem is what the values reveal, not their sign.' },
      { text: 'The training table has too few rows', correct: false, explain: 'More rows with the same leak would fit even better and fail just as badly.' },
    ],
  },
  {
    id: 'on-vs-where',
    type: 'choice',
    prompt: 'The features step joins orders with ON o.customer_id = s.customer_id AND o.order_date < s.cutoff. What goes wrong if the date condition moves to WHERE?',
    options: [
      { text: 'Nothing, because the result is the same either way for a LEFT JOIN', correct: false, explain: 'For an outer join, ON and WHERE differ: WHERE runs after the join.' },
      { text: 'Rows of customers with no past orders disappear, because their padded NULL order_date fails the WHERE test', correct: true, explain: 'Exactly the join-types lesson: a WHERE condition on the optional side removes the NULL-padded rows. Chen at 2026-02-01 and every new customer would drop out of the training table, biasing it towards existing buyers.' },
      { text: 'The features would start including future orders again, because WHERE is evaluated before the join and so the date limit never reaches the joined rows', correct: false, explain: 'WHERE runs after the join, not before, and the date filter still applies to every joined order. The problem is which rows survive, not which orders are counted.' },
    ],
  },
  {
    id: 'label-known',
    type: 'choice',
    prompt: 'You train a model on 2026-03-01 with 30-day labels. Why is the 2026-02-15 cutoff dropped from training, even though it is in the past?',
    options: [
      { text: 'Its features use orders from after 2026-03-01', correct: false, explain: 'Its features stop at 2026-02-15. The problem is on the label side.' },
      { text: 'Customers who signed up after 2026-02-15 would be missing', correct: false, explain: 'That is true of every cutoff and is correct: they did not exist yet.' },
      { text: 'Its label window runs to 2026-03-17, so on 2026-03-01 its labels were not final yet', correct: true, explain: 'A label is known only when its window has ended. Using it anyway smuggles in information from between 2026-03-01 and 2026-03-17, which is the test period.' },
    ],
  },
  {
    id: 'frame-feature',
    type: 'numeric',
    prompt: 'For Ada’s third order (2026-02-22), what does COUNT(*) OVER (PARTITION BY customer_id ORDER BY order_date ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) return?',
    answer: 2,
    tolerance: 0,
    hint: 'The frame ends one row before the current one.',
    explain: 'Her two earlier orders (6 and 28 January). The default frame would end at CURRENT ROW and return 3, counting the order the features are supposed to predict.',
  },
  {
    id: 'random-split',
    type: 'choice',
    prompt: 'The 16-row training table has the same customer at several cutoffs. What is the main problem with splitting it into train and test at random?',
    options: [
      { text: 'A random split gives train and test sets of unpredictable sizes, and with only 16 rows the test set could end up with no positive labels at all', correct: false, explain: 'Sizes can be controlled; that is not the issue.' },
      { text: 'Ada at 2026-02-15 could be in train and Ada at 2026-02-01 in test, so the model is tested on a past it has already seen the future of', correct: true, explain: 'Rows of one customer at nearby cutoffs share most of their history and overlapping label windows. A random split lets the test set lean on information from later rows, so the score is too optimistic. Split by time.' },
      { text: 'SQLite has no random function', correct: false, explain: 'It has RANDOM(); the problem is statistical, not technical.' },
    ],
  },
];

export const exercise: SqlExerciseDef = {
  id: 'cutoff-features',
  prompt: 'Build training rows for the cutoff 2026-03-01: one row per customer who signed up before it, with customer_id, spend_30d (the total of their orders in the 30 days before the cutoff, 0 if none) and label (1 if they placed an order in the 30 days from the cutoff, else 0). Order by customer_id.',
  dataset: 'shop',
  starter: `SELECT c.id AS customer_id,
       COALESCE(SUM(o.total), 0) AS spend_30d,
       EXISTS (SELECT 1 FROM orders AS f
               WHERE f.customer_id = c.id
                 AND f.order_date >= '2026-03-01'
                 AND f.order_date <  date('2026-03-01', '+30 days')) AS label
FROM customers AS c
LEFT JOIN order_totals AS o
       ON o.customer_id = c.id
      AND o.order_date >= date('2026-03-01', '-30 days')
WHERE c.signup_date < '2026-03-01'
GROUP BY c.id
ORDER BY c.id;`,
  hints: [
    'Compare spend_30d with label in the starter’s output: the customers with label 1 have suspiciously high spend. Which orders are being added?',
    'The feature window has a start but no end. Add AND o.order_date < \'2026-03-01\' to the ON clause (not to WHERE, which would drop customers without orders).',
  ],
  solution: `SELECT c.id AS customer_id,
       COALESCE(SUM(o.total), 0) AS spend_30d,
       EXISTS (SELECT 1 FROM orders AS f
               WHERE f.customer_id = c.id
                 AND f.order_date >= '2026-03-01'
                 AND f.order_date <  date('2026-03-01', '+30 days')) AS label
FROM customers AS c
LEFT JOIN order_totals AS o
       ON o.customer_id = c.id
      AND o.order_date >= date('2026-03-01', '-30 days')
      AND o.order_date <  '2026-03-01'
WHERE c.signup_date < '2026-03-01'
GROUP BY c.id
ORDER BY c.id;`,
  explanation: 'The starter added March orders to spend_30d, and the only customers with March orders are exactly the ones with label 1 (Chen 32 + 74, Dana 31 + 38.5, Fay 20). The leak lit up the positives perfectly. With the end of the window in place, spend comes only from 30 January to 28 February: Ada 13, Ben 59, Chen 32, Dana 31, Eli 41, Fay 0.',
  checks: [
    rowCount(6, 'one row per customer who signed up before the cutoff'),
    hasColumns(['customer_id', 'spend_30d', 'label']),
    sameRows(
      ['customer_id', 'spend_30d', 'label'],
      "SELECT c.id AS customer_id, COALESCE((SELECT SUM(t.total) FROM order_totals t WHERE t.customer_id = c.id AND t.order_date BETWEEN '2026-01-30' AND '2026-02-28'), 0) AS spend_30d, (SELECT COUNT(*) > 0 FROM orders f WHERE f.customer_id = c.id AND f.order_date BETWEEN '2026-03-01' AND '2026-03-30') AS label FROM customers c WHERE c.signup_date < '2026-03-01'",
      'spend uses only the 30 days before the cutoff',
    ),
    orderIs('customer_id', [1, 2, 3, 4, 5, 6], 'ordered by customer_id'),
  ],
};
