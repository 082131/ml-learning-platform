import type { GlossaryTerm } from '@/lib/types';

// Glossary terms for the sql/windows chapter (merged into the glossary by content/index.ts).
export default [
  {
    id: 'window-function',
    term: 'Window function',
    short: 'A function computed for each row from a set of related rows (its window), written with OVER (...). Unlike GROUP BY, every row stays in the result.',
    introducedIn: 'sql/windows/ranking',
    aliases: ['analytic function', 'OVER clause'],
  },
  {
    id: 'window-partition',
    term: 'PARTITION BY',
    short: 'Splits the rows into separate windows inside OVER (...), like GROUP BY does, but without collapsing them. Each row only sees rows of its own partition.',
    introducedIn: 'sql/windows/ranking',
  },
  {
    id: 'ranking-functions',
    term: 'ROW_NUMBER, RANK, DENSE_RANK',
    short: 'Number rows in window order. On ties ROW_NUMBER still counts 1, 2, 3; RANK gives ties the same number and skips (1, 2, 2, 4); DENSE_RANK does not skip (1, 2, 2, 3).',
    introducedIn: 'sql/windows/ranking',
    aliases: ['ROW_NUMBER', 'RANK', 'DENSE_RANK'],
  },
  {
    id: 'window-frame',
    term: 'Window frame',
    short: 'Which rows of the partition, relative to the current row, an aggregate window function adds up, such as ROWS BETWEEN 2 PRECEDING AND CURRENT ROW. With ORDER BY and no frame, the default is RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW.',
    introducedIn: 'sql/windows/frames-lag-lead',
    aliases: ['ROWS', 'RANGE', 'frame clause'],
  },
  {
    id: 'lag-lead',
    term: 'LAG and LEAD',
    short: 'Read a value from the previous (LAG) or next (LEAD) row in window order, for comparisons such as "change since last month". NULL when there is no such row.',
    introducedIn: 'sql/windows/frames-lag-lead',
  },
  {
    id: 'running-total',
    term: 'Running total',
    short: 'The sum of a value from the first row up to the current row, in a given order: SUM(x) OVER (ORDER BY day).',
    introducedIn: 'sql/windows/frames-lag-lead',
    aliases: ['cumulative sum'],
  },
] satisfies GlossaryTerm[];
