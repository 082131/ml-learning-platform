import type { GlossaryTerm } from '@/lib/types';

// Glossary terms for the sql/joins chapter (merged into the glossary by content/index.ts).
export default [
  {
    id: 'outer-join',
    term: 'Outer join',
    short: 'A join that also keeps rows with no match, filling the other side’s columns with NULL. LEFT keeps unmatched left rows, RIGHT unmatched right rows, FULL both.',
    introducedIn: 'sql/joins/join-types',
    aliases: ['LEFT JOIN', 'RIGHT JOIN', 'FULL JOIN'],
  },
  {
    id: 'cross-join',
    term: 'Cross join',
    short: 'Every row of one table paired with every row of the other: n × m rows. Useful to build all combinations, such as every city with every category.',
    introducedIn: 'sql/joins/join-types',
    aliases: ['Cartesian product'],
  },
  {
    id: 'self-join',
    term: 'Self-join',
    short: 'A table joined to itself under two aliases, to relate rows of the same table, such as each employee to their manager.',
    introducedIn: 'sql/joins/join-types',
  },
  {
    id: 'relationship-cardinality',
    term: 'One-to-many relationship',
    short: 'One row on one side matches many rows on the other, like one customer to many orders. Joining across it repeats the "one" side once per match.',
    introducedIn: 'sql/joins/join-types',
    aliases: ['cardinality', 'one-to-one', 'many-to-many'],
  },
  {
    id: 'join-fan-out',
    term: 'Fan-out',
    short: 'Rows multiplying in a join because a key matches several rows. Joining two one-to-many tables to the same parent multiplies their rows together and inflates sums.',
    introducedIn: 'sql/joins/fanout-semi-anti',
    aliases: ['row explosion', 'double counting'],
  },
  {
    id: 'semi-join',
    term: 'Semi-join',
    short: 'Keeps the rows of one table that have at least one match in another, without repeating them: WHERE EXISTS (...) or IN (...).',
    introducedIn: 'sql/joins/fanout-semi-anti',
  },
  {
    id: 'anti-join',
    term: 'Anti-join',
    short: 'Keeps the rows of one table that have no match in another: WHERE NOT EXISTS (...), or LEFT JOIN ... WHERE right.key IS NULL.',
    introducedIn: 'sql/joins/fanout-semi-anti',
  },
] satisfies GlossaryTerm[];
