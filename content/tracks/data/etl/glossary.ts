import type { GlossaryTerm } from '@/lib/types';

// Glossary terms for the data/etl chapter (merged into the glossary by content/index.ts).
export default [
  {
    id: 'etl',
    term: 'ETL (extract, transform, load)',
    short: 'A pipeline that cleans and reshapes data in its own code before loading it into the destination.',
    long: 'Only transformed rows reach the warehouse. The transform runs on pipeline machines, in Python or another language, so the warehouse never sees the raw data.',
    introducedIn: 'data/etl/etl-vs-elt',
    aliases: ['extract transform load'],
  },
  {
    id: 'elt',
    term: 'ELT (extract, load, transform)',
    short: 'A pipeline that loads raw data into the warehouse first and transforms it there, usually in SQL.',
    long: 'The raw copy stays in the warehouse, so a fixed transform can be rerun without extracting again. Common with cloud warehouses, whose compute makes in-warehouse SQL cheap.',
    introducedIn: 'data/etl/etl-vs-elt',
    aliases: ['extract load transform'],
  },
  {
    id: 'validation-rule',
    term: 'Validation rule',
    short:
      'A check every record must pass before it is used: a required field, a format, a range, an allowed value or uniqueness.',
    long: 'Rules turn assumptions about data into tests that run on every batch. A rule only catches what it tests: a format check accepts 4550 when 45.50 was meant, and only a range check catches it.',
    introducedIn: 'data/etl/etl-vs-elt',
    aliases: ['data validation', 'data quality check'],
  },
  {
    id: 'quarantine',
    term: 'Quarantine (data)',
    short:
      'A separate place where records that fail validation are kept, unchanged and with the reason, instead of being loaded or dropped.',
    long: 'Quarantine lets the rest of a batch load while bad records wait to be inspected, fixed and replayed. Its size per batch is itself a useful data quality signal.',
    introducedIn: 'data/etl/etl-vs-elt',
    aliases: ['dead letter', 'reject table'],
  },
  {
    id: 'data-warehouse',
    term: 'Data warehouse',
    short:
      'A database built for analysis: large tables, SQL queries over many rows, and data loaded from many sources.',
    long: 'Examples are BigQuery, Snowflake, Redshift and, at small scale, an analytics database such as DuckDB or SQLite. Pipelines load data into it so reports and models read one consistent copy.',
    introducedIn: 'data/storage/warehouse-lake-lakehouse',
    aliases: ['warehouse'],
  },
] satisfies GlossaryTerm[];
