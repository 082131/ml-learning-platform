import type { LessonMeta } from '@/lib/types';

export default {
  id: 'data/ingestion/apis-formats',
  title: 'APIs, JSON, CSV, Parquet and ingestion',
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Ingest every page of a paginated REST API, with retries and rate limits',
    'Choose between CSV, JSON and Parquet for landing data, and explain the trade-offs',
    'Detect a schema change in incoming data and decide whether to fail, adapt or set the data aside',
    'Make an ingestion job safe to rerun without creating duplicate rows',
  ],
  prerequisites: ['data/relational/joins-indexes'],
  concepts: [
    'rest-api',
    'pagination',
    'exponential-backoff',
    'idempotent',
    'upsert',
    'schema-drift',
    'parquet',
  ],
  references: [
    {
      title: 'Requests: timeouts, sessions and Response.raise_for_status',
      url: 'https://requests.readthedocs.io/en/latest/user/advanced/',
      version: 'requests 2.32',
    },
    {
      title: 'RFC 9110: HTTP semantics (status codes, Retry-After)',
      url: 'https://www.rfc-editor.org/rfc/rfc9110#name-retry-after',
    },
    {
      title: 'RFC 6585: 429 Too Many Requests',
      url: 'https://www.rfc-editor.org/rfc/rfc6585#section-4',
    },
    {
      title: 'Python: csv module (every value is read as a string)',
      url: 'https://docs.python.org/3.13/library/csv.html',
      version: 'Python 3.13',
    },
    {
      title: 'PostgreSQL: INSERT ... ON CONFLICT (upsert)',
      url: 'https://www.postgresql.org/docs/current/sql-insert.html#SQL-ON-CONFLICT',
      version: 'PostgreSQL 17 and later',
    },
    {
      title: 'AWS Architecture Blog: exponential backoff and jitter',
      url: 'https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/',
    },
  ],
} satisfies LessonMeta;
