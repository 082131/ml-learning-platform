import type { GlossaryTerm } from '@/lib/types';

// Glossary terms for the automation/pipelines chapter (merged into the glossary by content/index.ts).
export default [
  {
    id: 'topological-order',
    term: 'Topological order',
    short: 'An order of a DAG’s tasks in which every task comes after all the tasks it depends on. A graph with a cycle has none.',
    introducedIn: 'automation/pipelines/dag-orchestration',
    aliases: ['topological sort'],
  },
  {
    id: 'critical-path',
    term: 'Critical path',
    short: 'The longest chain of dependent tasks in a DAG, by duration. No number of workers can make a run shorter than it.',
    introducedIn: 'automation/pipelines/dag-orchestration',
  },
  {
    id: 'upstream-failed',
    term: 'upstream_failed',
    short: 'Airflow’s state for a task that never ran because a task it depends on failed (with the default all_success trigger rule).',
    introducedIn: 'automation/pipelines/dag-orchestration',
  },
  {
    id: 'logical-date',
    term: 'Logical date',
    short: 'The date a pipeline run is FOR, as opposed to when it actually runs. Reruns and backfills of a day keep its logical date, so the task processes the same data.',
    introducedIn: 'automation/pipelines/schedules-backfills',
    aliases: ['execution date', 'ds'],
  },
  {
    id: 'data-interval',
    term: 'Data interval',
    short: 'The span of time a scheduled run covers, such as [2026-11-22 00:00, 2026-11-23 00:00). With interval timetables the run starts after the interval ends.',
    introducedIn: 'automation/pipelines/schedules-backfills',
  },
  {
    id: 'catchup',
    term: 'Catchup',
    short: 'Whether a scheduler creates runs for every period since the start date that has not run yet (True), or only the latest one (False, the Airflow 3 default).',
    introducedIn: 'automation/pipelines/schedules-backfills',
  },
] satisfies GlossaryTerm[];
