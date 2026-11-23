import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'which-lesson',
    type: 'choice',
    prompt: 'The nightly scoring run is killed halfway and rerun. The scores table now has two rows for some customers. Which design rule was broken?',
    options: [
      { text: 'Writes must be idempotent: overwrite the day’s partition or upsert by key', correct: true, explain: 'An idempotent write makes the rerun harmless (rerun-safe jobs lesson).' },
      { text: 'The DAG needs more retries so the run does not get killed', correct: false, explain: 'Retries are reruns too: they make the duplicates more likely, not less.' },
      { text: 'The schedule should be in UTC', correct: false, explain: 'Time zones change when the job runs, not what a rerun writes.' },
    ],
  },
  {
    id: 'silence',
    type: 'choice',
    prompt: 'The scheduler host was down all night. Which part of the capstone notices?',
    options: [
      { text: 'The non-zero exit alert on each task', correct: false, explain: 'No task ran, so no task exited.' },
      { text: 'The release gate on the next retrain', correct: false, explain: 'The gate checks models, and runs weekly.' },
      { text: 'The heartbeat that expects a "nightly done" ping', correct: true, explain: 'Only a check for missing success catches work that never started.' },
    ],
  },
  {
    id: 'backfill-week',
    type: 'choice',
    prompt: 'You fix a bug in score.py and need last week’s scores recomputed. What do you run?',
    options: [
      { text: 'A backfill of the 7 days with reprocess-behavior completed and a concurrency limit', correct: true, explain: 'The runs succeeded at the time, so only "completed" reprocesses them; the limit protects the warehouse.' },
      { text: 'score.py without --day, seven times in a row', correct: false, explain: 'Without --day the script cannot know which day to process; it must never default to the clock.' },
      { text: 'The default backfill, which skips days that already ran', correct: false, explain: 'That is exactly the problem: every day already has a (wrong) run.' },
    ],
  },
  {
    id: 'order-capstone',
    type: 'order',
    prompt: 'Order the milestones the way the brief suggests building them.',
    items: ['CLIs run by hand', 'Retries, atomic and idempotent writes', 'The nightly DAG and a backfill', 'CI on pull requests', 'Weekly delivery with a gate and approval', 'Alerts, heartbeat and runbook'],
    explain: 'Each layer depends on the one before: a scheduler cannot fix a script that is unsafe to rerun, and a gate needs CI-tested code to gate.',
  },
];

export const heartbeatExercise: Exercise = {
  id: 'heartbeat',
  prompt:
    'Write `missed(pings, now, every, grace)` for a heartbeat monitor. `pings` is a list of datetimes when the job reported success, `every` the expected period (a timedelta), and `grace` the extra time allowed. Return True if the job is late: there are no pings, or the latest ping is older than `every + grace` at `now`.',
  starter: `def missed(pings, now, every, grace):
    return False`,
  hints: [
    'An empty list means the job never reported: late.',
    'Compare now − max(pings) with every + grace.',
  ],
  solution: `def missed(pings, now, every, grace):
    if not pings:
        return True
    return now - max(pings) > every + grace`,
  explanation:
    'The monitor alerts on silence, which is the one failure mode logs and exit codes cannot report.',
  tests: `from datetime import datetime, timedelta
day, hour = timedelta(days=1), timedelta(hours=1)
pings = [datetime(2026, 11, 21, 2, 40), datetime(2026, 11, 22, 2, 35)]
assert missed(pings, datetime(2026, 11, 23, 2, 30), day, hour) is False
assert missed(pings, datetime(2026, 11, 23, 3, 36), day, hour) is True
assert missed([], datetime(2026, 11, 23), day, hour) is True
assert missed(list(reversed(pings)), datetime(2026, 11, 23, 3, 30), day, hour) is False`,
};
