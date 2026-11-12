import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'cow-random',
    type: 'choice',
    prompt:
      'An audit corrects 1,000 random labels a week in a 100,000-row training table stored in files of 1,000 rows, with copy-on-write. Why does each weekly version cost almost a full copy?',
    options: [
      {
        text: 'Copy-on-write always rewrites the whole table on every commit',
        correct: false,
        explain:
          'It rewrites only files with a changed row. A block of 1,000 contiguous rows costs 1 or 2 files, not the table.',
      },
      {
        text: 'With 1,000 scattered rows over 100 files, nearly every file holds at least one changed row and must be rewritten',
        correct: true,
        explain:
          'The chance a given file escapes 1,000 random updates is (1 − 1/100)^1000 ≈ 0.00004. In the experiment all 100 files are rewritten every version.',
      },
      {
        text: 'Each label correction creates a new file, so 1,000 corrections create 1,000 files',
        correct: false,
        explain:
          'That is closer to merge-on-read, and even there deltas are batched into a few files per commit, not one per row.',
      },
      {
        text: 'Time travel needs a full copy of every version to be able to query it',
        correct: false,
        explain: 'Versions share every unchanged file. Time travel reads the files listed in the old version’s metadata.',
      },
    ],
  },
  {
    id: 'mor-tradeoff',
    type: 'choice',
    prompt: 'What is the main cost of merge-on-read compared with copy-on-write?',
    options: [
      {
        text: 'It cannot support time travel to versions older than the last compaction',
        correct: false,
        explain: 'Older versions remain readable as long as their base and delta files are retained.',
      },
      {
        text: 'Reads must combine base files with all delta files written since the last compaction, so they slow down until compaction runs',
        correct: true,
        explain:
          'Writes are cheap because only changed rows are written; the work moves to read time. Regular compaction rewrites base files and resets it.',
      },
      {
        text: 'It stores more rows than copy-on-write in every update pattern',
        correct: false,
        explain: 'It stores fewer in every setting of the experiment, because it writes only the changed rows.',
      },
    ],
  },
  {
    id: 'cow-calc',
    type: 'numeric',
    prompt:
      'A 1,000,000-row table is stored in 200 files of 5,000 rows. One update changes rows in 7 different files. How many rows does copy-on-write write for this version?',
    answer: 35000,
    tolerance: 0,
    hint: 'Each touched file is rewritten in full.',
    explain: '7 files × 5,000 rows = 35,000 rows, even if only 7 rows changed.',
  },
  {
    id: 'reproduce',
    type: 'choice',
    prompt:
      'Six months after release, a model behaves oddly and you must retrain it on exactly its original training data. Which record makes that possible?',
    options: [
      {
        text: 'The query that built the training set, rerun today against the production table',
        correct: false,
        explain:
          'The table has changed since: rows were corrected, added and deleted. The same query returns different rows today.',
      },
      {
        text: 'The training set’s table version or tag (or a manifest of file hashes), saved with the model, plus retained snapshots',
        correct: true,
        explain:
          'A version ID or content-hash manifest names exact data, and retention keeps it readable. Together with the code commit this rebuilds the run.',
      },
      {
        text: 'The date the model was trained, used with TIMESTAMP AS OF',
        correct: false,
        explain:
          'Close, but fragile: several writes may happen on one day, and the training job may have started before a write that day. An explicit version is exact.',
      },
      {
        text: 'A row count and the mean of each column, logged at training time',
        correct: false,
        explain: 'Summary statistics can confirm a dataset but cannot rebuild it.',
      },
    ],
  },
  {
    id: 'branch-use',
    type: 'choice',
    prompt: 'Why run a large relabeling job on a data branch instead of directly on main?',
    options: [
      {
        text: 'Branches make the relabeling job run faster',
        correct: false,
        explain: 'The job does the same work. Branches change what other people see, not how fast the job runs.',
      },
      {
        text: 'Training jobs reading main stay unaffected until the result is checked; then it is merged atomically, or discarded',
        correct: true,
        explain:
          'Like a Git feature branch: you can validate the new labels (agreement, drift, model metrics) before anyone trains on them.',
      },
      {
        text: 'Branches copy the full dataset, so the original is backed up',
        correct: false,
        explain:
          'Branches in lakeFS, Nessie or Iceberg are zero-copy: they share files with main and only store what changes.',
      },
    ],
  },
  {
    id: 'vacuum-erasure',
    type: 'choice',
    prompt:
      'A user asks for their data to be deleted. You delete their rows from the training table. Is the request done?',
    options: [
      {
        text: 'Yes: the latest version no longer contains the rows',
        correct: false,
        explain:
          'Older snapshots still hold the rows and time travel can read them, until those files are expired.',
      },
      {
        text: 'Not yet: old snapshots still contain the rows until retention expires them (or you rewrite them), and copies elsewhere need the same',
        correct: true,
        explain:
          'Deletion must cover old versions, branches, exports and backups. The privacy lesson covers how this interacts with reproducibility.',
      },
      {
        text: 'Not yet: the table must be dropped and rebuilt from scratch',
        correct: false,
        explain: 'Dropping is unnecessary; a delete plus expiring old snapshots removes the rows from storage.',
      },
    ],
  },
];

export const manifestExercise: Exercise = {
  id: 'manifest-diff',
  prompt: 'Write `diff_manifests(old, new)`: which files were added, removed and changed between two dataset versions.',
  starter: `def diff_manifests(old, new):
    # old, new: dicts {file name: content hash}.
    # Return (added, removed, changed), each a sorted list of file names.
    return sorted(set(new) - set(old)), [], []`,
  hints: [
    'removed: names in old but not in new.',
    'changed: names in both whose hash differs.',
  ],
  solution: `def diff_manifests(old, new):
    added = sorted(set(new) - set(old))
    removed = sorted(set(old) - set(new))
    changed = sorted(name for name in set(old) & set(new) if old[name] != new[name])
    return added, removed, changed`,
  explanation:
    'This is what dvc diff or lakectl diff report. Comparing hashes tells unchanged files from changed ones without reading or comparing the data itself.',
  tests: `old = {"a.csv": "11", "b.csv": "22", "c.csv": "33"}
new = {"a.csv": "11", "b.csv": "2X", "d.csv": "44"}
assert diff_manifests(old, new) == (["d.csv"], ["c.csv"], ["b.csv"])
assert diff_manifests(old, old) == ([], [], [])`,
};
