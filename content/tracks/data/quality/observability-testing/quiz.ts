import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'silent',
    type: 'choice',
    prompt:
      'The source system stopped sending orders yesterday. Every pipeline task still succeeds. Which check notices?',
    options: [
      {
        text: 'Freshness: the newest order keeps getting older',
        correct: true,
        explain:
          'Nothing failed: the pipeline reloaded the same data. Only a check on the age of the data sees it (volume may too, if the load is incremental).',
      },
      {
        text: 'Uniqueness',
        correct: false,
        explain: 'No duplicates appear; the data is simply old.',
      },
      {
        text: 'The orchestrator marks the run failed',
        correct: false,
        explain:
          'Every task returned successfully. Pipelines can be green and wrong; that is why data checks exist.',
      },
    ],
  },
  {
    id: 'block-or-warn',
    type: 'choice',
    prompt: 'Which failure should stop publishing, rather than publish with a warning?',
    options: [
      {
        text: '14 duplicate order ids',
        correct: true,
        explain: 'Every revenue number downstream would be wrong. Stale but correct beats fresh but wrong.',
      },
      {
        text: 'Row count 10% below the 7-day median',
        correct: false,
        explain:
          'Quiet days happen. Blocking on this would make reports stale for normal variation; warn and let someone look.',
      },
      {
        text: '0.4% of emails empty',
        correct: false,
        explain:
          'That is under the 1% limit, so the check passes; and empty emails do not make revenue wrong.',
      },
    ],
  },
  {
    id: 'volume',
    type: 'numeric',
    prompt:
      'The last 7 loads had 980, 1012, 1003, 995, 1040, 870 and 1021 rows. Today has 902. By how many percent does today differ from the median? (Answer to one decimal, negative for a drop.)',
    answer: -10.1,
    tolerance: 0.05,
    hint: 'Sort the counts to find the median, then compute 902 / median − 1.',
    explain: 'The median is 1003, and 902 / 1003 − 1 = −0.1007, about −10.1%.',
  },
  {
    id: 'lineage',
    type: 'choice',
    prompt: 'The churn model’s accuracy dropped. How does lineage help?',
    options: [
      {
        text: 'It shows the model reads features, which reads orders_clean, so you check the data tests on those tables first',
        correct: true,
        explain:
          'Lineage turns "something is wrong" into a short list of upstream tables and runs to inspect.',
      },
      {
        text: 'It retrains the model automatically',
        correct: false,
        explain:
          'Lineage is a map of dependencies. It tells you where to look and what else is affected; it does not fix anything.',
      },
    ],
  },
  {
    id: 'tests',
    type: 'choice',
    prompt: 'What is the difference between a unit test of a transform and a data test?',
    options: [
      {
        text: 'A unit test runs the code on hand-made rows before deployment; a data test checks the real data on every run',
        correct: true,
        explain: 'Correct code can still receive bad data, and good data can meet buggy code. You need both.',
      },
      {
        text: 'They are the same thing with different names',
        correct: false,
        explain:
          'They catch different failures: one catches bugs in your code, the other changes in your inputs.',
      },
    ],
  },
];

export const lineageExercise: Exercise = {
  id: 'upstream-of',
  prompt: 'Write `upstream_of(lineage, table)`: every table that feeds `table`, directly or indirectly.',
  starter: `def upstream_of(lineage, table):
    # lineage: dict from table name to the list of tables it is built from.
    # Return the sorted list of all tables upstream of table.
    return []`,
  hints: [
    'Keep a set of found tables and a list of tables still to visit, starting with `lineage[table]`.',
    'Pop a table, skip it if already found, otherwise add it and push its own upstream tables.',
    'Use `lineage.get(name, [])` so raw sources with no entry work.',
  ],
  solution: `def upstream_of(lineage, table):
    found, todo = set(), list(lineage.get(table, []))
    while todo:
        name = todo.pop()
        if name not in found:
            found.add(name)
            todo.extend(lineage.get(name, []))
    return sorted(found)`,
  explanation:
    'Walking lineage upstream answers "what could have caused this?"; walking it downstream answers "what does this break?". Lineage tools store the same graph, built from the SQL and job definitions.',
  tests: `lineage = {
    "orders_clean": ["orders_raw"],
    "daily_revenue": ["orders_clean"],
    "features": ["orders_clean", "customers"],
    "churn_model": ["features", "labels"],
    "dashboard": ["daily_revenue"],
}
assert upstream_of(lineage, "churn_model") == ["customers", "features", "labels", "orders_clean", "orders_raw"], 'the model depends on five tables'
assert upstream_of(lineage, "dashboard") == ["daily_revenue", "orders_clean", "orders_raw"], 'the dashboard follows one chain'
assert upstream_of(lineage, "orders_raw") == [], 'a raw source has nothing upstream'`,
};
