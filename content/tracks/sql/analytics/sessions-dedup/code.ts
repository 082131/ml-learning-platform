// Code for "Sessions, deduplication and streaks". SqlRunner and CteSteps examples run in SQLite 3.54
// (sql.js 1.16); sql-outputs.test.ts checks the quoted values. The session explorer (src/lib/sql/sessions.ts)
// is checked against SQLite for every timeout from 1 to 60 minutes.
import { sessionExperiment } from '@/lib/sql/experiments';
import type { SqlCteExample, SqlExample } from '@/lib/sql/types';

export const sessionLab = sessionExperiment('sql-sessions');

export const sessionSteps: SqlCteExample = {
  id: 'sessionize',
  dataset: 'shop',
  steps: [
    {
      name: 'gaps',
      sql: `SELECT id, user_id, event_time, event,
       unixepoch(event_time)
         - unixepoch(LAG(event_time) OVER (PARTITION BY user_id
                                           ORDER BY event_time, id)) AS gap_s
FROM events`,
      note: 'Grain: one event (74 rows). gap_s is the seconds since the same user’s previous event; NULL for each user’s first event. unixepoch turns a timestamp into whole seconds.',
    },
    {
      name: 'flagged',
      sql: `SELECT *,
       CASE WHEN gap_s IS NULL OR gap_s > 30 * 60 THEN 1 ELSE 0 END AS new_session
FROM gaps`,
      note: 'A 1 marks an event that starts a session: the first event of a user, or one after more than 30 minutes of silence. 22 events get a 1.',
    },
    {
      name: 'numbered',
      sql: `SELECT *,
       SUM(new_session) OVER (PARTITION BY user_id ORDER BY event_time, id
                              ROWS UNBOUNDED PRECEDING) AS session_no
FROM flagged`,
      note: 'A running total of the flags: it goes up by 1 at each session start and stays put inside a session, so it numbers the sessions 1, 2, 3 per user.',
    },
  ],
  final: `SELECT user_id, session_no,
       MIN(event_time) AS session_start,
       COUNT(*) AS events,
       MAX(event = 'purchase') AS purchased
FROM numbered
GROUP BY user_id, session_no
ORDER BY user_id, session_no`,
};

export const exactDuplicates: SqlExample = {
  id: 'exact-duplicates',
  dataset: 'shop',
  source: `-- Rows that are identical in every column.
SELECT customer_id, updated_at, email, plan, COUNT(*) AS copies
FROM customer_updates
GROUP BY customer_id, updated_at, email, plan
HAVING COUNT(*) > 1;`,
};

export const duplicateEvents: SqlExample = {
  id: 'duplicate-events',
  dataset: 'shop',
  source: `-- Same user, same time, same event, different id: the app sent it twice.
SELECT user_id, event_time, event, COUNT(*) AS copies, group_concat(id) AS ids
FROM events
GROUP BY user_id, event_time, event
HAVING COUNT(*) > 1;

-- Keep one copy of each: the lowest id.
SELECT COUNT(*) AS events_before,
       (SELECT COUNT(*) FROM events AS e
        WHERE e.id = (SELECT MIN(d.id) FROM events AS d
                      WHERE d.user_id = e.user_id AND d.event_time = e.event_time
                        AND d.event = e.event)) AS events_after
FROM events;`,
};

export const latestVersion: SqlExample = {
  id: 'latest-version',
  dataset: 'shop',
  source: `-- customer_updates keeps every version of a customer's details. Keep the newest per customer.
WITH ranked AS (
  SELECT customer_id, updated_at, email, plan,
         ROW_NUMBER() OVER (PARTITION BY customer_id
                            ORDER BY updated_at DESC) AS rn
  FROM customer_updates
)
SELECT customer_id, updated_at, email, plan
FROM ranked
WHERE rn = 1
ORDER BY customer_id;`,
};

export const streaks: SqlCteExample = {
  id: 'login-streaks',
  dataset: 'shop',
  steps: [
    {
      name: 'numbered',
      sql: `SELECT user_id, day,
       ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY day) AS rn
FROM logins`,
      note: 'Grain: one login day per user (12 rows). rn counts each user’s login days 1, 2, 3 ...',
    },
    {
      name: 'tagged',
      sql: `SELECT user_id, day, rn,
       date(day, '-' || rn || ' days') AS streak_key
FROM numbered`,
      note: 'Day minus its position. Inside a run of consecutive days both go up by 1, so the difference stays the same; after a missed day it jumps. Ada’s 1, 2, 3 March all give 28 February.',
    },
  ],
  final: `SELECT user_id,
       MIN(day) AS first_day,
       MAX(day) AS last_day,
       COUNT(*) AS days
FROM tagged
GROUP BY user_id, streak_key
ORDER BY user_id, first_day`,
};
