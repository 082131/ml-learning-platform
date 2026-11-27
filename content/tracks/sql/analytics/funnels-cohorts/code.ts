// Code for "Funnels and cohort retention". SqlRunner and CteSteps examples run in SQLite 3.54 (sql.js 1.16);
// sql-outputs.test.ts checks the quoted values. The funnel explorer (src/lib/sql/funnel.ts) is checked
// against SQLite for every setting.
import { funnelExperiment } from '@/lib/sql/experiments';
import type { SqlCteExample, SqlExample } from '@/lib/sql/types';

export const funnelLab = funnelExperiment('sql-funnel');

export const eventsVsUsers: SqlExample = {
  id: 'events-vs-users',
  dataset: 'shop',
  source: `SELECT event,
       COUNT(*)                AS events,
       COUNT(DISTINCT user_id) AS users
FROM events
GROUP BY event
ORDER BY CASE event WHEN 'visit' THEN 1 WHEN 'view_product' THEN 2
                    WHEN 'add_to_cart' THEN 3 WHEN 'checkout' THEN 4 ELSE 5 END;`,
};

export const everFunnel: SqlExample = {
  id: 'ever-funnel',
  dataset: 'shop',
  source: `-- One row per user with a 0/1 flag per step ("did it ever happen?"), then add the flags up.
WITH flags AS (
  SELECT user_id,
         MAX(event = 'visit')        AS visited,
         MAX(event = 'view_product') AS viewed,
         MAX(event = 'add_to_cart')  AS carted,
         MAX(event = 'checkout')     AS checked_out,
         MAX(event = 'purchase')     AS purchased
  FROM events
  GROUP BY user_id
)
SELECT SUM(visited) AS visit, SUM(viewed) AS view_product, SUM(carted) AS add_to_cart,
       SUM(checked_out) AS checkout, SUM(purchased) AS purchase
FROM flags;`,
};

const step = (name: string, prev: string, event: string, note: string) => ({
  name,
  sql: `SELECT p.user_id, p.start, MIN(e.event_time) AS t
FROM ${prev} AS p
JOIN events AS e ON e.user_id = p.user_id
                AND e.event = '${event}'
                AND e.event_time >= p.t
                AND e.event_time <= datetime(p.start, '+7 days')
GROUP BY p.user_id, p.start`,
  note,
});

export const orderedFunnel: SqlCteExample = {
  id: 'ordered-funnel',
  dataset: 'shop',
  steps: [
    {
      name: 'visited',
      sql: `SELECT user_id, MIN(event_time) AS start, MIN(event_time) AS t
FROM events
WHERE event = 'visit'
GROUP BY user_id`,
      note: 'Grain: one user. start is the first visit, which starts the 7-day clock; t is when the user reached this step. 8 users.',
    },
    step('viewed', 'visited', 'view_product', 'The first product view at or after the visit and within 7 days of start. Hana viewed a product 17 days later, too late: 7 users.'),
    step('carted', 'viewed', 'add_to_cart', 'Reads only users who made it to viewed, so the steps stay in order. Chen and Fay added to cart after 12 to 14 days: 5 users.'),
    step('checked_out', 'carted', 'checkout', 'Gus never checked out: 4 users. Eli checked out 34 hours after his first visit, inside 7 days.'),
    step('purchased', 'checked_out', 'purchase', 'Everyone who checked out also bought: 4 users.'),
    {
      name: 'funnel',
      sql: `SELECT 1 AS n, 'visit' AS step, COUNT(*) AS users FROM visited
UNION ALL SELECT 2, 'view_product', COUNT(*) FROM viewed
UNION ALL SELECT 3, 'add_to_cart',  COUNT(*) FROM carted
UNION ALL SELECT 4, 'checkout',     COUNT(*) FROM checked_out
UNION ALL SELECT 5, 'purchase',     COUNT(*) FROM purchased`,
      note: 'Grain: one funnel step. UNION ALL stacks the five counts into rows, so window functions can compare them.',
    },
  ],
  final: `SELECT step, users,
       ROUND(100.0 * users / LAG(users) OVER (ORDER BY n), 1)         AS pct_of_previous,
       ROUND(100.0 * users / FIRST_VALUE(users) OVER (ORDER BY n), 1) AS pct_of_first
FROM funnel
ORDER BY n`,
};

