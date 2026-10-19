import type { GlossaryTerm } from '@/lib/types';

// Glossary terms for the data/relational chapter (merged into the glossary by content/index.ts).
export default [
  {
    id: 'primary-key',
    term: 'Primary key',
    short: 'The column (or columns) whose value identifies each row of a table: unique and never NULL.',
    long: 'customers.id is a primary key: no two customers share an id. Other tables refer to a row by its primary key, and joins usually match on it.',
    introducedIn: 'data/relational/joins-indexes',
    aliases: ['PK'],
  },
  {
    id: 'foreign-key',
    term: 'Foreign key',
    short: 'A column whose values must match a primary key in another table (or be NULL).',
    long: 'orders.customer_id REFERENCES customers(id) means every order points at an existing customer or at nothing. The database can reject rows that break the rule; SQLite does so only after PRAGMA foreign_keys = ON.',
    introducedIn: 'data/relational/joins-indexes',
    aliases: ['FK', 'REFERENCES'],
  },
  {
    id: 'sql-join',
    term: 'Join',
    short:
      'Combining rows of two tables into one result by pairing rows where a condition, usually key equality, is true.',
    long: 'INNER JOIN keeps matched pairs only. LEFT JOIN also keeps left rows without a match, padded with NULLs. FULL OUTER JOIN keeps unmatched rows from both sides.',
    introducedIn: 'data/relational/joins-indexes',
    aliases: ['inner join', 'left join', 'outer join', 'full outer join'],
  },
  {
    id: 'sql-null',
    term: 'NULL (SQL)',
    short:
      'SQL’s marker for a missing or unknown value. Any comparison with NULL, even NULL = NULL, is not true.',
    long: 'Test for it with IS NULL, never = NULL. Outer joins produce NULLs in the columns of the side that had no match. Python’s sqlite3 module returns NULL as None.',
    introducedIn: 'data/relational/joins-indexes',
    aliases: ['null', 'missing value'],
  },
  {
    id: 'database-index',
    term: 'Index (database)',
    short:
      'A separate, sorted structure over one or more columns that lets a database find matching rows without reading the whole table.',
    long: 'Most databases store indexes as B-trees, which stay sorted as rows change. An index speeds up lookups and joins on its columns, and costs extra storage and slower writes.',
    introducedIn: 'data/relational/joins-indexes',
    aliases: ['index', 'B-tree index'],
  },
  {
    id: 'full-table-scan',
    term: 'Full table scan',
    short: 'Reading every row of a table to answer a query. Its cost grows in proportion to the table size.',
    long: 'Without a usable index, a filter such as WHERE customer_id = 3 must check every row. SQLite’s query plan shows it as SCAN.',
    introducedIn: 'data/relational/joins-indexes',
    aliases: ['table scan', 'sequential scan', 'SCAN'],
  },
  {
    id: 'query-plan',
    term: 'Query plan',
    short:
      'The steps a database chooses to run a query: which tables to read, in what order, and with which indexes.',
    long: 'SQL says what result you want, not how to compute it; the planner picks the how. EXPLAIN QUERY PLAN in SQLite, or EXPLAIN in PostgreSQL, shows the chosen plan.',
    introducedIn: 'data/relational/joins-indexes',
    aliases: ['execution plan', 'EXPLAIN'],
  },
] satisfies GlossaryTerm[];
