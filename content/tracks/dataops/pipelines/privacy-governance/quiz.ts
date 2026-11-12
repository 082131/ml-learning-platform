import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'k4-l1',
    type: 'choice',
    prompt:
      'With 10-year age bands, 3 postcode digits and sex removed, the table is 4-anonymous, yet the attacker learns Lena’s diagnosis. Why?',
    options: [
      {
        text: 'k-anonymity only holds when k is at least 5',
        correct: false,
        explain: 'There is no magic k. A group of 50 people who all share one diagnosis would leak it just the same.',
      },
      {
        text: 'All four people in Lena’s group have the same diagnosis, so knowing her group is enough (l = 1)',
        correct: true,
        explain:
          'k limits finding the row; it says nothing about the values inside a group. l-diversity requires several distinct sensitive values per group.',
      },
      {
        text: 'The attacker can still read the postcode digits that were masked',
        correct: false,
        explain: 'The masked digits are gone from the release. The leak comes from the diagnoses in the group, not the postcode.',
      },
      {
        text: 'Removing sex made the groups smaller, which helps the attacker',
        correct: false,
        explain: 'Removing a quasi-identifier merges groups and makes them larger. In this setting it raised k from 2 to 4.',
      },
    ],
  },
  {
    id: 'plain-hash',
    type: 'choice',
    prompt: 'A team replaces customer emails with their SHA-256 hash before sharing training data. What is the problem?',
    options: [
      {
        text: 'SHA-256 can be reversed with enough computing power',
        correct: false,
        explain:
          'Nobody reverses SHA-256. The attack is the other direction: hash a list of candidate emails and look each one up.',
      },
      {
        text: 'Anyone with a list of candidate emails can hash them and find matches, so the tokens are linkable to people',
        correct: true,
        explain:
          'In pseudonymize.py, hashing ben@example.com finds his row. A keyed hash (HMAC) with a secret key stops this.',
      },
      {
        text: 'Two different emails may get the same hash, merging customers',
        correct: false,
        explain: 'SHA-256 collisions are not a practical concern; even 16 hex characters collide rarely at this scale.',
      },
    ],
  },
  {
    id: 'still-personal',
    type: 'choice',
    prompt:
      'Under the GDPR, is a training table where customer IDs were replaced with HMAC tokens (key held by the company) anonymous data?',
    options: [
      {
        text: 'Yes, because no one can see the original IDs in the table',
        correct: false,
        explain: 'The company holds the key and can re-link every token, which makes this pseudonymization.',
      },
      {
        text: 'No, it is pseudonymized and still personal data, because the key holder can re-identify people',
        correct: true,
        explain:
          'Pseudonymization lowers risk and is encouraged, but obligations such as erasure and purpose limits still apply.',
      },
      {
        text: 'It depends only on how many rows the table has',
        correct: false,
        explain: 'Size does not decide whether data relates to identifiable people.',
      },
    ],
  },
  {
    id: 'k-calc',
    type: 'numeric',
    prompt:
      'After generalization, a table’s groups have sizes 6, 3, 9, 4 and 3. Each group has at least 2 distinct diagnoses, and one group has exactly 2. What is k?',
    answer: 3,
    tolerance: 0,
    hint: 'k is the size of the smallest group.',
    explain: 'The smallest groups have 3 rows, so the table is 3-anonymous (and 2-diverse).',
  },
  {
    id: 'erasure-model',
    type: 'choice',
    prompt:
      'A customer asks for erasure. Their rows are deleted from the training table. A model already in production was trained on the old version. What is a reasonable plan?',
    options: [
      {
        text: 'Nothing more: models never contain personal data',
        correct: false,
        explain:
          'Models can memorize training examples, especially rare ones and large models. Whether a model holds personal data depends on the case.',
      },
      {
        text: 'Expire or rewrite old snapshots and copies, record the request, and exclude the person from the next retrain according to a documented policy',
        correct: true,
        explain:
          'Data copies are removed on a deadline; for models, teams usually document a policy (retrain on schedule without the data) and assess memorization risk.',
      },
      {
        text: 'Delete the production model immediately and stop serving until a new one is trained',
        correct: false,
        explain:
          'Possible in extreme cases, but rarely proportionate. The policy should be decided in advance, not invented per request.',
      },
    ],
  },
  {
    id: 'datasheet',
    type: 'choice',
    prompt: 'Which item belongs in a datasheet for a training dataset but is easy to forget?',
    options: [
      {
        text: 'The uses the dataset is not suited for',
        correct: true,
        explain:
          'Datasheets record intended and unintended uses, so a later team does not train, say, an eligibility model on data collected for routing.',
      },
      {
        text: 'The model architecture that will be trained on it',
        correct: false,
        explain: 'That belongs in a model card. The datasheet describes the data, which may feed many models.',
      },
      {
        text: 'The hyperparameters of the last training run',
        correct: false,
        explain: 'Run settings belong in experiment tracking, not in the dataset’s documentation.',
      },
    ],
  },
];

export const kExercise: Exercise = {
  id: 'k-and-l',
  prompt: 'Write `k_and_l(rows)`: the k-anonymity and l-diversity of a table of (quasi-identifier tuple, sensitive value) rows.',
  starter: `def k_and_l(rows):
    # rows: list of (qi, sensitive) where qi is a tuple of generalized quasi-identifiers.
    # Return (k, l): the smallest group size and the fewest distinct sensitive values in any group.
    return len(rows), len(set(s for _, s in rows))`,
  hints: [
    'Group the rows by qi in a dict: qi -> list of sensitive values.',
    'k = min of the list lengths; l = min of the number of distinct values in each list.',
  ],
  solution: `def k_and_l(rows):
    groups = {}
    for qi, s in rows:
        groups.setdefault(qi, []).append(s)
    k = min(len(v) for v in groups.values())
    l = min(len(set(v)) for v in groups.values())
    return k, l`,
  explanation:
    'The starter treats the whole table as one group. Both measures are about the worst group, because an attacker targets a specific person, and that person may be in the smallest or least varied group.',
  tests: `rows = [(("30-39", "101**"), "flu"), (("30-39", "101**"), "asthma"),
        (("50-59", "104**"), "diabetes"), (("50-59", "104**"), "diabetes"), (("50-59", "104**"), "diabetes")]
assert k_and_l(rows) == (2, 1)
assert k_and_l([(("a",), "x"), (("a",), "y")]) == (2, 2)`,
};
