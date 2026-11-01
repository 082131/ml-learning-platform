import type { GlossaryTerm } from '@/lib/types';

// Glossary terms for the data/python-sql chapter (merged into the glossary by content/index.ts).
export default [
  {
    id: 'sql',
    term: 'SQL',
    short:
      'The language for asking a relational database questions: SELECT columns FROM a table WHERE rows match.',
    long: 'SQL says what result you want, not how to compute it; the database chooses how. Almost every database and warehouse speaks a dialect of it.',
    introducedIn: 'data/python-sql/formats-sql-intro',
    aliases: ['structured query language', 'select statement'],
  },
  {
    id: 'table-schema',
    term: 'Schema (table)',
    short: 'The declared shape of a table: its columns, their types and constraints such as primary keys.',
    long: 'A schema is a contract every row must meet. Queries and pipelines rely on it, and a change to it (a renamed or retyped column) can break everything downstream.',
    introducedIn: 'data/python-sql/formats-sql-intro',
    aliases: ['schema', 'column types'],
  },
  {
    id: 'group-by',
    term: 'GROUP BY',
    short:
      'A SQL clause that collapses rows with the same value in a column into one row, with aggregates such as COUNT and SUM.',
    long: 'WHERE filters rows before grouping; HAVING filters the groups afterwards.',
    introducedIn: 'data/python-sql/formats-sql-intro',
    aliases: ['aggregate', 'aggregation'],
  },
  {
    id: 'csv-format',
    term: 'CSV',
    short: 'Comma-separated values: plain text, one line per row, with no stored types.',
    long: 'Universal and readable, but every value is text: readers must guess types, and commas, quotes and line breaks inside values need escaping.',
    introducedIn: 'data/python-sql/formats-sql-intro',
    aliases: ['comma-separated values'],
  },
  {
    id: 'json-format',
    term: 'JSON',
    short:
      'A text format of nested objects, lists, strings, numbers, booleans and null; the usual format of web APIs.',
    long: 'JSON keeps basic types and nesting, but repeats every key in every record. JSON Lines puts one object per line so files can be split and streamed.',
    introducedIn: 'data/python-sql/formats-sql-intro',
    aliases: ['json lines', 'jsonl'],
  },
  {
    id: 'parquet',
    term: 'Parquet',
    short: 'A binary, compressed, column-oriented file format that stores its schema inside the file.',
    long: 'Values of one column are stored together, so they compress well and a reader can fetch only the columns and row groups it needs. The usual format of data lakes.',
    introducedIn: 'data/python-sql/formats-sql-intro',
    aliases: ['apache parquet', 'columnar file'],
  },
] satisfies GlossaryTerm[];
