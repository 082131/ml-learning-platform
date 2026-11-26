import type { GlossaryTerm } from '@/lib/types';

// Glossary terms for the sql/foundations chapter (merged into the glossary by content/index.ts).
export default [
  {
    id: 'sql-clause',
    term: 'Clause',
    short: 'One part of a SQL statement that starts with a keyword: SELECT, FROM, WHERE, GROUP BY, HAVING, ORDER BY, LIMIT. Each clause does one job.',
    introducedIn: 'sql/foundations/select-basics',
  },
  {
    id: 'logical-query-order',
    term: 'Logical query order',
    short: 'The order a SELECT is evaluated in, which differs from the order it is written: FROM, WHERE, GROUP BY, HAVING, SELECT, ORDER BY, LIMIT.',
    long: 'It explains most "why can’t I use that here" errors: WHERE runs before SELECT, so it cannot see column aliases (in standard SQL) or aggregates; ORDER BY runs after SELECT, so it can. The database may physically do things in another order, but the result must be as if it followed this one.',
    introducedIn: 'sql/foundations/select-basics',
    aliases: ['order of evaluation', 'query order of execution'],
  },
  {
    id: 'column-alias',
    term: 'Column alias',
    short: 'A name given to an output column with AS, for example price * 1.2 AS price_with_vat. It exists from the SELECT stage on.',
    introducedIn: 'sql/foundations/select-basics',
  },
  {
    id: 'three-valued-logic',
    term: 'Three-valued logic',
    short: 'SQL conditions can be TRUE, FALSE or UNKNOWN (NULL). WHERE keeps only rows where the condition is TRUE, so UNKNOWN rows silently disappear.',
    introducedIn: 'sql/foundations/nulls-logic',
    aliases: ['3VL', 'UNKNOWN'],
  },
  {
    id: 'coalesce',
    term: 'COALESCE',
    short: 'Returns the first argument that is not NULL: COALESCE(city, \'unknown\'). Used to give missing values a default.',
    introducedIn: 'sql/foundations/nulls-logic',
  },
  {
    id: 'case-expression',
    term: 'CASE expression',
    short: 'SQL’s if/else that produces a value: CASE WHEN condition THEN value ... ELSE value END. Conditions are tried top to bottom and the first TRUE one wins.',
    introducedIn: 'sql/foundations/nulls-logic',
  },
  {
    id: 'type-affinity',
    term: 'Type affinity (SQLite)',
    short: 'SQLite stores a value’s type with the value, and a column only prefers a type. Comparing a number with text can then give surprising results; most other databases reject or convert it.',
    introducedIn: 'sql/foundations/nulls-logic',
  },
] satisfies GlossaryTerm[];
