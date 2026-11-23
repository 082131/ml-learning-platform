// Code for "Schedules, catchup and backfills". The runs list comes from src/lib/automation/intervals.ts, which
// follows the Airflow 3.4 documentation for the trigger (CronTriggerTimetable) and data-interval
// (CronDataIntervalTimetable) timetables and for catchup (unit-tested). backfill_demo.py runs under CPython 3.13 and
// Pyodide. The DAG and CLI lines target Airflow 3.4 and are not run here.
import { intervalExperiment, type IntervalState } from '@/lib/automation/experiments';
import type { CodeExample } from '@/lib/types';

export const intervals = intervalExperiment('auto-intervals');

export const backfillDemo: CodeExample = {
  id: 'backfill-demo',
  language: 'python',
  run: 'pyodide',
  source: `from datetime import date, timedelta

orders = {  # order day -> revenue of each order (the source system)
    date(2026, 11, 20): [120.0, 80.0],
    date(2026, 11, 21): [200.0],
    date(2026, 11, 22): [50.0, 75.0, 25.0],
}
warehouse = {}  # partition (day) -> daily revenue: what the pipeline writes

def run_for(day):
    """One scheduled run. Everything depends on the day it is FOR, never on today's date."""
    warehouse[day] = sum(orders.get(day, []))      # overwrite the day's partition: idempotent

def backfill(start, end):
    day = start
    while day <= end:                               # inclusive, like airflow backfill create
        run_for(day)
        day += timedelta(days=1)

backfill(date(2026, 11, 20), date(2026, 11, 22))
print("after backfill:", {d.isoformat(): v for d, v in warehouse.items()})

orders[date(2026, 11, 21)].append(30.0)            # a late order arrives for the 21st
run_for(date(2026, 11, 21))                         # rerun that one day
backfill(date(2026, 11, 20), date(2026, 11, 22))    # or the whole range: same result either way
print("after rerun:   ", {d.isoformat(): v for d, v in warehouse.items()})`,
  expectedOutput: `after backfill: {'2026-11-20': 200.0, '2026-11-21': 200.0, '2026-11-22': 150.0}
after rerun:    {'2026-11-20': 200.0, '2026-11-21': 230.0, '2026-11-22': 150.0}`,
  annotations: [
    {
      id: 'parameterised-by-the-period',
      range: { line: 10 },
      kind: 'function',
      title: "Parameterised by the period",
      what: "The run takes the day it is for as its only input.",
      why: "Running it today for November 20 gives the same answer as running it on November 21 did.",
    },
    {
      id: 'overwrite-the-partition',
      range: { line: 12 },
      kind: 'syntax',
      title: "Overwrite the partition",
      what: "Each run replaces its own day and nothing else.",
      why: "Backfills and reruns are then safe by construction: no duplicates, no touching other days.",
    },
    {
      id: 'inclusive-range',
      range: { line: 16 },
      kind: 'syntax',
      title: "Inclusive range",
      what: "Both ends of the backfill window are processed.",
      why: "airflow backfill create treats --from-date and --to-date as inclusive too.",
    },
    {
      id: 'late-data',
      range: { line: 23 },
      kind: 'variable',
      title: "Late data",
      what: "An order for the 21st shows up after the 21st was processed.",
      why: "Rerunning just that day fixes it, because the job is idempotent and partitioned.",
    },
  ],
};

