import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'read-cron',
    type: 'choice',
    prompt: 'When does 30 6 * * 1-5 run?',
    options: [
      { text: 'At 06:30 on Monday to Friday', correct: true, explain: 'Minute 30, hour 6, any day of the month, any month, weekdays 1 (Mon) to 5 (Fri).' },
      { text: 'Every 30 minutes from 06:00 on weekdays', correct: false, explain: 'That would be */30 6-23 * * 1-5. A plain 30 is one minute value.' },
      { text: 'At 06:30 on the 1st to the 5th of each month', correct: false, explain: 'The 1-5 is in the fifth field, day of week. Day of month is the third field.' },
    ],
  },
  {
    id: 'dom-dow',
    type: 'choice',
    prompt: 'A job meant for "Friday the 13th" uses 0 0 13 * 5. How often does it actually run?',
    options: [
      { text: 'Only on Fridays that fall on the 13th', correct: false, explain: 'That is the intuition, and the reason this is a classic bug.' },
      { text: 'Never, because the two day fields contradict', correct: false, explain: 'cron does not treat them as a contradiction.' },
      { text: 'On every 13th and on every Friday', correct: true, explain: 'When both day fields are restricted, cron matches if EITHER matches. Check the date inside the script instead.' },
    ],
  },
  {
    id: 'gh-utc',
    type: 'choice',
    prompt: 'You are in Manila (UTC+8) and want a GitHub Actions job at 07:00 local time. Which schedule do you write?',
    options: [
      { text: 'cron: "0 7 * * *"', correct: false, explain: 'GitHub evaluates schedules in UTC, so this runs at 15:00 in Manila.' },
      { text: 'cron: "0 23 * * *"', correct: true, explain: '07:00 UTC+8 is 23:00 UTC the previous day. Manila has no daylight saving, so this stays right all year.' },
      { text: 'cron: "0 15 * * *"', correct: false, explain: 'That converts in the wrong direction: 15:00 UTC is 23:00 in Manila.' },
    ],
  },
  {
    id: 'never-ran',
    type: 'choice',
    prompt: 'A nightly job logs errors and exits non-zero on failure, and alerts fire on non-zero exits. One night the server is down and the job never starts. What tells you?',
    options: [
      { text: 'The error log, because cron records the missed run', correct: false, explain: 'Plain cron does not catch up or log runs it missed while the machine was down.' },
      { text: 'The non-zero exit alert, which fires for a missing run', correct: false, explain: 'A job that never starts has no exit code.' },
      { text: 'A heartbeat monitor that expected a ping and got none', correct: true, explain: 'Only an outside check that alerts on silence can catch a job that never ran.' },
    ],
  },
  {
    id: 'next-run',
    type: 'numeric',
    prompt: 'It is Monday 14:00. How many times does */15 9-17 * * 1-5 run between now (exclusive) and 18:00 today?',
    answer: 15,
    tolerance: 0,
    hint: 'Hours 14 to 17 are in range, each with minutes 0, 15, 30, 45. 14:00 itself is excluded.',
    explain: 'Hours 14, 15, 16, 17 give 16 times; excluding 14:00 leaves 15 (the last is 17:45). 18:00 is outside 9-17.',
  },
];

export const cronExercise: Exercise = {
  id: 'expand-field',
  prompt:
    'Write `expand(field, lo, hi)` that turns one cron field into the sorted list of values it allows, for fields between `lo` and `hi`. Support `*`, single numbers, ranges `a-b`, steps on either (`*/15`, `10-30/10`) and comma lists of these. Raise `ValueError` for values outside `[lo, hi]` and for a step of 0.',
  starter: `def expand(field, lo, hi):
    return []`,
  hints: [
    'Split on commas first; for each part, split off "/step" if present.',
    'For "*" use lo..hi; for "a-b" use a..b; for a number n use n..n. Then range(start, end + 1, step).',
  ],
  solution: `def expand(field, lo, hi):
    values = set()
    for part in field.split(","):
        rng, _, step = part.partition("/")
        step = int(step) if step else 1
        if step < 1:
            raise ValueError("step must be at least 1")
        if rng == "*":
            a, b = lo, hi
        elif "-" in rng:
            a, b = (int(x) for x in rng.split("-"))
        else:
            a = b = int(rng)
        if a < lo or b > hi or a > b:
            raise ValueError(f"{part} is outside {lo}-{hi}")
        values.update(range(a, b + 1, step))
    return sorted(values)`,
  explanation:
    'Every cron implementation does this expansion first; matching a time is then a membership test per field, plus the day-of-month OR day-of-week rule.',
  tests: `assert expand("*/15", 0, 59) == [0, 15, 30, 45]
assert expand("9-17", 0, 23) == list(range(9, 18))
assert expand("1,15", 1, 31) == [1, 15]
assert expand("10-30/10,5", 0, 59) == [5, 10, 20, 30]
assert expand("*", 1, 12) == list(range(1, 13))
for bad in ["60", "*/0", "5-70"]:
    try:
        expand(bad, 0, 59)
    except ValueError:
        pass
    else:
        raise AssertionError(bad)`,
};
