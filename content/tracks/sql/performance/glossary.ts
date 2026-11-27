import type { GlossaryTerm } from '@/lib/types';

// Glossary terms for the sql/performance chapter (merged into the glossary by content/index.ts).
export default [
  {
    id: 'composite-index',
    term: 'Composite index',
    short: 'An index on several columns, sorted by the first, then the second within it, and so on. It can be searched only through a leftmost prefix of its columns: equality conditions first, at most one range last.',
    introducedIn: 'sql/performance/indexes-plans',
    aliases: ['multicolumn index', 'leftmost prefix'],
  },
  {
    id: 'covering-index',
    term: 'Covering index',
    short: 'An index that contains every column a query needs, so the database answers from the index alone without looking up table rows. EXPLAIN QUERY PLAN shows USING COVERING INDEX.',
    introducedIn: 'sql/performance/indexes-plans',
    aliases: ['index-only scan'],
  },
  {
    id: 'sargable',
    term: 'Sargable condition',
    short: 'A WHERE condition the planner can turn into an index range, such as col >= x AND col < y. Wrapping the column in a function (substr(col, ...), date(col)) usually makes a condition non-sargable.',
    introducedIn: 'sql/performance/indexes-plans',
    aliases: ['search argument'],
  },
] satisfies GlossaryTerm[];
