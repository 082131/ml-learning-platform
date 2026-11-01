import type { LessonMeta } from '@/lib/types';

export default {
  id: 'data/storage/warehouse-lake-lakehouse',
  title: 'Warehouses, lakes and lakehouses',
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Compare a data warehouse, a data lake and a lakehouse on cost, schema enforcement and query speed',
    'Choose a storage architecture for a given use case and justify it',
    'Explain what a table format such as Delta Lake or Apache Iceberg adds on top of Parquet files',
    'Explain how partitioning files by a column speeds up queries that filter on it',
  ],
  prerequisites: ['data/etl/etl-vs-elt'],
  concepts: [
    'data-warehouse',
    'data-lake',
    'lakehouse',
    'table-format',
    'file-partitioning',
    'columnar-storage',
    'elt',
  ],
  references: [
    {
      title: 'DuckDB: reading Parquet files and Hive partitioning',
      url: 'https://duckdb.org/docs/stable/data/partitioning/hive_partitioning',
      version: 'DuckDB 2.0',
    },
    {
      title: 'Apache Arrow: pyarrow.dataset.write_dataset (partitioned datasets)',
      url: 'https://arrow.apache.org/docs/python/generated/pyarrow.dataset.write_dataset.html',
      version: 'pyarrow 26.0',
    },
    {
      title: 'Apache Parquet: file format and metadata',
      url: 'https://parquet.apache.org/docs/file-format/',
    },
    {
      title: 'Delta Lake: transaction log protocol',
      url: 'https://github.com/delta-io/delta/blob/master/PROTOCOL.md',
    },
    {
      title: 'delta-rs (deltalake for Python): usage',
      url: 'https://delta-io.github.io/delta-rs/usage/overview/',
      version: 'deltalake 1.6',
    },
    { title: 'Apache Iceberg: table spec', url: 'https://iceberg.apache.org/spec/' },
    {
      title: 'Armbrust et al., Lakehouse: a new generation of open platforms (CIDR 2021)',
      url: 'https://www.cidrdb.org/cidr2021/papers/cidr2021_paper17.pdf',
    },
  ],
} satisfies LessonMeta;
