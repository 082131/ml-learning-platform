// Code for the orchestration lesson. scheduler.py is pure Python; its output for every setting was produced
// with CPython 3.13.18 (dag.test.ts checks the browser's run against it). The Airflow DAG follows the
// Airflow 3.3 Task SDK (apache-airflow-task-sdk 1.3.2) signatures and is not run here.
import { DAG_SOURCE, dagExperiment, dagSlots, type DagState } from '@/lib/data/dag';
import type { CodeExample } from '@/lib/types';

export const dag = dagExperiment('dag');

const st = (s: unknown) => s as DagState;

export const schedulerPython: CodeExample = {
  id: 'scheduler-python',
  language: 'python',
  source: DAG_SOURCE,
  slots: {
    retries: (s) => dagSlots(st(s)).retries,
    failing: (s) => dagSlots(st(s)).failing,
    fails: (s) => dagSlots(st(s)).fails,
  },
  annotations: [
    {
      id: 'tasks',
      range: { line: 1 },
      kind: 'variable',
      title: 'TASKS',
      what: 'Each task with how long it runs and the tasks it depends on. Together the dependencies form a DAG.',
      why: 'Writing dependencies down, instead of relying on start times, is what lets a scheduler run tasks in the right order, in parallel where possible.',
    },
    {
      id: 'all-done',
      range: { line: 11 },
      kind: 'variable',
      title: 'ALL_DONE',
      what: 'Tasks with the all_done trigger rule: they run once upstream tasks finish, even if some failed.',
      why: 'An alert or cleanup step must run precisely when something went wrong. The default rule (all_success) would skip it.',
    },
    {
      id: 'retries',
      range: { line: 12, startCol: 10, endCol: 21 },
      match: '{{retries}}',
      kind: 'parameter',
      title: 'RETRIES',
      what: 'How many more times a failed task is tried. Filled from the slider.',
      why: 'Most failures in pipelines are temporary: a timeout, a busy database. One or two retries absorb them.',
    },
    {
      id: 'failing',
      range: { line: 14, startCol: 11, endCol: 22 },
      match: '{{failing}}',
      kind: 'parameter',
      title: 'FAILING',
      what: 'The task that fails, chosen in the controls.',
      why: 'A scripted failure makes the scheduler’s behavior repeatable.',
    },
    {
      id: 'fails',
      range: { line: 15, startCol: 8, endCol: 17 },
      match: '{{fails}}',
      kind: 'parameter',
      title: 'FAILS',
      what: 'How many attempts fail before one succeeds. 4 is more than any retry setting allows: a real bug.',
      why: 'Retries help with a temporary failure (1 or 2), not with a bug that fails every time.',
    },
    {
      id: 'start',
      range: { line: 19 },
      kind: 'math',
      title: 'max(end[u] for u in upstream)',
      what: 'A task starts when its last upstream task ends. Tasks with no upstream start at minute 0.',
      why: 'extract_orders and extract_customers run at the same time; validate waits for the slower one.',
    },
    {
      id: 'upstream-failed',
      range: { line: 20 },
      kind: 'syntax',
      title: 'upstream_failed',
      what: 'If any upstream task did not succeed, the task is not run at all.',
      why: 'Running load_warehouse on top of a failed transform would load wrong or partial data.',
    },
    {
      id: 'backoff',
      range: { line: 31 },
      kind: 'math',
      title: 'RETRY_DELAY * 2 ** attempt',
      what: 'The wait before the next attempt: 1, 2, 4 minutes.',
      why: 'Waiting gives a busy database or API time to recover; doubling keeps retries from piling on.',
    },
    {
      id: 'for-else',
      range: { line: 32 },
      kind: 'syntax',
      title: 'for ... else',
      what: 'The else branch runs only if the loop ended without break, that is, if no attempt succeeded.',
      why: 'After the last retry fails, the task is marked failed and its downstream tasks will not run.',
    },
  ],
};

export const airflowDag: CodeExample = {
  id: 'airflow-dag',
  language: 'python',
  source: `from datetime import datetime, timedelta

from airflow.sdk import dag, task


@dag(schedule="@daily", start_date=datetime(2026, 10, 1), catchup=False,
     default_args={"retries": 2, "retry_delay": timedelta(minutes=1), "retry_exponential_backoff": 2.0})
def orders_pipeline():
    @task
    def extract_orders(ds=None):  # ds: the run's logical date, "2026-10-24"
        return f"raw/orders/day={ds}/"

    @task
    def extract_customers(ds=None):
        return f"raw/customers/day={ds}/"

    @task
    def validate(orders_path, customers_path):
        ...

    @task
    def transform(checked):
        ...

    @task
    def load_warehouse(rows):
        ...  # overwrite this day's partition: safe to rerun

    @task
    def report(loaded): ...

    @task
    def features(loaded): ...

    @task(trigger_rule="all_done")
    def notify(report_done, features_done): ...

    loaded = load_warehouse(transform(validate(extract_orders(), extract_customers())))
    notify(report(loaded), features(loaded))


orders_pipeline()`,
  annotations: [
    {
      id: 'dag',
      range: { line: 6 },
      kind: 'framework',
      title: '@dag(schedule="@daily", ...)',
      what: 'Declares the pipeline and runs it once per day, for each day from start_date.',
      why: 'catchup=False means Airflow does not create runs for past days it missed; set it to True, or trigger a backfill, when you want them.',
    },
    {
      id: 'default-args',
      range: { line: 7 },
      kind: 'parameter',
      title: 'default_args',
      what: 'Retry settings for every task: 2 retries, waiting 1 minute and doubling after each failure.',
      why: 'In the Task SDK, retry_exponential_backoff is a multiplier: 2.0 doubles the delay, 0 keeps it constant.',
    },
    {
      id: 'ds',
      range: { line: 10 },
      kind: 'parameter',
      title: 'ds',
      what: 'The logical date of the run, as text. Airflow fills it in.',
      why: 'Tasks process "the data for this date", not "the data up to now", so a rerun of 24 October processes 24 October again.',
    },
    {
      id: 'deps',
      range: { line: 38 },
      kind: 'syntax',
      title: 'Dependencies from function calls',
      what: 'Passing one task’s result into another makes it a dependency, which builds the same DAG as the simulator.',
      why: 'The scheduler reads these edges to decide what can run now and what has to wait.',
    },
    {
      id: 'trigger-rule',
      range: { line: 35 },
      kind: 'framework',
      title: 'trigger_rule="all_done"',
      what: 'notify runs once report and features finish, whatever their outcome.',
      why: 'The default all_success would skip notify exactly when there is something to report.',
    },
  ],
};

export const backfillRunner: CodeExample = {
  id: 'backfill-runner',
  language: 'python',
  run: 'pyodide',
  source: `sales = {"2026-10-01": [30, 45], "2026-10-02": [12], "2026-10-03": [8, 20]}


def daily_job_append(table, day):
    table.append((day, sum(sales[day])))


def daily_job_overwrite(table, day):
    table[:] = [row for row in table if row[0] != day]  # replace that day's rows
    table.append((day, sum(sales[day])))


for job in (daily_job_append, daily_job_overwrite):
    table = []
    for day in sales:  # the three scheduled daily runs
        job(table, day)
    for day in ["2026-10-02", "2026-10-03"]:  # a backfill reruns two days after a bug fix
        job(table, day)
    print(f"{job.__name__}: {len(table)} rows, total {sum(r[1] for r in table)}")`,
  annotations: [],
  expectedOutput: `daily_job_append: 5 rows, total 155
daily_job_overwrite: 3 rows, total 115`,
};
