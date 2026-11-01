import type { LessonMeta } from '@/lib/types';

export default {
  id: 'data/quality/observability-testing',
  title: 'Data quality, lineage, observability and pipeline tests',
  level: 'advanced',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Write data quality checks for freshness, volume, schema and value ranges',
    'Trace lineage from a report back to the sources and transforms that produced it',
    'Unit-test transform code and run data tests on every pipeline run',
    'Choose which failures should stop a pipeline and which should only alert',
  ],
  prerequisites: ['data/orchestration/dags-retries'],
  concepts: [
    'data-test',
    'data-freshness',
    'data-observability',
    'circuit-breaker',
    'data-lineage',
    'validation-rule',
    'quarantine',
  ],
  references: [
    {
      title: 'dbt: data tests',
      url: 'https://docs.getdbt.com/docs/build/data-tests',
      version: 'dbt 1.8 and later',
    },
    {
      title: 'dbt: source freshness',
      url: 'https://docs.getdbt.com/reference/resource-properties/freshness',
      version: 'dbt 1.8 and later',
    },
    {
      title: 'pytest: how to write and report assertions',
      url: 'https://docs.pytest.org/en/stable/how-to/assert.html',
      version: 'pytest 9.2',
    },
    {
      title: 'Python: statistics.median',
      url: 'https://docs.python.org/3.13/library/statistics.html#statistics.median',
      version: 'Python 3.13',
    },
    { title: 'OpenLineage: an open standard for lineage metadata', url: 'https://openlineage.io/docs/' },
    {
      title: 'Great Expectations: expectations',
      url: 'https://docs.greatexpectations.io/docs/reference/learn/terms/expectation',
    },
  ],
} satisfies LessonMeta;
