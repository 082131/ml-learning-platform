// Code for "Orchestrating pipelines as DAGs". The Gantt chart comes from src/lib/automation/dag.ts, a small
// discrete-event scheduler with Airflow's retry, trigger-rule and DAG-run-state rules (unit-tested); durations are
// assumptions. dag_demo.py uses the standard library's graphlib and runs under CPython 3.13 and Pyodide. The
// Airflow file targets Airflow 3 (the airflow.sdk imports) and the Prefect file Prefect 3; neither runs here.
import { dagExperiment, type DagState } from '@/lib/automation/experiments';
import type { CodeExample } from '@/lib/types';

export const dag = dagExperiment('auto-dag');

export const dagDemo: CodeExample = {
  id: 'dag-demo',
  language: 'python',
  run: 'pyodide',
  source: `from graphlib import TopologicalSorter, CycleError

# task -> the tasks it depends on (its upstream). Tuples, not sets, keep the order reproducible.
deps = {
    "extract": (),
    "validate": ("extract",),
    "features": ("extract",),
    "labels": ("extract",),
    "train": ("validate", "features", "labels"),
    "evaluate": ("train",),
    "report": ("validate",),
    "notify": ("evaluate", "report"),
}
minutes = {"extract": 4, "validate": 2, "features": 5, "labels": 3, "train": 8, "evaluate": 3, "report": 2, "notify": 1}

order = list(TopologicalSorter(deps).static_order())
print("one valid order:", " -> ".join(order))

# Earliest finish of each task with unlimited workers: the longest path to it.
finish = {}
for t in order:
    finish[t] = max((finish[u] for u in deps[t]), default=0) + minutes[t]
print("critical path length:", max(finish.values()), "min")
print("total work:", sum(minutes.values()), "min")

try:
    list(TopologicalSorter({**deps, "extract": ("notify",)}).static_order())
except CycleError as e:
    print("cycle:", " -> ".join(e.args[1]))`,
  expectedOutput: `one valid order: extract -> validate -> features -> labels -> report -> train -> evaluate -> notify
critical path length: 21 min
total work: 28 min
cycle: extract -> validate -> train -> evaluate -> notify -> extract`,
  annotations: [
    {
      id: 'the-dag-as-data',
      range: { line: 4 },
      kind: 'variable',
      title: "The DAG as data",
      what: "Each task maps to the tasks that must finish before it.",
      why: "This dictionary is all an orchestrator needs to know about order; everything else is scheduling.",
    },
    {
      id: 'graphlib',
      range: { line: 16 },
      kind: 'framework',
      title: "graphlib",
      what: "The standard library’s topological sort (Python 3.9+).",
      why: "Any order it returns respects every dependency. Several orders are usually valid.",
    },
    {
      id: 'longest-path',
      range: { line: 22 },
      kind: 'math',
      title: "Longest path",
      what: "A task can finish no earlier than its slowest upstream task plus its own duration.",
      why: "The largest finish time is the critical path: the run cannot be faster, however many workers you add.",
    },
    {
      id: 'cycles-are-errors',
      range: { line: 28 },
      kind: 'syntax',
      title: "Cycles are errors",
      what: "Making extract depend on notify closes a loop, and graphlib reports it.",
      why: "Orchestrators refuse to load a DAG with a cycle for the same reason: there is no valid first task.",
    },
  ],
};

