import type { LessonMeta } from '@/lib/types';

export default {
  id: 'data/python-sql/formats-sql-intro',
  title: 'Python for data, SQL and data formats overview',
  level: 'beginner',
  minutes: 35,
  kind: 'lesson',
  objectives: [
    'Write SELECT queries that filter with WHERE, sort with ORDER BY and summarize with GROUP BY',
    'Compare CSV, JSON and Parquet on schema, size and read speed for a given use',
    'Load a query result into a pandas DataFrame and write a DataFrame back to a SQL table',
    'Explain what a table schema and column types guarantee about the data',
  ],
  prerequisites: ['ml/foundations/pandas-dataframes'],
  concepts: ['sql', 'table-schema', 'group-by', 'csv-format', 'json-format', 'parquet', 'dataframe'],
  references: [
    {
      title: 'Python: sqlite3 (DB-API 2.0 interface for SQLite)',
      url: 'https://docs.python.org/3.13/library/sqlite3.html',
      version: 'Python 3.13',
    },
    {
      title: 'SQLite: the SELECT statement',
      url: 'https://www.sqlite.org/lang_select.html',
      version: 'SQLite 3.53',
    },
    {
      title: 'pandas: read_sql',
      url: 'https://pandas.pydata.org/docs/reference/api/pandas.read_sql.html',
      version: 'pandas 3.0',
    },
    {
      title: 'pandas: DataFrame.to_sql',
      url: 'https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.to_sql.html',
      version: 'pandas 3.0',
    },
    {
      title: 'Apache Parquet: file format documentation',
      url: 'https://parquet.apache.org/docs/file-format/',
    },
    { title: 'RFC 4180: the CSV format', url: 'https://www.rfc-editor.org/rfc/rfc4180' },
    { title: 'RFC 8259: the JSON format', url: 'https://www.rfc-editor.org/rfc/rfc8259' },
  ],
} satisfies LessonMeta;
