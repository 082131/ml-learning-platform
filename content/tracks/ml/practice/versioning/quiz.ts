import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'same-name',
    type: 'choice',
    prompt:
      'Two runs both say they trained on deliveries.csv, but their data hashes differ. What do you conclude?',
    options: [
      {
        text: 'They trained on different contents; the file changed between the runs',
        correct: true,
        explain:
          'A content hash names the bytes, not the file. A different hash means at least one byte differs.',
      },
      {
        text: 'The hash function is unreliable',
        correct: false,
        explain: 'SHA-256 is deterministic: the same bytes give the same hash on every machine.',
      },
      {
        text: 'Nothing: the file name is what identifies a dataset',
        correct: false,
        explain:
          'Names get reused (data_final.csv, data_final_v2.csv…). That is exactly the problem hashes solve.',
      },
    ],
  },
  {
    id: 'same-model',
    type: 'choice',
    prompt:
      'You change drop_over_minutes from 60 to 90. The config and run hashes change, but the model hash stays the same. Why?',
    options: [
      {
        text: 'Both settings drop the same rows here (only the 95-minute delivery), so the fit sees identical data',
        correct: true,
        explain:
          'Different inputs can still produce the same output. The model hash shows it, which the run ID alone cannot.',
      },
      {
        text: 'The model hash ignores the config',
        correct: false,
        explain: 'The model hash only sees the model’s content. It stayed the same because the content did.',
      },
      {
        text: 'It is a hash collision',
        correct: false,
        explain:
          'A collision between 12-hex-digit hashes of different models is possible in principle but astronomically unlikely here; the models are actually identical.',
      },
    ],
  },
  {
    id: 'what-to-version',
    type: 'choice',
    prompt: 'A model in production misbehaves. Which record lets you rebuild it?',
    options: [
      {
        text: 'Its run ID linked to the code commit, the data hash, the config and the environment',
        correct: true,
        explain:
          'That is the lineage: every input of the run, each pinned by a version that cannot silently change.',
      },
      {
        text: 'The model file and the date it was trained',
        correct: false,
        explain: 'A date does not say which data or code was used; data in a folder may have changed since.',
      },
      {
        text: 'The name of the dataset folder',
        correct: false,
        explain:
          'A folder’s content changes over time. Without a hash or version you cannot know what it held then.',
      },
    ],
  },
  {
    id: 'hash-bits',
    type: 'numeric',
    prompt: 'The lesson keeps 12 hexadecimal digits of each hash. How many bits is that?',
    answer: 48,
    tolerance: 0,
    hint: 'One hex digit encodes 4 bits.',
    explain:
      '12 × 4 = 48 bits, about 2.8 × 10¹⁴ possible values: plenty to tell a project’s versions apart. Tools store the full hash.',
  },
  {
    id: 'restore-order',
    type: 'order',
    prompt: 'Put the steps for retraining last month’s model exactly in order.',
    items: [
      'Look up the model’s run in the registry',
      'Check out the code commit recorded with the run',
      'Restore the data version recorded with the run (git checkout of the .dvc file, then dvc checkout)',
      'Run training with the recorded config and seed',
      'Compare the new model’s hash or metrics with the recorded ones',
    ],
    explain:
      'The registry gives the lineage; code and data are restored from it; the comparison at the end proves the rebuild.',
  },
];

export const manifestExercise: Exercise = {
  id: 'manifest-diff',
  prompt:
    'Write `changed_files(old, new)` for two manifests mapping file names to content hashes. Return the sorted names that were added, removed or whose hash changed.',
  starter: `def changed_files(old, new):
    # old and new map file name -> hash, e.g. {"train.csv": "8cef040fae78"}
    pass`,
  hints: [
    'A file can be in old only (removed), in new only (added) or in both (changed if the hashes differ).',
    'Take the union of the keys: `names = set(old) | set(new)`.',
    '`old.get(name) != new.get(name)` is true for added, removed and changed files alike.',
  ],
  solution: `def changed_files(old, new):
    names = set(old) | set(new)
    return sorted(name for name in names if old.get(name) != new.get(name))`,
  explanation:
    'Comparing hashes instead of contents makes the check cheap, and comparing by name catches renames as one removal plus one addition. Tools such as DVC and git do the same comparison to decide what to upload or restore.',
  tests: `old = {"train.csv": "8cef040fae78", "val.csv": "1a2b3c4d5e6f", "labels.json": "aaaaaaaaaaaa"}
assert changed_files(old, dict(old)) == [], 'identical manifests have no changes'
new = {"train.csv": "4222f97f30d0", "val.csv": "1a2b3c4d5e6f", "extra.csv": "bbbbbbbbbbbb"}
assert changed_files(old, new) == ["extra.csv", "labels.json", "train.csv"], 'expected a changed, a removed and an added file, sorted'
assert changed_files({}, {"a": "1"}) == ["a"], 'a file only in new was added'`,
};