export const airflowDag: CodeExample = {
  id: 'airflow-dag',
  language: 'python',
  source: `# dags/nightly_retrain.py   (Airflow 3)
from datetime import timedelta

import pendulum
from airflow.sdk import dag, task

@dag(
    schedule="0 2 * * *",
    start_date=pendulum.datetime(2026, 11, 1, tz="UTC"),
    catchup=False,
    max_active_runs=1,
    default_args={"retries": {{retries}}, "retry_delay": timedelta(minutes={{delay}})},
)
def nightly_retrain():
    @task
    def extract(): ...
    @task
    def validate(path): ...
    @task
    def features(path): ...
    @task
    def labels(path): ...
    @task
    def train(checked, feats, labs): ...
    @task
    def evaluate(model): ...
    @task
    def report(checked): ...
    @task(trigger_rule="{{rule}}")
    def notify(metrics, summary): ...

    raw = extract()
    checked = validate(raw)
    model = train(checked, features(raw), labels(raw))
    notify(evaluate(model), report(checked))

nightly_retrain()`,
  slots: {
    retries: (s) => String((s as DagState).retries),
    delay: (s) => String((s as DagState).retryDelay),
    rule: (s) => (s as DagState).notifyRule,
  },
  annotations: [
    {
      id: 'airflow-3-task-sdk',
      range: { line: 5 },
      kind: 'framework',
      title: "Airflow 3 Task SDK",
      what: "In Airflow 3, DAG authors import dag and task from airflow.sdk.",
      why: "Airflow 2 code imported from airflow.decorators; both styles appear in tutorials, so check the version.",
    },
    {
      id: 'catchup',
      range: { line: 10 },
      kind: 'parameter',
      title: "catchup",
      what: "Do not create runs for every past period since start_date (the next lesson).",
      why: "Airflow 3 defaults to False; Airflow 2 defaulted to True.",
    },
    {
      id: 'one-run-at-a-time',
      range: { line: 11 },
      kind: 'parameter',
      title: "One run at a time",
      what: "A new run waits while one is active.",
      why: "The orchestrator’s version of the lock from the rerun lesson.",
    },
    {
      id: 'retries-and-retry-delay',
      range: { line: 12 },
      kind: 'parameter',
      title: "retries and retry_delay",
      what: "The explorer’s values: each task is retried this many times, waiting retry_delay in between.",
      why: "Retries absorb transient failures (a flaky API, a pre-empted worker). They must be safe: tasks have to be idempotent.",
    },
    {
      id: 'trigger-rule',
      range: { line: 29 },
      kind: 'parameter',
      title: "trigger_rule",
      what: "When notify may start: all_success (default) or all_done (after upstream tasks finish, whatever their state).",
      why: "all_done suits a notification, but as a leaf it can make a failed run look successful (try it above).",
    },
    {
      id: 'dependencies-from-data-flow',
      range: { line: 34 },
      kind: 'syntax',
      title: "Dependencies from data flow",
      what: "Passing one task’s result into another creates the edge.",
      why: "The TaskFlow API builds the DAG from ordinary function calls; results travel between workers as XComs, so keep them small (paths, not dataframes).",
    },
  ],
};

export const prefectFlow: CodeExample = {
  id: 'prefect-flow',
  language: 'python',
  source: `# flows/nightly_retrain.py   (Prefect 3)
from prefect import flow, task

@task(retries=2, retry_delay_seconds=180)
def features(path): ...

@flow(log_prints=True)
def nightly_retrain(day: str):
    raw = extract(day)
    model = train(validate(raw), features(raw), labels(raw))
    notify(evaluate(model))

if __name__ == "__main__":
    nightly_retrain.serve(name="nightly", cron="0 2 * * *")`,
  annotations: [
    {
      id: 'retries-per-task',
      range: { line: 4 },
      kind: 'parameter',
      title: "Retries per task",
      what: "The same idea as Airflow’s retries and retry_delay, set on the task.",
      why: "Prefect builds the graph at run time from Python calls, so loops and branches are plain Python.",
    },
    {
      id: 'a-parameter-not-now',
      range: { line: 8 },
      kind: 'parameter',
      title: "A parameter, not now()",
      what: "The day to process is an argument of the flow.",
      why: "Reruns and backfills pass an old day; the flow never asks the clock what to process.",
    },
    {
      id: 'serve',
      range: { line: 14 },
      kind: 'framework',
      title: "serve",
      what: "Runs a long-lived process that executes the flow on the cron schedule.",
      why: "Production setups use deployments with work pools instead; serve is the simplest way to start.",
    },
  ],
};
