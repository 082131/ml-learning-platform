import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'agg-vs-transform',
    type: 'choice',
    prompt:
      '`sales` has 6 rows in 3 regions. How many rows does `sales.groupby("region")["amount"].transform("mean")` have?',
    options: [
      { text: '3', correct: false, explain: 'That is .mean(): an aggregation returns one row per group.' },
      {
        text: '6',
        correct: true,
        explain:
          'transform returns one value per original row (the group’s mean, repeated), aligned to the original index.',
      },
      { text: '1', correct: false, explain: 'One value would be sales["amount"].mean(), with no grouping.' },
      {
        text: '9',
        correct: false,
        explain: 'transform never adds rows; it maps each row to its group’s statistic.',
      },
    ],
  },
  {
    id: 'left-join',
    type: 'choice',
    prompt:
      'Orders has 4 rows; one order’s user_id is missing from users. What does `orders.merge(users, on="user_id", how="left")` give, if user ids in users are unique?',
    options: [
      {
        text: '3 rows; the unmatched order is dropped',
        correct: false,
        explain: 'That is how="inner". A left join keeps every left row.',
      },
      {
        text: '4 rows; NaN in the users columns for that order',
        correct: true,
        explain: 'Every order is kept, and the order without a matching user gets missing values.',
      },
      {
        text: '5 rows; the unmatched user is added',
        correct: false,
        explain: 'Unmatched right rows appear only with how="right" or how="outer".',
      },
    ],
  },
  {
    id: 'explosion',
    type: 'choice',
    prompt: 'After a merge, your 1,000 orders became 1,180 rows. What is the most likely cause?',
    options: [
      {
        text: 'The left join added unmatched users',
        correct: false,
        explain: 'A left join never adds rows from the right side that do not match.',
      },
      {
        text: 'Some keys appear more than once in the right table',
        correct: true,
        explain:
          'Each duplicate key multiplies the matching left rows. validate="many_to_one" would have raised MergeError.',
      },
      {
        text: 'merge sorts rows and counts some twice',
        correct: false,
        explain: 'Sorting does not duplicate rows.',
      },
      {
        text: 'NaN keys match every row',
        correct: false,
        explain: 'In pandas NaN keys match only each other, which is rarely the source of a large blow-up.',
      },
    ],
  },
  {
    id: 'melt',
    type: 'choice',
    prompt:
      'A table has one row per store and columns `jan`, `feb`, `mar`. Which call makes one row per store and month?',
    options: [
      {
        text: 'df.pivot_table(index="store")',
        correct: false,
        explain: 'pivot_table goes the other way, from long to wide.',
      },
      {
        text: 'df.melt(id_vars="store", var_name="month")',
        correct: true,
        explain: 'melt turns the month columns into rows: store, month, value.',
      },
      {
        text: 'df.groupby("store").sum()',
        correct: false,
        explain: 'That keeps one row per store and still has the month columns.',
      },
      {
        text: 'df.T',
        correct: false,
        explain: 'Transposing swaps rows and columns but does not produce one row per store and month.',
      },
    ],
  },
  {
    id: 'groupby-nan',
    type: 'choice',
    prompt: 'By default, what happens to rows whose group key is NaN in `df.groupby("region")`?',
    options: [
      { text: 'They form their own NaN group', correct: false, explain: 'Only with dropna=False.' },
      {
        text: 'They are left out of every group',
        correct: true,
        explain:
          'groupby drops missing keys by default, so totals can silently miss rows. Pass dropna=False to keep them.',
      },
      {
        text: 'groupby raises a ValueError',
        correct: false,
        explain: 'Missing keys are allowed; they are just dropped.',
      },
    ],
  },
];

export const shareExercise: Exercise = {
  id: 'py-groupby-share',
  prompt:
    'Write top_rep_per_region(sales) returning a dict region -> the rep with the largest total amount in that region.',
  starter: `import pandas as pd

def top_rep_per_region(sales):
    best = sales.sort_values("amount").groupby("region").last()   # bug: single sales, not totals
    return best["rep"].to_dict()`,
  hints: [
    'First total per (region, rep): sales.groupby(["region", "rep"])["amount"].sum().',
    'That gives a Series with a two-level index. reset_index() turns it back into columns.',
    'Then sort by amount and keep the last row per region, or use idxmax per region.',
  ],
  solution: `import pandas as pd

def top_rep_per_region(sales):
    totals = sales.groupby(["region", "rep"])["amount"].sum().reset_index()
    best = totals.sort_values("amount", kind="stable").groupby("region").last()
    return best["rep"].to_dict()`,
  explanation:
    'Aggregating per (region, rep) first answers "who sold the most in total". Sorting the totals and taking the last row per region then picks the leader. The starter compared single sales instead of totals.',
  tests: `import pandas as pd
sales = pd.DataFrame({
    "region": ["n", "n", "n", "s", "s"],
    "rep": ["ana", "cy", "cy", "ben", "di"],
    "amount": [100, 60, 70, 30, 20],
})
assert top_rep_per_region(sales) == {"n": "cy", "s": "ben"}, top_rep_per_region(sales)`,
};
