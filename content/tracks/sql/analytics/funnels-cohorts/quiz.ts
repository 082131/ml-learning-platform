import { hasColumns, orderIs, rowCount, sameRows } from '@/lib/sql/checks';
import type { SqlExerciseDef } from '@/lib/sql/types';
import type { QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'events-denominator',
    type: 'choice',
    prompt: 'Counting event rows, checkout to purchase is 11 / 11 and add_to_cart to checkout is 11 / 14 = 78.6%. Counting users it is 6 / 7 = 85.7%. Why does the event-based rate come out lower?',
    options: [
      { text: 'Some users add to cart more than once (Ben twice in one minute, Eli in two visits), so the add_to_cart count is inflated', correct: true, explain: 'An event count measures activity, not people. Repeated or duplicated events inflate a step, and the next step’s rate falls. A conversion rate should count each unit (here, a user) once per step.' },
      { text: 'Users whose checkout happened in a later month than their add_to_cart are left out of the event count, so the checkout step shrinks', correct: false, explain: 'The event count ignores time completely; nothing is dropped by date.' },
      { text: 'It is a rounding difference', correct: false, explain: 'The difference is 3 extra add_to_cart rows, not rounding.' },
    ],
  },
  {
    id: 'window-meaning',
    type: 'choice',
    prompt: 'Visit-to-purchase conversion is 37.5% with a 1-hour window, 50% with 7 days and 75% with no limit. Which statement is right?',
    options: [
      { text: 'The 75% figure is the true conversion; the others undercount', correct: false, explain: 'With no limit, a purchase months later counts as "converted from this visit", which may not be what the funnel is meant to measure.' },
      { text: 'They answer different questions, so the report must state its window', correct: true, explain: '"Buys in the same sitting" and "buys within a week" are both legitimate; they are different metrics. Comparing a 1-hour rate this month with a 7-day rate last month would show a fake improvement.' },
      { text: 'The 1-hour figure is the safest, because shorter windows remove noise', correct: false, explain: 'A shorter window is not more correct; it is a narrower definition that misses slower buyers like Eli.' },
    ],
  },
  {
    id: 'step-order',
    type: 'choice',
    prompt: 'In the ordered funnel, each step joins the previous step’s rows (FROM viewed AS p ...) instead of reading events directly. What would change if carted read from visited instead of viewed?',
    options: [
      { text: 'Nothing at all, because the 7-day window already forces every step to happen after the previous one and in the right order', correct: false, explain: 'The window limits how late a step may be, not whether the previous step happened.' },
      { text: 'A user could count at add_to_cart without ever viewing a product in the window, so a later step could exceed an earlier one', correct: true, explain: 'Reading from the previous step is what makes each step a subset of the one before. Without it, the funnel is a set of independent counts that need not shrink.' },
      { text: 'The query would fail, because CTEs must be read in order', correct: false, explain: 'A CTE may read any earlier CTE; the query would run and quietly mean something else.' },
    ],
  },
  {
    id: 'step-conversion',
    type: 'numeric',
    prompt: 'In the 7-day ordered funnel (8, 7, 5, 4, 4 users), what percent of the users who viewed a product added it to the cart? Round to one decimal.',
    answer: 71.4,
    tolerance: 0.05,
    hint: 'Step conversion divides by the previous step, not by the first.',
    explain: '5 / 7 = 71.4%. Divided by the first step instead (5 / 8 = 62.5%) it would answer "what share of visitors reached the cart", a different question.',
  },
  {
    id: 'incomplete-month',
    type: 'choice',
    prompt: 'The naive cohort table shows the March cohort at 0% in month 1 (April). The data ends on 6 April. What is the best reading?',
    options: [
      { text: 'March signups are churning badly, which needs investigating', correct: false, explain: 'Only 6 days of April exist. Neither March customer has had a full month 1 yet.' },
      { text: 'Unknown: April is incomplete, so that cell should be blank, not 0%', correct: true, explain: 'A 0 for a period that has not finished claims a measurement nobody made. The honest table marks incomplete cells NULL, which turns the table into the usual triangle.' },
      { text: 'Correct, since both March customers had no events in April', correct: false, explain: 'True for the 6 days we have, but "no events yet" is not "not retained".' },
    ],
  },
  {
    id: 'average-retention',
    type: 'choice',
    prompt: 'Month-1 retention is 100% (January, 3 users) and 66.7% (February, 3 users); March has no complete month 1. Someone averages the naive m1 column, 100, 66.7 and 0, and reports 55.6%. What is the overall month-1 retention?',
    options: [
      { text: '55.6%, because every cohort should count', correct: false, explain: 'Including March’s 0 averages in a month that has not happened.' },
      { text: '83.3%', correct: true, explain: '5 of the 6 users whose month 1 is complete were active in it: (3 + 2) / 6. Here it equals the simple average of the two complete cohorts because they have the same size; with different sizes, weight by users.' },
      { text: '66.7%, the most recent complete cohort', correct: false, explain: 'That is one cohort, not the overall rate.' },
    ],
  },
];

export const exercise: SqlExerciseDef = {
  id: 'cohort-conversion',
  prompt: 'For each signup-month cohort, return cohort (YYYY-MM), customers (the number who signed up) and converted (how many placed at least one order within 7 days of their signup date), including cohorts where nobody converted. Order by cohort.',
  dataset: 'shop',
  starter: `SELECT substr(c.signup_date, 1, 7) AS cohort,
       COUNT(DISTINCT c.id)          AS customers,
       COUNT(DISTINCT o.customer_id) AS converted
FROM customers AS c
JOIN orders AS o ON o.customer_id = c.id
WHERE o.order_date <= date(c.signup_date, '+7 days')
GROUP BY cohort
ORDER BY cohort;`,
  hints: [
    'Run the starter: every cohort converts 100%, and March is missing. The denominator only contains customers who converted.',
    'Keep every customer with a LEFT JOIN and move the 7-day condition into ON, so it decides which orders match rather than which customers survive.',
  ],
  solution: `SELECT substr(c.signup_date, 1, 7) AS cohort,
       COUNT(DISTINCT c.id)          AS customers,
       COUNT(DISTINCT o.customer_id) AS converted
FROM customers AS c
LEFT JOIN orders AS o
       ON o.customer_id = c.id
      AND o.order_date <= date(c.signup_date, '+7 days')
GROUP BY cohort
ORDER BY cohort;`,
  explanation: 'January: Ada (1 day) and Ben (3 days) converted, Chen took 14 days, so 2 of 3. February: Dana and Eli, but not Fay (12 days), 2 of 3. March: 0 of 2. The starter’s WHERE removed every customer without a matching order, so each cohort’s denominator was its converters and the rate was always 100%.',
  checks: [
    rowCount(3, 'one row per cohort, including March'),
    hasColumns(['cohort', 'customers', 'converted']),
    sameRows(['cohort', 'customers', 'converted'], "SELECT substr(c.signup_date, 1, 7) AS cohort, COUNT(*) AS customers, SUM(EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id AND o.order_date <= date(c.signup_date, '+7 days'))) AS converted FROM customers c GROUP BY 1", 'every cohort has the right customers and converted counts'),
    orderIs('cohort', ['2026-01', '2026-02', '2026-03'], 'in cohort order'),
  ],
};
