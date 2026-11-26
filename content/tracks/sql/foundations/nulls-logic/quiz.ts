import { hasColumns, rowCount, sameRows } from '@/lib/sql/checks';
import type { SqlExerciseDef } from '@/lib/sql/types';
import type { QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'counts-add-up',
    type: 'numeric',
    prompt: "A table has 1,000 rows. WHERE country = 'DE' returns 120 rows and WHERE country <> 'DE' returns 830. How many rows have no country (NULL)?",
    answer: 50,
    tolerance: 0,
    hint: 'Which rows are in neither result?',
    explain: "A row with NULL country makes both tests UNKNOWN, so it is dropped by both. 1,000 - 120 - 830 = 50 rows are NULL. When a filter and its opposite do not add up to the total, NULLs are almost always the reason.",
  },
  {
    id: 'or-and-unknown',
    type: 'choice',
    prompt: 'For Fay, city is NULL. What is the value of (city = \'London\') OR (signup_date >= \'2026-02-01\'), given she signed up on 2026-02-20?',
    options: [
      { text: 'UNKNOWN, because anything combined with NULL is UNKNOWN', correct: false, explain: 'That is true for arithmetic (1 + NULL), not for OR. OR only needs one TRUE side.' },
      { text: 'TRUE, because the second side is TRUE', correct: true, explain: 'UNKNOWN OR TRUE is TRUE: whatever the unknown city is, the whole condition holds. Likewise UNKNOWN AND FALSE is FALSE. Only when the known side cannot decide does the result stay UNKNOWN.' },
      { text: 'FALSE, because NULL counts as FALSE', correct: false, explain: 'NULL is not FALSE. WHERE drops UNKNOWN rows the same way it drops FALSE ones, but inside a condition the difference matters, as NOT shows: NOT FALSE is TRUE, NOT UNKNOWN is still UNKNOWN.' },
    ],
  },
  {
    id: 'not-in-null',
    type: 'choice',
    prompt: "SELECT name FROM customers WHERE city NOT IN ('London', NULL) returns no rows at all. Why?",
    options: [
      { text: "city NOT IN ('London', NULL) means city <> 'London' AND city <> NULL, and city <> NULL is never TRUE", correct: true, explain: 'Every row gets either FALSE (Londoners) or UNKNOWN (everyone else, because of the <> NULL part). No row is TRUE, so WHERE keeps nothing. This bites hardest with NOT IN (subquery) when the subquery can return a NULL.' },
      { text: 'NULL in a list is a syntax error that SQLite silently ignores', correct: false, explain: 'It is valid SQL and SQLite evaluates it; the empty result is the correct three-valued answer.' },
      { text: 'NOT IN only works with numbers', correct: false, explain: 'NOT IN works with any type. Without the NULL in the list, it returns Dana and Gus.' },
      { text: 'Fay has a NULL city, and one NULL row makes the whole query return nothing', correct: false, explain: "A NULL in the table only affects that row. It is the NULL inside the list that poisons every row's test." },
    ],
  },
  {
    id: 'case-first-match',
    type: 'choice',
    prompt: "CASE WHEN score >= 50 THEN 'pass' WHEN score >= 90 THEN 'distinction' ELSE 'fail' END. What does a score of 95 get?",
    options: [
      { text: "'distinction', because it is the most specific branch", correct: false, explain: 'CASE does not look for the best branch; it stops at the first TRUE one.' },
      { text: "'pass', because the branches are tried top to bottom", correct: true, explain: "95 >= 50 is TRUE, so CASE returns 'pass' and never reaches the 90 test. Put the strictest test first." },
      { text: 'NULL, because two branches match', correct: false, explain: 'Several matching branches is fine: the first one wins. NULL only comes back when no branch matches and there is no ELSE.' },
    ],
  },
  {
    id: 'coalesce-vs-distinct',
    type: 'choice',
    prompt: "Both COALESCE(city, 'x') <> 'London' and city IS DISTINCT FROM 'London' keep Fay. When do they give different answers?",
    options: [
      { text: 'Never, they are two spellings of the same test', correct: false, explain: "They differ when the default you picked is the value you compare with." },
      { text: "When the default equals the compared value, as in COALESCE(city, 'London') <> 'London'", correct: true, explain: "Then a NULL city becomes 'London' and is dropped, while IS DISTINCT FROM still keeps it. IS DISTINCT FROM says what you mean (a missing value is different from London) without picking a fake value." },
      { text: 'When city is an empty string', correct: false, explain: "An empty string is a real value, not NULL. Both tests treat '' as different from 'London'." },
    ],
  },
  {
    id: 'avg-ratio',
    type: 'numeric',
    prompt: 'In SQLite, what does SELECT 3 / 4 * 100 return?',
    answer: 0,
    tolerance: 0,
    hint: 'Both 3 and 4 are integers. What is 3 / 4 in integer division?',
    explain: 'Integer divided by integer is integer division in SQLite (and PostgreSQL, SQL Server): 3 / 4 = 0, and 0 * 100 = 0. Write 3 * 100.0 / 4 or CAST(3 AS REAL) / 4 * 100 to get 75.0.',
  },
];

export const exercise: SqlExerciseDef = {
  id: 'regions',
  prompt: "Return each customer's name and a region column: 'UK' for London, 'EU' for any other known city, and 'unknown' when the city is missing.",
  dataset: 'shop',
  starter: `SELECT name,
       CASE city WHEN 'London' THEN 'UK' ELSE 'EU' END AS region
FROM customers;`,
  hints: [
    "The starter labels Fay 'EU'. Her city is NULL, so city = 'London' is UNKNOWN and the ELSE branch wins.",
    "Use a searched CASE (CASE WHEN ... THEN ...) and test city IS NULL in the first branch.",
  ],
  solution: `SELECT name,
       CASE
         WHEN city IS NULL THEN 'unknown'
         WHEN city = 'London' THEN 'UK'
         ELSE 'EU'
       END AS region
FROM customers;`,
  explanation: "The NULL test comes first because once city is NULL every comparison with it is UNKNOWN, so no later branch could catch it. Fay is now 'unknown'; Ada, Chen and Hana are 'UK'; the other four are 'EU'.",
  checks: [
    rowCount(8, 'one row per customer'),
    hasColumns(['name', 'region']),
    sameRows(['name', 'region'], "SELECT name, CASE WHEN city IS NULL THEN 'unknown' WHEN city = 'London' THEN 'UK' ELSE 'EU' END AS region FROM customers", 'every region is right'),
  ],
};
