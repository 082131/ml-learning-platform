import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'downstream',
    type: 'choice',
    prompt:
      'transform fails after its last retry. What happens to load_warehouse, report, features and notify?',
    options: [
      {
        text: 'load_warehouse, report and features are not run (upstream_failed); notify runs, because its trigger rule is all_done',
        correct: true,
        explain:
          'Tasks after a failure are skipped so no wrong data is loaded. The alert step is meant to run exactly then.',
      },
      {
        text: 'They all run on yesterday’s data',
        correct: false,
        explain:
          'An orchestrator never silently substitutes old inputs. Downstream tasks wait for a successful upstream run.',
      },
      {
        text: 'The whole DAG is retried from extract_orders',
        correct: false,
        explain: 'Retries apply to the failed task. Tasks that already succeeded keep their results.',
      },
    ],
  },
  {
    id: 'retry-time',
    type: 'numeric',
    prompt:
      'transform (3 minutes) starts at minute 3, fails its first 2 attempts and has 2 retries, waiting 1 minute and then 2. At what minute does it finish?',
    answer: 15,
    tolerance: 0,
    hint: 'Add up: attempt, wait 1, attempt, wait 2, attempt.',
    explain: '3 + 3 = 6 (fails), + 1 = 7, + 3 = 10 (fails), + 2 = 12, + 3 = 15 (succeeds).',
  },
  {
    id: 'retries-bug',
    type: 'choice',
    prompt:
      'A task fails on every attempt because a column was renamed in the source. What do more retries achieve?',
    options: [
      {
        text: 'Nothing useful: the run just fails later. Retries help only with temporary failures',
        correct: true,
        explain:
          'Set the "every attempt" option in the simulator: each extra retry adds waiting time and still fails.',
      },
      {
        text: 'Eventually one attempt succeeds',
        correct: false,
        explain: 'The code and data are the same on every attempt, so the result is the same.',
      },
    ],
  },
  {
    id: 'idempotent',
    type: 'choice',
    prompt: 'Why must a task be idempotent before you give it retries?',
    options: [
      {
        text: 'A failed attempt may have written part of its output; the retry must replace it, not add to it',
        correct: true,
        explain:
          'A task that appends can fail after writing half its rows. The retry writes them again. Overwriting the run’s own partition avoids that.',
      },
      {
        text: 'Retries are faster when tasks are idempotent',
        correct: false,
        explain: 'Speed is unaffected; correctness is the issue.',
      },
    ],
  },
  {
    id: 'backfill',
    type: 'numeric',
    prompt:
      'Daily totals are 75, 12 and 28. A job that appends is backfilled for the last two days. What does SUM(total) over the table now give?',
    answer: 155,
    tolerance: 0,
    hint: 'The backfill appends 12 and 28 again.',
    explain: '75 + 12 + 28 = 115 before, plus 12 + 28 = 155. The overwrite version still gives 115.',
  },
];

export const blockedExercise: Exercise = {
  id: 'blocked-tasks',
  prompt: 'Write `blocked_by(tasks, failed)`: the tasks that cannot run because `failed` failed.',
  starter: `def blocked_by(tasks, failed):
    # tasks: dict from task name to its list of upstream task names, in dependency order.
    # Return the sorted list of tasks that depend on failed, directly or indirectly.
    return []`,
  hints: [
    'Keep a set `blocked`, starting with `failed` itself.',
    'Walk the tasks in order. A task is blocked if any of its upstream tasks is in the set.',
    'Because the dict is in dependency order, one pass is enough. Leave `failed` itself out of the answer.',
  ],
  solution: `def blocked_by(tasks, failed):
    blocked = {failed}
    for name, upstream in tasks.items():
        if any(u in blocked for u in upstream):
            blocked.add(name)
    blocked.discard(failed)
    return sorted(blocked)`,
  explanation:
    'This is how a scheduler decides which tasks to mark upstream_failed. Walking in dependency (topological) order guarantees each task’s upstream tasks have been decided before it.',
  tests: `tasks = {
    "extract_orders": [],
    "extract_customers": [],
    "validate": ["extract_orders", "extract_customers"],
    "transform": ["validate"],
    "load": ["transform"],
    "report": ["load"],
    "features": ["load"],
}
assert blocked_by(tasks, "transform") == ["features", "load", "report"], 'everything after transform is blocked'
assert blocked_by(tasks, "extract_customers") == ["features", "load", "report", "transform", "validate"], 'a root failure blocks everything that depends on it'
assert blocked_by(tasks, "report") == [], 'nothing depends on report'`,
};
