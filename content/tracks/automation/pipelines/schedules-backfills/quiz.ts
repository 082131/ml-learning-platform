import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'interval-run',
    type: 'choice',
    prompt: 'A daily DAG uses the data-interval timetable. When does the run with logical date 2026-11-22 start?',
    options: [
      { text: 'At 2026-11-22 00:00, the start of its interval', correct: false, explain: 'That is the trigger timetable. With intervals, the run waits until the interval is complete.' },
      { text: 'At 2026-11-23 00:00, when its interval ends', correct: true, explain: 'The run covers [11-22 00:00, 11-23 00:00) and is triggered when that day is over, so all its data exists.' },
      { text: 'At 2026-11-22 23:59, just before the interval ends', correct: false, explain: 'Runs are triggered at the interval’s end, not just before it.' },
    ],
  },
  {
    id: 'catchup-count',
    type: 'numeric',
    prompt: 'A daily data-interval DAG has start_date 2026-11-01 00:00 and catchup=True. You switch it on at 2026-11-08 09:00. How many runs does the scheduler create?',
    answer: 7,
    tolerance: 0,
    hint: 'Count the complete days from November 1 up to now.',
    explain: 'Intervals [11-01, 11-02) through [11-07, 11-08) are complete: 7 runs. The interval for 11-08 is still open.',
  },
  {
    id: 'catchup-false',
    type: 'choice',
    prompt: 'The same DAG with catchup=False (the Airflow 3 default). What does the scheduler create when you switch it on?',
    options: [
      { text: 'Nothing until tonight at midnight', correct: false, explain: 'The docs: with a past start_date it creates a run for the most recently completed interval right away.' },
      { text: 'One run, for the most recently completed interval', correct: true, explain: 'The run for 11-07 ([11-07, 11-08)). Missed earlier days are only processed by a backfill.' },
      { text: 'Seven runs, one at a time', correct: false, explain: 'That is catchup=True with max_active_runs=1.' },
    ],
  },
  {
    id: 'reprocess',
    type: 'choice',
    prompt: 'You fixed a bug that made last week’s revenue wrong. All seven runs succeeded at the time. Which backfill option reprocesses them?',
    options: [
      { text: '--reprocess-behavior completed', correct: true, explain: 'completed reruns every run in the window. none (the default) only creates missing runs, and failed adds only errored ones.' },
      { text: '--reprocess-behavior failed', correct: false, explain: 'None of the runs failed, so nothing would be reprocessed.' },
      { text: 'The default, since backfills always rerun the window', correct: false, explain: 'The default is none: it skips days that already have a run.' },
    ],
  },
  {
    id: 'now',
    type: 'choice',
    prompt: 'A task reads "yesterday’s" orders with datetime.now() − 1 day. What happens in a backfill of November 1 to 7 run on November 20?',
    options: [
      { text: 'Each run reads its own day, because Airflow patches now()', correct: false, explain: 'Airflow does not change the system clock.' },
      { text: 'Every run reads November 19, and seven days are overwritten with it', correct: true, explain: 'The task ignores the period it is for. Read data_interval_start/end (or the logical date) instead.' },
      { text: 'The backfill refuses to start for tasks that call now()', correct: false, explain: 'Airflow cannot see what your code does inside a task.' },
    ],
  },
];

export const intervalExercise: Exercise = {
  id: 'intervals',
  prompt:
    'Write `runs(start, now, step, catchup)` for a data-interval timetable. `start` and `now` are datetimes, `step` a timedelta. Return the list of `(interval_start, interval_end)` pairs for every complete interval [start + k·step, start + (k+1)·step) whose end is not after `now`. With `catchup=False`, return only the last of them (or an empty list).',
  starter: `def runs(start, now, step, catchup):
    return []`,
  hints: [
    'Walk s = start, start + step, ... while s + step <= now.',
    'catchup=False keeps result[-1:] (a slice, so an empty list stays empty).',
  ],
  solution: `def runs(start, now, step, catchup):
    out = []
    s = start
    while s + step <= now:
        out.append((s, s + step))
        s += step
    return out if catchup else out[-1:]`,
  explanation:
    'An interval run exists only once its interval is over, which is why a daily run for a day starts at the next midnight. Without catchup, only the latest complete interval runs.',
  tests: `from datetime import datetime, timedelta
D = timedelta(days=1)
r = runs(datetime(2026, 11, 1), datetime(2026, 11, 8, 9), D, True)
assert len(r) == 7 and r[0] == (datetime(2026, 11, 1), datetime(2026, 11, 2)) and r[-1][1] == datetime(2026, 11, 8)
assert runs(datetime(2026, 11, 1), datetime(2026, 11, 8, 9), D, False) == [(datetime(2026, 11, 7), datetime(2026, 11, 8))]
assert runs(datetime(2026, 11, 8), datetime(2026, 11, 8, 9), D, True) == []
assert len(runs(datetime(2026, 11, 8), datetime(2026, 11, 8, 9), timedelta(hours=1), True)) == 9`,
};
