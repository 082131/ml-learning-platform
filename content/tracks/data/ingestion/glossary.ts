import type { GlossaryTerm } from '@/lib/types';

// Glossary terms for the data/ingestion chapter (merged into the glossary by content/index.ts).
export default [
  {
    id: 'rest-api',
    term: 'REST API',
    short:
      'A web service you query with HTTP requests to URLs (GET /orders?page=2), usually answering in JSON.',
    long: 'The usual way to pull data from another company’s system: a CRM, a payment provider, an ad platform. Each response has a status code: 200 is success, 429 means too many requests, 5xx means the server failed.',
    introducedIn: 'data/ingestion/apis-formats',
    aliases: ['http api', 'web api', 'status code'],
  },
  {
    id: 'pagination',
    term: 'Pagination',
    short: 'Splitting a large API result into pages that the client requests one at a time.',
    long: 'The API returns a page and a pointer to the next one (a page number or a cursor). The client follows the pointers until there are none left.',
    introducedIn: 'data/ingestion/apis-formats',
    aliases: ['cursor', 'next page'],
  },
  {
    id: 'exponential-backoff',
    term: 'Exponential backoff',
    short: 'Waiting longer before each retry, doubling the delay each time: 1, 2, 4, 8 seconds.',
    long: 'Short failures cost little and a struggling server is not flooded with retries. Real clients add random jitter so many clients do not retry at the same moment, and cap the number of retries.',
    introducedIn: 'data/ingestion/apis-formats',
    aliases: ['backoff', 'retry with backoff'],
  },
  {
    id: 'idempotent',
    term: 'Idempotent',
    short: 'Safe to repeat: running an operation twice leaves the same result as running it once.',
    long: 'Retries and reruns are normal in pipelines, so every write should be idempotent: an upsert by key or replacing a whole partition, never a blind append.',
    introducedIn: 'data/ingestion/apis-formats',
    aliases: ['idempotency', 'idempotence', 'safe to rerun'],
  },
  {
    id: 'upsert',
    term: 'Upsert',
    short: 'Insert a row, or update the existing row with the same key: "update or insert".',
    long: 'In SQL it is MERGE, or INSERT ... ON CONFLICT (key) DO UPDATE. Writing the same record twice leaves one copy, which makes loads idempotent.',
    introducedIn: 'data/ingestion/apis-formats',
    aliases: ['merge', 'insert on conflict'],
  },
  {
    id: 'schema-drift',
    term: 'Schema drift',
    short:
      'A source changing the shape of its data without warning: a new, missing, renamed or retyped field.',
    long: 'Ingestion should compare incoming records with the expected schema and decide on purpose: fail, adapt (add the column) or set the records aside.',
    introducedIn: 'data/ingestion/apis-formats',
    aliases: ['schema change', 'schema evolution'],
  },
] satisfies GlossaryTerm[];