// Month numbers (year * 12 + month) make "months since signup" a subtraction.
const monthNo = (col: string) => `CAST(substr(${col}, 1, 4) AS INTEGER) * 12 + CAST(substr(${col}, 6, 2) AS INTEGER)`;

export const naiveCohorts: SqlExample = {
  id: 'naive-cohorts',
  dataset: 'shop',
  source: `-- Cohort = signup month. Active = any event that month. month_n = months since signup.
WITH activity AS (
  SELECT DISTINCT c.id AS user_id, substr(c.signup_date, 1, 7) AS cohort,
         (${monthNo('e.event_time')}) - (${monthNo('c.signup_date')}) AS month_n
  FROM customers AS c
  JOIN events AS e ON e.user_id = c.id
)
SELECT cohort,
       COUNT(DISTINCT user_id) AS users,
       ROUND(100.0 * COUNT(DISTINCT CASE WHEN month_n = 0 THEN user_id END) / COUNT(DISTINCT user_id), 1) AS m0,
       ROUND(100.0 * COUNT(DISTINCT CASE WHEN month_n = 1 THEN user_id END) / COUNT(DISTINCT user_id), 1) AS m1,
       ROUND(100.0 * COUNT(DISTINCT CASE WHEN month_n = 2 THEN user_id END) / COUNT(DISTINCT user_id), 1) AS m2,
       ROUND(100.0 * COUNT(DISTINCT CASE WHEN month_n = 3 THEN user_id END) / COUNT(DISTINCT user_id), 1) AS m3
FROM activity
GROUP BY cohort
ORDER BY cohort;`,
};

export const honestCohorts: SqlCteExample = {
  id: 'honest-cohorts',
  dataset: 'shop',
  steps: [
    {
      name: 'cohorts',
      sql: `SELECT id AS user_id,
       substr(signup_date, 1, 7) AS cohort,
       ${monthNo('signup_date')} AS cohort_no
FROM customers`,
      note: 'Grain: one customer, with the month they signed up as a label and as a number. Every customer, active or not, so nobody can silently drop out of the denominator. 8 rows.',
    },
    {
      name: 'active_months',
      sql: `SELECT DISTINCT user_id, ${monthNo('event_time')} AS month_no
FROM events`,
      note: 'Grain: one (user, month) in which the user did anything. DISTINCT matters: Ada has many events in January but is one active user there. 17 rows.',
    },
    {
      name: 'as_of',
      sql: `SELECT ${monthNo('MAX(event_time)')} - 1 AS last_full_month_no
FROM events`,
      note: "The data ends on 2026-04-06, so April is still in progress. The last complete month is March. One row.",
    },
    {
      name: 'cells',
      sql: `SELECT c.cohort, n.month_n,
       COUNT(DISTINCT c.user_id)  AS users,
       COUNT(DISTINCT a.user_id)  AS active,
       c.cohort_no + n.month_n <= (SELECT last_full_month_no FROM as_of) AS complete
FROM cohorts AS c
CROSS JOIN (SELECT 0 AS month_n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3) AS n
LEFT JOIN active_months AS a
       ON a.user_id = c.user_id AND a.month_no = c.cohort_no + n.month_n
GROUP BY c.cohort, n.month_n`,
      note: 'Grain: one (cohort, months since signup) cell. The cross join builds every cell, even empty ones; the LEFT JOIN finds who was active in it. complete is 1 only if that calendar month has fully happened. 12 cells.',
    },
  ],
  final: `SELECT cohort, MAX(users) AS users,
       MAX(CASE WHEN month_n = 0 AND complete THEN ROUND(100.0 * active / users, 1) END) AS m0,
       MAX(CASE WHEN month_n = 1 AND complete THEN ROUND(100.0 * active / users, 1) END) AS m1,
       MAX(CASE WHEN month_n = 2 AND complete THEN ROUND(100.0 * active / users, 1) END) AS m2,
       MAX(CASE WHEN month_n = 3 AND complete THEN ROUND(100.0 * active / users, 1) END) AS m3
FROM cells
GROUP BY cohort
ORDER BY cohort`,
};
