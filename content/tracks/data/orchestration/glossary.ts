import type { GlossaryTerm } from '@/lib/types';

// Glossary terms for the data/orchestration chapter (merged into the glossary by content/index.ts).
export default [
  {
    id: 'dag',
    term: 'DAG (directed acyclic graph)',
    short:
      'Tasks joined by one-way dependency arrows, with no loops: the shape of a pipeline an orchestrator runs.',
    long: '"Directed" means each arrow says which task must finish first; "acyclic" means you can never follow arrows back to where you started, so there is always a valid order to run the tasks in.',
    introducedIn: 'data/orchestration/dags-retries',
    aliases: ['directed acyclic graph', 'task graph', 'dependency graph'],
  },
  {
    id: 'orchestrator',
    term: 'Orchestrator',
    short:
      'A system that runs pipeline tasks on a schedule, in dependency order, with retries, alerts and history.',
    long: 'Examples are Apache Airflow, Dagster and Prefect, and cloud services built on them. The orchestrator decides when and in what order tasks run; the tasks do the actual work.',
    introducedIn: 'data/orchestration/dags-retries',
    aliases: ['workflow orchestration', 'airflow', 'scheduler'],
  },
  {
    id: 'trigger-rule',
    term: 'Trigger rule',
    short: 'The condition on upstream tasks that lets a task run: by default all must succeed (all_success).',
    long: 'Other rules let a task run when all upstream tasks are done whatever their outcome (all_done), for alerts and cleanup, or when at least one failed (one_failed).',
    introducedIn: 'data/orchestration/dags-retries',
    aliases: ['all_success', 'all_done', 'upstream_failed'],
  },
  {
    id: 'backfill',
    term: 'Backfill',
    short:
      'Running a pipeline for past dates: to fill history for a new pipeline, or to reprocess days after a fix.',
    long: 'Each run processes its own logical date, so a backfill is many ordinary runs. It is only safe when each run replaces its date’s output instead of adding to it.',
    introducedIn: 'data/orchestration/dags-retries',
    aliases: ['catchup', 'reprocessing'],
  },
] satisfies GlossaryTerm[];
