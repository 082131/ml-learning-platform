import type { Exercise, QuizQuestion } from '@/lib/types';

/** Self-assessment: answer these about your own pipeline before you call it done. */
export const questions: QuizQuestion[] = [
  {
    id: 'rerun',
    type: 'choice',
    prompt: 'You rerun last Tuesday’s load after a fix. How do you know your pipeline handled it correctly?',
    options: [
      {
        text: 'Every table has the same rows as after a single run, which a test checks by running a day twice and comparing',
        correct: true,
        explain:
          'Idempotency is a property you can test. The reference pipeline reruns 10 October and its totals do not change.',
      },
      {
        text: 'The task finished with success',
        correct: false,
        explain: 'An appending load also finishes with success, and doubles Tuesday’s orders.',
      },
    ],
  },
  {
    id: 'quarantine-vs-block',
    type: 'choice',
    prompt:
      'One raw file has 3 rows with a missing customer. Another day arrives with the amount column missing. What should happen?',
    options: [
      {
        text: 'Quarantine the 3 rows and load the rest; block the day with the missing column',
        correct: true,
        explain:
          'Row problems are isolated and explained; a table-level problem makes every row wrong, so nothing is published.',
      },
      {
        text: 'Fail the whole run in both cases',
        correct: false,
        explain: 'Three bad rows should not stop thousands of good ones from being loaded.',
      },
      {
        text: 'Load both and fix them later',
        correct: false,
        explain: 'A missing amount column loads NULL revenue into every dashboard and feature downstream.',
      },
    ],
  },
  {
    id: 'pit',
    type: 'choice',
    prompt: 'Your training rows predict at the start of 12 October. Which feature snapshot should they use?',
    options: [
      {
        text: 'The snapshot written at the end of 11 October',
        correct: true,
        explain: 'It is the latest one that existed when the prediction would have been made.',
      },
      {
        text: 'The snapshot from 12 October',
        correct: false,
        explain: 'It is written at the end of 12 October and includes orders after the prediction.',
      },
      {
        text: 'The latest snapshot, so features are as fresh as possible',
        correct: false,
        explain: 'Fresh for today, but from the future for every past training row.',
      },
    ],
  },
  {
    id: 'logical-date',
    type: 'choice',
    prompt:
      'Your backfill for 1 to 7 October produced seven identical copies of today’s data. What is the likely bug?',
    options: [
      {
        text: 'A task reads date.today() instead of the run’s logical date',
        correct: true,
        explain: 'Each backfill run must process its own date; the wall clock is the same for all seven.',
      },
      {
        text: 'The orchestrator ran the runs in parallel',
        correct: false,
        explain: 'Parallel runs are fine when each one processes its own date and writes its own partition.',
      },
    ],
  },
  {
    id: 'runbook',
    type: 'choice',
    prompt: 'The freshness warning fires at 03:00. What should your runbook let the on-call person do?',
    options: [
      {
        text: 'See what the alert means, check the source and the last successful run, and know how to rerun or backfill the missing days',
        correct: true,
        explain: 'An alert without a next step gets ignored. The runbook turns it into a short checklist.',
      },
      {
        text: 'Read the pipeline’s source code to work out what happened',
        correct: false,
        explain:
          'At 03:00, and for someone who did not write it, that is too slow. Write down what you know now.',
      },
    ],
  },
];

export const loadDayExercise: Exercise = {
  id: 'load-day',
  prompt: 'Write `load_day(table, day, rows)` so that loading a day is idempotent.',
  starter: `def load_day(table, day, rows):
    # table: list of dicts, each with a "day" key. rows: the rows for \`day\` from the source.
    # Return the new table: the day's previous rows replaced by \`rows\`, every other day untouched.
    return table + rows`,
  hints: [
    'Keep every row whose day is not `day`, then add the new rows.',
    'Running it twice with the same rows must give the same table as running it once.',
  ],
  solution: `def load_day(table, day, rows):
    return [r for r in table if r["day"] != day] + list(rows)`,
  explanation:
    'This is the delete-then-insert pattern from the reference pipeline’s load(), and what overwriting one partition does in a lakehouse. Retries, reruns and backfills all become safe.',
  tests: `t = [{"day": "10-01", "id": 1}, {"day": "10-02", "id": 2}]
new = [{"day": "10-02", "id": 3}, {"day": "10-02", "id": 4}]
once = load_day(t, "10-02", new)
assert sorted(r["id"] for r in once) == [1, 3, 4], 'the old rows for 10-02 are replaced'
assert load_day(once, "10-02", new) == once, 'loading the same day twice changes nothing'
assert load_day([], "10-03", [{"day": "10-03", "id": 5}]) == [{"day": "10-03", "id": 5}], 'loading into an empty table'
assert [r for r in once if r["day"] == "10-01"] == [{"day": "10-01", "id": 1}], 'other days are untouched'`,
};
