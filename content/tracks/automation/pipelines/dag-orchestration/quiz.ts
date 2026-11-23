import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'critical',
    type: 'numeric',
    prompt: 'extract (4 min) feeds features (5) and labels (3); train (8) needs both; evaluate (3) needs train. With unlimited workers, how many minutes does a run take?',
    answer: 20,
    tolerance: 0,
    hint: 'Follow the longest chain: extract, the slower of features and labels, train, evaluate.',
    explain: '4 + max(5, 3) + 8 + 3 = 20 minutes. labels finishes early and waits; adding workers cannot shorten the critical path.',
  },
  {
    id: 'upstream-failed',
    type: 'choice',
    prompt: 'features fails after its last retry. train depends on it with the default trigger rule. What is train’s state?',
    options: [
      { text: 'failed, with the error copied from features', correct: false, explain: 'train never ran, so it has no error of its own.' },
      { text: 'skipped, because its input is missing', correct: false, explain: 'skipped is for branching and short-circuits. A failed upstream gives a different state.' },
      { text: 'upstream_failed', correct: true, explain: 'With all_success, a failed upstream task marks downstream tasks upstream_failed, and they never start.' },
    ],
  },
  {
    id: 'leaf',
    type: 'choice',
    prompt: 'The only leaf task, notify, has trigger_rule="all_done". Training failed earlier, and notify succeeded. What is the DAG run’s state?',
    options: [
      { text: 'failed, because a task in the run failed', correct: false, explain: 'Airflow does not look at every task. It decides from the leaves.' },
      { text: 'success, because every leaf task succeeded', correct: true, explain: 'The Airflow docs: a run is success if all leaves are success or skipped. Make notify all_success, or add a leaf that checks upstream states, so failures stay visible.' },
      { text: 'running, until someone clears the failed task', correct: false, explain: 'All tasks reached a final state, so the run ends.' },
    ],
  },
  {
    id: 'retry-idempotent',
    type: 'choice',
    prompt: 'Why must an orchestrated task be idempotent before you give it retries=3?',
    options: [
      { text: 'Orchestrators refuse to retry tasks that write files', correct: false, explain: 'They retry whatever you configure; they cannot know what a task writes.' },
      { text: 'A retry reruns work that may have partly succeeded', correct: true, explain: 'If the first attempt appended half its rows before failing, a retry appends them again. Upsert or overwrite partitions.' },
      { text: 'Retries run in parallel with the original attempt', correct: false, explain: 'A retry starts after the failed attempt ends and the delay passes.' },
    ],
  },
  {
    id: 'when-orchestrator',
    type: 'choice',
    prompt: 'When does a set of cron jobs need to become an orchestrated pipeline?',
    options: [
      { text: 'When there are more than ten scripts in the repository', correct: false, explain: 'The number of scripts is not the signal. Ten independent jobs are fine on cron.' },
      { text: 'When jobs depend on each other and need retries and backfills', correct: true, explain: 'Timing dependencies with cron ("start step 2 at 02:30 and hope step 1 is done") breaks on the first slow night.' },
      { text: 'When a job takes longer than one hour to finish', correct: false, explain: 'A long independent job just needs a lock and a timeout.' },
    ],
  },
];

export const topoExercise: Exercise = {
  id: 'topo-order',
  prompt:
    'Write `topo_order(deps)` without graphlib. `deps` maps each task to a list of tasks it depends on. Return a list in which every task comes after its dependencies; among tasks that are ready at the same time, take them in the order they appear as keys of `deps` (Kahn’s algorithm). Raise `ValueError("cycle")` if no valid order exists.',
  starter: `def topo_order(deps):
    return list(deps)`,
  hints: [
    'Keep, for each task, the set of dependencies not yet done. A task is ready when its set is empty.',
    'Repeatedly pick the first ready task in key order, append it, and remove it from every other task’s set.',
  ],
  solution: `def topo_order(deps):
    remaining = {t: set(d) for t, d in deps.items()}
    order = []
    while remaining:
        ready = [t for t in deps if t in remaining and not remaining[t]]
        if not ready:
            raise ValueError("cycle")
        t = ready[0]
        order.append(t)
        del remaining[t]
        for other in remaining.values():
            other.discard(t)
    return order`,
  explanation:
    'Kahn’s algorithm repeatedly takes a task with no unfinished dependencies. If none exists while tasks remain, those tasks form a cycle.',
  tests: `deps = {"train": ["features", "labels"], "extract": [], "features": ["extract"], "labels": ["extract"], "report": ["train"]}
assert topo_order(deps) == ["extract", "features", "labels", "train", "report"], topo_order(deps)
assert topo_order({}) == []
try:
    topo_order({"a": ["b"], "b": ["a"]})
except ValueError:
    pass
else:
    raise AssertionError("expected a cycle")`,
};