export const intervalDag: CodeExample = {
  id: 'interval-dag',
  language: 'python',
  source: `# dags/daily_revenue.py   (Airflow 3)
import pendulum
from airflow.sdk import dag, task
from airflow.timetables.interval import CronDataIntervalTimetable

@dag(
    # A job that processes a period asks for data intervals explicitly (Airflow 3's default is the trigger timetable).
    schedule=CronDataIntervalTimetable("{{schedule}}", timezone="UTC"),
    start_date=pendulum.datetime(2026, 11, 1, tz="UTC"),
    catchup={{catchup}},
    max_active_runs={{active}},
)
def daily_revenue():
    @task
    def load(data_interval_start=None, data_interval_end=None):
        # Read exactly the interval this run covers, and overwrite that partition.
        rows = read_orders(start=data_interval_start, end=data_interval_end)
        write_partition("daily_revenue", day=data_interval_start.date(), rows=rows)

    load()

daily_revenue()`,
  slots: {
    schedule: (s) => ((s as IntervalState).every === 'day' ? '0 0 * * *' : '0 * * * *'),
    catchup: (s) => ((s as IntervalState).catchup ? 'True' : 'False'),
    active: (s) => String((s as IntervalState).maxActiveRuns),
  },
  annotations: [
    {
      id: 'data-intervals-explicitly',
      range: { line: 8 },
      kind: 'parameter',
      title: "Data intervals, explicitly",
      what: "Each run covers [start, end) and starts after its interval ends. A bare cron string would give Airflow 3’s trigger timetable instead, unless [scheduler] create_cron_data_intervals is True.",
      why: "With the trigger timetable, data_interval_start equals data_interval_end (the tick itself), so a query for that interval would read nothing.",
    },
    {
      id: 'catchup',
      range: { line: 10 },
      kind: 'parameter',
      title: "catchup",
      what: "True creates a run for every period since start_date that has not run; False (the default) only the latest.",
      why: "Turning a DAG on with catchup=True and a start_date months ago launches hundreds of runs at once.",
    },
    {
      id: 'max-active-runs',
      range: { line: 11 },
      kind: 'parameter',
      title: "max_active_runs",
      what: "At most this many runs of the DAG at the same time; the rest queue.",
      why: "Protects the warehouse and the source API during catchup and backfills.",
    },
    {
      id: 'context-by-argument',
      range: { line: 15 },
      kind: 'parameter',
      title: "Context by argument",
      what: "TaskFlow tasks receive context values by naming them as keyword arguments.",
      why: "The task reads its period from the run, never from the clock.",
    },
    {
      id: 'idempotent-write',
      range: { line: 18 },
      kind: 'function',
      title: "Idempotent write",
      what: "Overwrites the day’s partition.",
      why: "A rerun or backfill of that day replaces it rather than appending.",
    },
  ],
};

export const backfillCli: CodeExample = {
  id: 'backfill-cli',
  language: 'bash',
  source: `# Reprocess the first week of November after fixing a bug (Airflow 3)
airflow backfill create --dag-id daily_revenue \\
    --from-date 2026-11-01 --to-date 2026-11-07 \\
    --reprocess-behavior completed \\
    --max-active-runs 2

# Preview what would be created, without creating anything
airflow backfill create --dag-id daily_revenue --from-date 2026-11-01 --to-date 2026-11-07 --dry-run`,
  annotations: [
    {
      id: 'an-inclusive-window',
      range: { line: 3 },
      kind: 'parameter',
      title: "An inclusive window",
      what: "Both dates are included (the CLI reference says so).",
      why: "Seven daily runs, one per logical date.",
    },
    {
      id: 'reprocess-behavior',
      range: { line: 4 },
      kind: 'parameter',
      title: "reprocess-behavior",
      what: "none (the default) creates only missing runs, failed also reruns failed ones, completed reruns every run in the window.",
      why: "After a bug fix you want completed: the old, successful runs are the wrong ones.",
    },
    {
      id: 'pace-the-backfill',
      range: { line: 5 },
      kind: 'parameter',
      title: "Pace the backfill",
      what: "At most two backfill runs at a time, independently of the DAG’s own max_active_runs.",
      why: "A backfill should not starve the regular nightly run or overload the source system.",
    },
    {
      id: 'dry-run',
      range: { line: 8 },
      kind: 'parameter',
      title: "--dry-run",
      what: "Lists the runs the backfill would create.",
      why: "The same habit as the CLI scripts lesson: preview before acting.",
    },
  ],
};
