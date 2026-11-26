import type { GlossaryTerm } from '@/lib/types';

// Glossary terms for the sql/aggregation chapter (merged into the glossary by content/index.ts).
export default [
  {
    id: 'aggregate-function',
    term: 'Aggregate function',
    short: 'A function that turns many rows into one value: COUNT, SUM, AVG, MIN, MAX. All except COUNT(*) skip NULLs.',
    introducedIn: 'sql/aggregation/group-by',
    aliases: ['aggregate'],
  },
  {
    id: 'having-clause',
    term: 'HAVING',
    short: 'A filter on groups, evaluated after GROUP BY, so it can test aggregates such as COUNT(*) >= 2. WHERE filters rows before grouping.',
    introducedIn: 'sql/aggregation/group-by',
  },
  {
    id: 'conditional-aggregation',
    term: 'Conditional aggregation',
    short: 'An aggregate over a CASE expression, such as SUM(CASE WHEN status = \'shipped\' THEN 1 ELSE 0 END): counts or sums a subset inside each group, and turns categories into columns.',
    introducedIn: 'sql/aggregation/group-by',
    aliases: ['pivot with CASE'],
  },
  {
    id: 'table-grain',
    term: 'Grain',
    short: 'What one row of a table or result stands for: one order, one order line, one customer per day. Knowing the grain tells you what a COUNT or SUM over it means.',
    introducedIn: 'sql/aggregation/group-by',
    aliases: ['granularity'],
  },
] satisfies GlossaryTerm[];
