// Code for the Automation capstone. The DAG view reuses src/lib/automation/dag.ts and the gate view
// src/lib/automation/gates.ts (both unit-tested); durations and metrics are illustrative. The layout and Makefile
// are a suggested starting point, not something run here.
import { dagExperiment, gateExperiment } from '@/lib/automation/experiments';
import type { CodeExample, ProjectBrief } from '@/lib/types';

export const capstoneDag = dagExperiment('auto-capstone-dag');
export const capstoneGate = gateExperiment('auto-capstone-gate');

export const layout: CodeExample = {
  id: 'capstone-layout',
  language: 'bash',
  source: `churn-automation/
├── pipeline/
│   ├── extract.py         # CLI: --day 2026-11-22 --dry-run; retries with backoff; exits non-zero on failure
│   ├── validate.py        # schema, keys, ranges, drift vs the baseline; non-zero exit stops the run
│   ├── score.py           # nightly: overwrite scores/day=YYYY-MM-DD/ atomically
│   ├── train.py           # weekly: train the challenger on a pinned data snapshot
│   └── promote.py         # the release gate; moves the registry alias
├── dags/nightly.py        # Airflow 3 (or flows/nightly.py with Prefect): retries, max_active_runs=1
├── tests/                 # unit, data-contract, smoke-train, rerun and backfill tests
├── .github/workflows/
│   ├── ci.yml             # every PR: lint, tests, smoke train, evaluate
│   └── deliver.yml        # weekly + manual: retrain, gate, staging, approval, canary
├── agent-policy.yaml      # optional on-call agent: read-only first
└── RUNBOOK.md             # what each alert means and what to do`,
  annotations: [
    {
      id: 'cli',
      range: { line: 3 },
      kind: 'function',
      title: 'Every step is a CLI',
      what: 'Each step runs by hand, from the orchestrator, or in CI with the same arguments.',
      why: 'From the CLI scripts lesson: inputs as arguments, a dry run, honest exit codes.',
    },
    {
      id: 'score',
      range: { line: 5 },
      kind: 'function',
      title: 'Idempotent output',
      what: 'One partition per day, replaced atomically.',
      why: 'Reruns and backfills are safe by construction (rerun-safe jobs, backfills).',
    },
    {
      id: 'promote',
      range: { line: 7 },
      kind: 'function',
      title: 'The gate',
      what: 'Champion versus challenger on the same evaluation set; blocks with a non-zero exit.',
      why: 'From the model delivery lesson.',
    },
    {
      id: 'runbook',
      range: { line: 14 },
      kind: 'syntax',
      title: 'RUNBOOK.md',
      what: 'The first rung of the automation ladder stays: what to do when the automation itself fails.',
      why: 'Automation moves the manual work to the rare failures; the runbook makes those fast.',
    },
  ],
};

export const brief: ProjectBrief = {
  goal: 'Automate a churn model’s daily life: score every customer each night, retrain weekly, and ship a new model only when it is better, so that nobody has to remember anything and every failure is noticed.',
  dataset:
    'Any tabular churn dataset you may use (for example the IBM Telco Customer Churn sample), split by a date column into daily batches so the pipeline has something new to process each "night". A local SQLite or DuckDB file can stand in for the warehouse.',
  milestones: [
    'Scripts: turn extract, validate, score and train into CLIs with --day, --dry-run, logging and exit codes. Unit-test the decision functions.',
    'Reliability: wrap the source reads in retries with exponential backoff and jitter, with timeouts. Write scores to a day partition atomically. Show a crash-and-rerun leaves exactly one copy of each row.',
    'Orchestration: a nightly DAG (extract → validate → score, plus report) with retries, max_active_runs=1 and tasks that read the run’s data interval. Backfill one past week with a concurrency limit.',
    'CI: a pull request workflow with lint, unit and data-contract tests, a smoke training run on a small sample, and an evaluation floor. Make the checks required.',
    'Delivery: a weekly (and manual) workflow that retrains, runs the gate against the production model on the same data, deploys to staging, waits for approval and promotes by alias.',
    'Observability: alerts on non-zero exits, a heartbeat that fires when the nightly run does not report, and a RUNBOOK.md with one entry per alert.',
    'Optional: a read-only on-call agent that summarises a failed run’s logs, with its policy file and budgets.',
  ],
  rubric: [
    { criterion: 'Rerun safety', detail: 'Running any night twice, or crashing it halfway and rerunning it, leaves identical output. A test proves it.' },
    { criterion: 'Time correctness', detail: 'No task reads the clock to decide what to process; a backfill of a past week writes those days and only those days.' },
    { criterion: 'Failure visibility', detail: 'A broken source, bad data, a failed gate and a run that never started each produce a distinct alert with a runbook entry.' },
    { criterion: 'Release discipline', detail: 'No model reaches production without passing CI, the gate (including slices and latency) and a recorded approval.' },
    { criterion: 'Payback', detail: 'A short note estimating the hours saved per month against the build and upkeep, as in the first lesson.' },
  ],
  hints: [
    'Build the CLIs first and run them by hand for three days of data before adding any scheduler.',
    'Keep DAG files thin: each task calls a CLI or a function from pipeline/, so everything is testable without the orchestrator.',
    'Write the rerun test early: run score for a day twice and assert the table did not change.',
    'For the failure drill, point extract at a URL that returns 503 and confirm the retries, the final failure, and the alert.',
  ],
};
