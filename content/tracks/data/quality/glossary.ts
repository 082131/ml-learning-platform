import type { GlossaryTerm } from '@/lib/types';

// Glossary terms for the data/quality chapter (merged into the glossary by content/index.ts).
export default [
  {
    id: 'data-freshness',
    term: 'Freshness (data)',
    short: 'How old the newest data in a table is; a freshness check fails when it is older than expected.',
    long: 'A source that stops sending raises no error: the pipeline keeps reloading old data and every run looks green. Freshness is the check that notices.',
    introducedIn: 'data/quality/observability-testing',
    aliases: ['stale data', 'data latency'],
  },
  {
    id: 'data-test',
    term: 'Data test',
    short:
      'A check run against the data itself on every pipeline run: uniqueness, not-null, allowed values, ranges, row counts.',
    long: 'Unit tests check the code with hand-made inputs; data tests check what actually arrived. Tools such as dbt and Great Expectations declare them next to the tables.',
    introducedIn: 'data/quality/observability-testing',
    aliases: ['data quality check', 'dbt test', 'expectation'],
  },
  {
    id: 'data-observability',
    term: 'Data observability',
    short:
      'Watching pipelines through freshness, volume, schema, distribution and lineage, to notice problems before users do.',
    long: 'Like monitoring for services, but for tables: each run records metrics, alerts fire on anomalies, and lineage shows which reports and models are affected.',
    introducedIn: 'data/quality/observability-testing',
    aliases: ['data monitoring'],
  },
  {
    id: 'circuit-breaker',
    term: 'Circuit breaker (pipeline)',
    short:
      'Stopping a pipeline from publishing when a blocking check fails, so downstream tables keep their last good data.',
    long: 'Stale but correct is usually better than fresh but wrong. Reserve blocking for failures that make the data wrong; warn on ones that only make it unusual.',
    introducedIn: 'data/quality/observability-testing',
    aliases: ['blocking check', 'write-audit-publish'],
  },
] satisfies GlossaryTerm[];
