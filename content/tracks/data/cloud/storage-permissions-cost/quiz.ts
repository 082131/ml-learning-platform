import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'storage-month',
    type: 'numeric',
    prompt:
      'After a year at 500 GB per month, 1,500 GB is in standard storage ($0.023 per GB-month) and 4,500 GB in infrequent access ($0.0125). What is the monthly storage cost in dollars?',
    answer: 90.75,
    tolerance: 0.005,
    hint: 'Multiply each amount by its price and add.',
    explain: '1,500 × 0.023 = 34.50 and 4,500 × 0.0125 = 56.25, so 90.75 per month.',
  },
  {
    id: 'biggest-lever',
    type: 'choice',
    prompt: 'A dashboard runs 50 full-table queries a day on a 6 TB table. What cuts the bill most?',
    options: [
      {
        text: 'Partition the table so each query reads only the days it needs',
        correct: true,
        explain:
          'With example prices, 50 × 30 × 6 TB × $5 is $45,000 a month in scans, while all the storage costs about $138. Reading 7 days instead of a year divides the scan cost by about 50.',
      },
      {
        text: 'Move old data to archive storage',
        correct: false,
        explain:
          'That saves under $100 a month here, and full scans could no longer read the archived months.',
      },
    ],
  },
  {
    id: 'least-priv',
    type: 'choice',
    prompt: 'Which permission set follows least privilege for the job that writes cleaned data?',
    options: [
      {
        text: 's3:GetObject on lake/raw/* and s3:PutObject on lake/clean/*',
        correct: true,
        explain: 'Exactly the reads and writes it performs, on exactly the prefixes it uses.',
      },
      {
        text: 's3:* on the whole bucket, because it is simpler',
        correct: false,
        explain: 'A bug or a leaked key could then delete raw data or change bucket permissions.',
      },
      {
        text: 'The data engineer’s personal access key',
        correct: false,
        explain:
          'Jobs need their own identity, so access can be audited and revoked without breaking a person’s login.',
      },
    ],
  },
  {
    id: 'deny',
    type: 'choice',
    prompt:
      'A policy allows s3:* on the bucket for admins, and another statement denies s3:DeleteObject on raw/* for everyone. Can an admin delete a raw object?',
    options: [
      {
        text: 'No: an explicit deny overrides any allow',
        correct: true,
        explain: 'Evaluation order is explicit deny first, then allow, then the default deny.',
      },
      {
        text: 'Yes: the more specific statement for admins wins',
        correct: false,
        explain: 'There is no "most specific wins" rule. Deny beats allow wherever both match.',
      },
    ],
  },
  {
    id: 'secrets',
    type: 'choice',
    prompt: 'Where should a pipeline’s database password live?',
    options: [
      {
        text: 'In a secrets manager, read at run time by the job’s identity',
        correct: true,
        explain:
          'It never appears in code or logs, access to it is audited, and it can be rotated without a deployment.',
      },
      {
        text: 'In config.py, committed to the repository',
        correct: false,
        explain:
          'Anyone with repository access, now or in the future, has the password; it is also in every clone and backup.',
      },
    ],
  },
];

export const unusedExercise: Exercise = {
  id: 'unused-grants',
  prompt: 'Write `unused_grants(grants, log)` to find permissions nobody used: candidates for removal.',
  starter: `def unused_grants(grants, log):
    # grants: list of (principal, action) pairs that are allowed.
    # log: list of (principal, action) pairs that were actually used in the last 90 days.
    # Return the sorted list of grants that never appear in the log.
    return []`,
  hints: ['Turn the log into a set for fast lookups.', 'Keep each grant that is not in the set, then sort.'],
  solution: `def unused_grants(grants, log):
    used = set(log)
    return sorted(g for g in grants if g not in used)`,
  explanation:
    'Access reviews work this way: compare what is granted with what audit logs show was used, and remove the rest. Cloud providers offer the same analysis (for example, "last accessed" information for roles).',
  tests: `grants = [("analyst", "s3:GetObject"), ("analyst", "s3:PutObject"), ("etl", "s3:GetObject"), ("etl", "s3:PutObject")]
log = [("etl", "s3:GetObject"), ("analyst", "s3:GetObject"), ("etl", "s3:PutObject"), ("etl", "s3:GetObject")]
assert unused_grants(grants, log) == [("analyst", "s3:PutObject")], 'the analyst never wrote anything'
assert unused_grants(grants, []) == sorted(grants), 'with an empty log every grant is unused'
assert unused_grants([], log) == [], 'no grants, nothing to remove'`,
};
