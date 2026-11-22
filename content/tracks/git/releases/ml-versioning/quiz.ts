import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'delete-later',
    type: 'choice',
    prompt: 'A 600 MB checkpoint was committed to plain Git last month and deleted in a later commit. What does a new clone download?',
    options: [
      { text: 'Nothing for the checkpoint, since the file no longer exists on main', correct: false, explain: 'Clones download all history, and the old commit still contains the checkpoint.' },
      { text: 'The checkpoint, inside the old commit’s history', correct: true, explain: 'Every clone pays for it forever, unless history is rewritten. (GitHub would also have rejected a single file over 100 MiB.)' },
      { text: 'Only a pointer to the checkpoint, which Git creates automatically for big files', correct: false, explain: 'Plain Git has no pointer mechanism. That is what Git LFS and DVC add.' },
    ],
  },
  {
    id: 'lfs-vs-dvc',
    type: 'choice',
    prompt: 'Which statement describes the difference between Git LFS and DVC?',
    options: [
      { text: 'LFS uses the Git host’s storage; DVC uses yours and adds pipelines', correct: true, explain: 'Both commit small pointer files. DVC also tracks pipeline stages, parameters and metrics in dvc.yaml and dvc.lock.' },
      { text: 'LFS works only for images and media; DVC works only for tabular data files', correct: false, explain: 'Both work on any file: weights, datasets, archives.' },
      { text: 'LFS keeps every version inside Git history; DVC only keeps the latest one', correct: false, explain: 'Neither puts the large content in Git history, and both can restore any committed version.' },
    ],
  },
  {
    id: 'reproduce',
    type: 'choice',
    prompt: 'A model in production misbehaves. Which record lets you rebuild exactly the model that was deployed?',
    options: [
      { text: 'The model file’s name and folder, for example models/churn_final_v3.pkl', correct: false, explain: 'A name says nothing about the code, data or settings that produced it.' },
      { text: 'The date and time the model was trained, matched against git log', correct: false, explain: 'Several commits, data refreshes and parameter changes can share a day.' },
      { text: 'The commit id, data hash, parameters and environment lock', correct: true, explain: 'That is the model’s lineage. A registry entry or the training run’s metadata should store all four.' },
    ],
  },
  {
    id: 'clone-size',
    type: 'numeric',
    prompt: 'A 2 GB model is released 10 times, each retraining changing every weight. Roughly how many GB does a clone download with plain Git, assuming no compression gains?',
    answer: 20,
    tolerance: 0,
    hint: 'Every version is in history.',
    explain: '2 GB × 10 = 20 GB. With LFS or DVC, a checkout downloads only the 2 GB it needs.',
  },
  {
    id: 'order-dvc',
    type: 'order',
    prompt: 'Put the steps for versioning a new dataset snapshot with DVC in order.',
    items: ['dvc add data/customers.parquet', 'git add data/customers.parquet.dvc data/.gitignore', 'git commit -m "Track the March snapshot"', 'dvc push', 'git push'],
    explain: 'DVC hashes and caches the file, Git records the pointer, then both stores are pushed. Pushing the code without dvc push leaves teammates with a pointer to data they cannot fetch.',
  },
];

export const pointerExercise: Exercise = {
  id: 'verify-lfs-pointer',
  prompt:
    'Write `verify_pointer(pointer, data)`. `pointer` is the text of a Git LFS pointer file (lines "version ...", "oid sha256:<hex>", "size <n>"); `data` is the bytes of a downloaded file. Return True if the file’s SHA-256 and size match the pointer, False otherwise. Return False if the pointer lacks an oid or size line.',
  starter: `import hashlib

def verify_pointer(pointer, data):
    pass`,
  hints: [
    'Split each line once on a space into a key and a value, and build a dict.',
    'The oid value starts with "sha256:"; compare the rest with hashlib.sha256(data).hexdigest(), and int(size) with len(data).',
  ],
  solution: `import hashlib

def verify_pointer(pointer, data):
    fields = dict(line.split(" ", 1) for line in pointer.strip().splitlines() if " " in line)
    oid, size = fields.get("oid", ""), fields.get("size")
    if not oid.startswith("sha256:") or size is None:
        return False
    return oid[len("sha256:"):] == hashlib.sha256(data).hexdigest() and int(size) == len(data)`,
  explanation:
    'Git LFS does this check on every download: the pointer names the content by its hash, so a corrupted or swapped file is detected. It is the same idea as Git’s object ids, applied to files too big for Git.',
  tests: `model = b"weights v1\\n" * 1000
p = "version https://git-lfs.github.com/spec/v1\\noid sha256:9073b3efde602290d79b58767305baba923573cfbf068a6e6437a05795611d13\\nsize 11000\\n"
assert verify_pointer(p, model) is True
assert verify_pointer(p, model + b"x") is False
assert verify_pointer(p, b"weights v2\\n" * 1000) is False
assert verify_pointer(p.replace("size 11000", "size 10999"), model) is False
assert verify_pointer("version https://git-lfs.github.com/spec/v1\\nsize 11000\\n", model) is False`,
};
