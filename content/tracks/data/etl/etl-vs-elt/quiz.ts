import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'where-transform',
    type: 'choice',
    prompt: 'What is the difference between ETL and ELT?',
    options: [
      {
        text: 'Where the transform runs: before loading, in pipeline code (ETL), or after loading raw data, inside the warehouse (ELT)',
        correct: true,
        explain:
          'Both extract, transform and load. The order of the last two, and therefore where the transform runs, is the difference.',
      },
      {
        text: 'ELT skips validation',
        correct: false,
        explain:
          'ELT can validate just as well, in SQL inside the warehouse. In the lesson both modes apply the same rules.',
      },
      {
        text: 'ETL works on batches and ELT on streams',
        correct: false,
        explain:
          'Both are usually run as batches. Batch versus stream is a separate choice, covered in the next lesson.',
      },
    ],
  },
  {
    id: 'comma',
    type: 'choice',
    prompt: 'Validation is off and record 1006 has amount "12,50". What happens in each mode?',
    options: [
      {
        text: 'ETL: float() raises ValueError and the batch stops. ELT: CAST gives 12.0 and the row loads with no error',
        correct: true,
        explain:
          'Python refuses the comma; SQLite reads the numeric prefix "12". A crash is loud, a silently wrong number is worse.',
      },
      {
        text: 'Both modes load 12.5',
        correct: false,
        explain: 'Neither Python nor SQLite treats a comma as a decimal point.',
      },
      {
        text: 'Both modes quarantine the row',
        correct: false,
        explain: 'Quarantine needs validation rules. With validation off nothing routes the row aside.',
      },
    ],
  },
  {
    id: 'cents',
    type: 'choice',
    prompt: 'Which rule catches an amount of "4550" that should have been 45.50?',
    options: [
      {
        text: 'The range check (amount above 1000)',
        correct: true,
        explain: '4550 is a perfectly formatted number, so only a rule about plausible values can catch it.',
      },
      {
        text: 'The decimal format check',
        correct: false,
        explain: '"4550" is digits only, which the format allows.',
      },
      {
        text: 'None: it cannot be caught',
        correct: false,
        explain:
          'It can, here, because the shop has a maximum order of 1000. Choosing ranges is part of writing rules.',
      },
    ],
  },
  {
    id: 'revenue',
    type: 'numeric',
    prompt:
      'Norway (NO) has two valid orders, 12.00 and 15.00. Validation is off and record 1006 (one of them) has amount "-20.00". What is NO\'s revenue in orders?',
    answer: -8,
    tolerance: 0,
    hint: 'The bad amount replaces 15.00: add 12.00 and -20.00.',
    explain: '12.00 + (-20.00) = -8.0. The report is wrong and nothing raised an error.',
  },
  {
    id: 'steps',
    type: 'order',
    prompt: 'Put the steps of the ELT pipeline in order.',
    items: [
      'Extract rows from the source CSV',
      'Load the raw text into raw_orders',
      'Label each raw row with the first rule it breaks',
      'Insert the passing rows into orders and the rest into orders_quarantine',
    ],
    explain:
      'In ELT the raw data lands first; validation and the transform are SQL that runs on it inside the warehouse.',
  },
];

export const splitExercise: Exercise = {
  id: 'quarantine-split',
  prompt: 'Write `split(rows, check)`, which separates valid rows from quarantined ones.',
  starter: `def split(rows, check):
    # check(row) returns None for a valid row, or a reason string.
    # Return (valid, quarantine). Quarantined rows keep their values and gain a "reason" key.
    return [], []`,
  hints: [
    'Loop over the rows once, calling `check(row)` for each.',
    'Valid rows go into `valid` unchanged. For the others, build a new dict: `{**row, "reason": reason}`.',
    'Do not modify `row` itself: the caller may still use the input list.',
  ],
  solution: `def split(rows, check):
    valid, quarantine = [], []
    for row in rows:
        reason = check(row)
        if reason is None:
            valid.append(row)
        else:
            quarantine.append({**row, "reason": reason})
    return valid, quarantine`,
  explanation:
    'Routing is separate from the rules: `split` works with any check, so rules can be added, tested and reported on without touching the pipeline. Copying each quarantined row keeps the input batch intact for a replay.',
  tests: `def positive(row):
    return None if row["amount"] > 0 else "amount must be positive"

rows = [{"id": 1, "amount": 5}, {"id": 2, "amount": -3}, {"id": 3, "amount": 0}]
valid, quarantine = split(rows, positive)
assert valid == [{"id": 1, "amount": 5}], 'only the row with a positive amount is valid'
assert quarantine == [{"id": 2, "amount": -3, "reason": "amount must be positive"}, {"id": 3, "amount": 0, "reason": "amount must be positive"}], 'quarantined rows keep their values and gain a "reason"'
assert "reason" not in rows[1], 'split should not change the input rows: copy them with {**row, "reason": ...}'
assert split([], positive) == ([], []), 'an empty batch gives two empty lists'
assert split(rows, lambda row: None) == (rows, []), 'with a check that never fails, every row is valid'`,
};
