import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'crash-dupes',
    type: 'numeric',
    prompt:
      'Page size 5, append mode. The worker crashes right after writing page 3 and the job reruns from page 1. How many rows does the table hold for the 23 records?',
    answer: 38,
    tolerance: 0,
    hint: 'Pages 1 to 3 hold 15 records. They are written in the first run and again in the rerun.',
    explain:
      '23 rows from the complete rerun plus 15 left over from the crashed run: 38, with ids 1 to 15 stored twice.',
  },
  {
    id: 'backoff',
    type: 'choice',
    prompt:
      'A page fails with 503 twice and then succeeds. The client waits 2 ** attempt seconds between tries. How long does it wait in total?',
    options: [
      {
        text: '3 seconds: 1 after the first failure, 2 after the second',
        correct: true,
        explain: 'attempt counts from 0, so the waits are 2⁰ = 1 and 2¹ = 2.',
      },
      {
        text: '2 seconds: 1 + 1',
        correct: false,
        explain: 'That is a fixed delay. Exponential backoff doubles the wait each time.',
      },
      {
        text: '6 seconds: 2 + 4',
        correct: false,
        explain: 'The first wait is 2⁰ = 1 second, because attempt starts at 0.',
      },
    ],
  },
  {
    id: 'retry-which',
    type: 'choice',
    prompt: 'Which response should an ingestion job retry?',
    options: [
      {
        text: '429 Too Many Requests, after waiting as long as its Retry-After header says',
        correct: true,
        explain: 'The server is asking you to slow down. The same request will work later.',
      },
      {
        text: '401 Unauthorized',
        correct: false,
        explain:
          'The credentials are wrong or expired. Retrying sends the same bad credentials; fail and alert instead.',
      },
      {
        text: '404 Not Found',
        correct: false,
        explain: 'The URL or resource does not exist. Asking again gets the same answer.',
      },
    ],
  },
  {
    id: 'landing-format',
    type: 'choice',
    prompt:
      'An API returns nested JSON (each order has a list of items). Where should you keep the raw responses before transforming them?',
    options: [
      {
        text: 'Land the JSON as received (for example JSON Lines files per run), then flatten it into typed Parquet or tables',
        correct: true,
        explain:
          'The raw copy lets you reprocess when a transform was wrong, and JSON keeps the nesting. Typed, columnar files serve analysis.',
      },
      {
        text: 'Convert straight to CSV',
        correct: false,
        explain: 'CSV cannot hold a list of items per row and drops every type; the original shape is lost.',
      },
      {
        text: 'Nowhere: transform in memory and keep only the result',
        correct: false,
        explain:
          'Then a bug in the transform means downloading everything again, which old data may not allow.',
      },
    ],
  },
  {
    id: 'drift',
    type: 'choice',
    prompt: 'A new field, coupon, appears in the API’s records. What is a sound default?',
    options: [
      {
        text: 'Keep loading the known columns, record the new one in the raw data, and alert so someone decides whether to add it',
        correct: true,
        explain:
          'An extra field breaks nothing you rely on. A missing or retyped field you use is different: that should stop the load.',
      },
      {
        text: 'Fail the job until the schema is updated',
        correct: false,
        explain: 'Too strict for an added field: every harmless change by the source becomes an outage.',
      },
      {
        text: 'Ignore it silently',
        correct: false,
        explain: 'Then nobody learns the source changed. The next change may be one that matters.',
      },
    ],
  },
];

export const upsertExercise: Exercise = {
  id: 'upsert-rows',
  prompt: 'Write `upsert(table, rows)`, which makes a load safe to rerun.',
  starter: `def upsert(table, rows):
    # table: dict from id to row. rows: list of dicts, each with an "id".
    # Insert new ids, replace existing ones. Return (inserted, updated) counts.
    return 0, 0`,
  hints: [
    'Loop over the rows and look up `row["id"]` in `table`.',
    'Count it as updated if the id is already there, otherwise as inserted; then set `table[row["id"]] = row` either way.',
  ],
  solution: `def upsert(table, rows):
    inserted = updated = 0
    for row in rows:
        if row["id"] in table:
            updated += 1
        else:
            inserted += 1
        table[row["id"]] = row
    return inserted, updated`,
  explanation:
    'Keying the destination by id is what makes the write idempotent: the second run of the same page updates rows instead of adding copies. Databases do the same with a primary key and MERGE or INSERT ... ON CONFLICT DO UPDATE.',
  tests: `table = {}
assert upsert(table, [{"id": 1, "amount": 10}, {"id": 2, "amount": 20}]) == (2, 0), 'two new ids are inserted'
assert upsert(table, [{"id": 2, "amount": 25}, {"id": 3, "amount": 30}]) == (1, 1), 'id 2 is updated, id 3 inserted'
assert table[2]["amount"] == 25, 'an update keeps the newest version of the row'
assert len(table) == 3, 'the table holds one row per id'
assert upsert(table, [{"id": 1, "amount": 10}, {"id": 2, "amount": 25}]) == (0, 2) and len(table) == 3, 'rerunning a page adds no rows'`,
};
