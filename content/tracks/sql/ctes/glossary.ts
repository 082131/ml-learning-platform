import type { GlossaryTerm } from '@/lib/types';

// Glossary terms for the sql/ctes chapter (merged into the glossary by content/index.ts).
export default [
  {
    id: 'subquery',
    term: 'Subquery',
    short: 'A SELECT inside another statement, in brackets. It can return one value (scalar), a list (for IN), or a whole table (in FROM).',
    introducedIn: 'sql/ctes/subqueries-ctes',
  },
  {
    id: 'correlated-subquery',
    term: 'Correlated subquery',
    short: 'A subquery that refers to a column of the outer row, so its answer differs per row: "the average price of THIS product’s category".',
    introducedIn: 'sql/ctes/subqueries-ctes',
  },
  {
    id: 'cte',
    term: 'CTE (common table expression)',
    short: 'A named, temporary result defined with WITH name AS (SELECT ...) before the main query. Later steps and the final SELECT can read it like a table.',
    long: 'CTEs make long queries readable as a chain of steps, and let you inspect each step on its own. They exist only while the statement runs. Whether the database computes a CTE once or inlines it is an optimizer choice (SQLite and PostgreSQL accept MATERIALIZED and NOT MATERIALIZED hints).',
    introducedIn: 'sql/ctes/subqueries-ctes',
    aliases: ['WITH clause', 'common table expression'],
  },
  {
    id: 'recursive-cte',
    term: 'Recursive CTE',
    short: 'A CTE that reads itself: a starting query, UNION ALL, and a step that produces new rows from the rows found so far. It repeats until the step adds nothing.',
    introducedIn: 'sql/ctes/recursive-ctes',
    aliases: ['WITH RECURSIVE'],
  },
  {
    id: 'date-spine',
    term: 'Date spine',
    short: 'A generated list of every date (or month) in a range, used as the left side of a LEFT JOIN so periods with no data still appear, with zeros.',
    introducedIn: 'sql/ctes/recursive-ctes',
    aliases: ['calendar table'],
  },
] satisfies GlossaryTerm[];
