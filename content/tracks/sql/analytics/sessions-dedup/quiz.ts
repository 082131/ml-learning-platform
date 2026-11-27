import { hasColumns, orderIs, rowCount, sameRows } from '@/lib/sql/checks';
import type { SqlExerciseDef } from '@/lib/sql/types';
import type { QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'running-sum-ids',
    type: 'choice',
    prompt: 'Sessionizing takes two window functions: LAG to flag events that start a session, then SUM(new_session) OVER (... ROWS UNBOUNDED PRECEDING). Why a running SUM and not ROW_NUMBER?',
    options: [
      { text: 'ROW_NUMBER would give every event its own number, while the running sum only goes up at session starts, so all events of a session share one number', correct: true, explain: 'The running sum of 0/1 flags is constant between two 1s. That is the trick: it turns "where do sessions start?" into "which session is this event in?".' },
      { text: 'ROW_NUMBER cannot be used with PARTITION BY', correct: false, explain: 'It can; the last chapter used it with PARTITION BY many times.' },
      { text: 'SUM is faster', correct: false, explain: 'Speed is not the reason: ROW_NUMBER would give the wrong answer.' },
    ],
  },
  {
    id: 'timeout-effect',
    type: 'choice',
    prompt: 'Going from a 30-minute to a 45-minute timeout merges Ada’s two sessions on 22 February. What happens to "sessions with an abandoned cart"?',
    options: [
      { text: 'It goes up, because the merged session is longer', correct: false, explain: 'A longer session that contains the purchase cannot be abandoned.' },
      { text: 'It does not change, because the timeout only affects session counts, never what happens inside a session', correct: false, explain: 'Moving a boundary moves events between sessions, so per-session properties change too.' },
      { text: 'It goes down by one', correct: true, explain: 'At 30 minutes, the add_to_cart at 12:03 sits in a session that ends without a purchase, and the purchase lands in the next one. At 45 minutes they are one session that bought. One "abandoned cart" was an artefact of the timeout.' },
    ],
  },
  {
    id: 'gaps-islands',
    type: 'numeric',
    prompt: 'A user logged in on 4, 5, 6, 9 and 10 May. In the gaps-and-islands trick, streak_key = day minus its position (1, 2, 3 ...). How many distinct streak keys are there?',
    answer: 2,
    tolerance: 0,
    hint: 'Compute day − position for each: 4−1, 5−2, 6−3, 9−4, 10−5.',
    explain: '4, 5, 6 May give 3 May three times; 9 and 10 May give 5 May twice. Two keys, so two streaks: 3 days and 2 days.',
  },
  {
    id: 'dedup-key',
    type: 'choice',
    prompt: 'ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY updated_at DESC) = 1 keeps the latest version per customer. If two versions of one customer had the same updated_at but different plans, what would you get?',
    options: [
      { text: 'An error, because ROW_NUMBER refuses ties', correct: false, explain: 'ROW_NUMBER never refuses ties; it breaks them silently.' },
      { text: 'One of the two, chosen arbitrarily, possibly a different one next time', correct: true, explain: 'Without a tiebreaker the order of tied rows is unspecified. Add a column that makes the order unique (an id or a load sequence), or decide explicitly how to resolve the conflict.' },
      { text: 'Both rows, since both are the latest', correct: false, explain: 'That is what RANK = 1 would do. ROW_NUMBER always gives exactly one row number 1 per partition.' },
    ],
  },
  {
    id: 'distinct-vs-latest',
    type: 'choice',
    prompt: 'Which problem does SELECT DISTINCT * FROM customer_updates solve, and which does it not?',
    options: [
      { text: 'It removes rows identical in every column (Chen’s repeated row) but keeps all three of Ada’s versions, which differ', correct: true, explain: 'Exact duplicates and multiple versions are different problems. DISTINCT handles the first; "latest per key" needs ROW_NUMBER over the key.' },
      { text: 'It keeps only the latest row of each customer', correct: false, explain: 'DISTINCT compares whole rows; it knows nothing about keys or time.' },
      { text: 'It removes Ben’s duplicate add_to_cart event', correct: false, explain: 'That is in a different table (events), and its two rows have different ids, so they are not identical in every column.' },
    ],
  },
];

export const exercise: SqlExerciseDef = {
  id: 'longest-streak',
  prompt: 'For each user in logins, return user_id, longest (the length in days of their longest streak of consecutive login days) and first_day (the day that streak started). If a user has several longest streaks, take the most recent. Order by user_id.',
  dataset: 'shop',
  starter: `SELECT user_id,
       COUNT(*) AS longest,
       MIN(day) AS first_day
FROM logins
GROUP BY user_id
ORDER BY user_id;`,
  hints: [
    'The starter counts login days, not consecutive ones: Ada has 6 login days but her longest run is shorter. Build the streaks first with the date-minus-ROW_NUMBER key.',
    'Group by (user_id, streak_key) to get one row per streak with its length and first day. Then ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY days DESC, first_day DESC) and keep rn = 1.',
  ],
  solution: `WITH numbered AS (
  SELECT user_id, day, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY day) AS rn
  FROM logins
),
streaks AS (
  SELECT user_id, MIN(day) AS first_day, COUNT(*) AS days
  FROM numbered
  GROUP BY user_id, date(day, '-' || rn || ' days')
),
ranked AS (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY days DESC, first_day DESC) AS pick
  FROM streaks
)
SELECT user_id, days AS longest, first_day
FROM ranked
WHERE pick = 1
ORDER BY user_id;`,
  explanation: 'Ada’s streaks are 3 (1–3 March), 2 and 1 days, so 3 from 1 March. Ben logged in 2–5 March: 4. Chen has two 1-day streaks; the tiebreaker first_day DESC picks 8 March. Without it, either could come back.',
  checks: [
    rowCount(3, 'one row per user'),
    hasColumns(['user_id', 'longest', 'first_day']),
    // Expected values, worked out by hand from the 12 login rows.
    sameRows(['user_id', 'longest', 'first_day'], "SELECT 1 AS user_id, 3 AS longest, '2026-03-01' AS first_day UNION ALL SELECT 2, 4, '2026-03-02' UNION ALL SELECT 3, 1, '2026-03-08'", 'the right longest streak and start day for each user'),
    orderIs('user_id', [1, 2, 3], 'ordered by user_id'),
  ],
};
