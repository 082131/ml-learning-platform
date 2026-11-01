import type { GlossaryTerm } from '@/lib/types';

// Glossary terms for the data/storage chapter (merged into the glossary by content/index.ts).
export default [
  {
    id: 'data-lake',
    term: 'Data lake',
    short:
      'Cheap object storage holding files in open formats (Parquet, JSON, CSV), read by whatever engine you choose.',
    long: 'Storage and compute are separate: the files sit in a bucket and engines such as Spark, DuckDB or Trino read them. Nothing enforces a schema or transactions on plain files, so lakes without discipline become "swamps".',
    introducedIn: 'data/storage/warehouse-lake-lakehouse',
    aliases: ['lake', 'object store data'],
  },
  {
    id: 'lakehouse',
    term: 'Lakehouse',
    short:
      'A data lake with a table format on top, adding warehouse features: transactions, schemas, updates and history.',
    long: 'The data stays in open Parquet files in cheap storage; a table format (Delta Lake, Apache Iceberg, Apache Hudi) adds a log or metadata layer so many engines can read and write them safely.',
    introducedIn: 'data/storage/warehouse-lake-lakehouse',
  },
  {
    id: 'table-format',
    term: 'Table format',
    short:
      'A metadata layer (Delta Lake, Apache Iceberg, Apache Hudi) that turns a set of data files into a table with versions.',
    long: 'Each commit records which files make up the table. Readers see whole versions only (atomic commits), old versions stay readable (time travel), and the schema is checked on write.',
    introducedIn: 'data/storage/warehouse-lake-lakehouse',
    aliases: ['delta lake', 'apache iceberg', 'iceberg', 'hudi', 'time travel'],
  },
  {
    id: 'file-partitioning',
    term: 'Partitioning (files)',
    short:
      'Storing a table’s files in folders by a column’s value, such as day=2026-10-24, so filters on that column can skip whole folders.',
    long: 'Partition by a column most queries filter on, with a moderate number of distinct values. Too many small partitions slow everything down (the small-files problem).',
    introducedIn: 'data/storage/warehouse-lake-lakehouse',
    aliases: ['partition pruning', 'hive partitioning'],
  },
  {
    id: 'columnar-storage',
    term: 'Columnar storage',
    short:
      'Storing each column’s values together instead of each row’s, so a query reads only the columns it uses.',
    long: 'Similar values sit next to each other, so they compress well. Warehouses and Parquet files are columnar; transactional databases usually store rows.',
    introducedIn: 'data/storage/warehouse-lake-lakehouse',
    aliases: ['column store', 'column pruning'],
  },
] satisfies GlossaryTerm[];
