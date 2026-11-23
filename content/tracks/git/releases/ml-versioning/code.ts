// Code for "Versioning data and models". The pointer runner is checked under CPython by python-outputs.test.ts;
// its Git LFS pointer is byte-for-byte what `git lfs pointer --file=model.pt` (git-lfs 3.4) printed for the same
// file. The DVC file follows the DVC 3.x .dvc format. Storage numbers are arithmetic on stated assumptions.
import { storageExperiment } from '@/lib/git/experiments';
import type { CodeExample } from '@/lib/types';

export const storage = storageExperiment('git-storage');

export const pointerRunner: CodeExample = {
  id: 'pointer-files',
  language: 'python',
  run: 'pyodide',
  source: `import hashlib

model = b"weights v1\\n" * 1000          # stand-in for a model file: 11,000 bytes

# What Git LFS commits instead of the file (spec v1). The real bytes go to the LFS server.
lfs_pointer = (
    "version https://git-lfs.github.com/spec/v1\\n"
    f"oid sha256:{hashlib.sha256(model).hexdigest()}\\n"
    f"size {len(model)}\\n"
)
print(lfs_pointer)

# What DVC commits (model.pt.dvc). The real bytes go to your DVC remote (S3, GCS, a shared drive).
dvc_file = (
    "outs:\\n"
    f"- md5: {hashlib.md5(model).hexdigest()}\\n"
    f"  size: {len(model)}\\n"
    "  hash: md5\\n"
    "  path: model.pt\\n"
)
print(dvc_file)

retrained = b"weights v2\\n" * 1000
print("same size, new id:", hashlib.sha256(retrained).hexdigest()[:12])`,
  annotations: [
    {
      id: 'oid',
      range: { line: 8 },
      kind: 'framework',
      title: 'oid',
      what: 'The SHA-256 of the file’s content: the key under which the LFS server stores it.',
      why: 'Content addressing again. The pointer is tiny, diffs cleanly, and changes exactly when the content does.',
    },
    {
      id: 'dvc-md5',
      range: { line: 16 },
      kind: 'framework',
      title: 'md5 in a .dvc file',
      what: 'DVC names cached files by MD5 and stores them under .dvc/cache and the remote.',
      why: 'MD5 is fine for addressing your own files, though not as a defence against deliberate collisions.',
    },
  ],
  expectedOutput: `version https://git-lfs.github.com/spec/v1
oid sha256:9073b3efde602290d79b58767305baba923573cfbf068a6e6437a05795611d13
size 11000

outs:
- md5: 6555a9b6a59508fa6f2d0934c6ce12b2
  size: 11000
  hash: md5
  path: model.pt

same size, new id: 1b0a28b26abe`,
};

export const lfsShell: CodeExample = {
  id: 'lfs-shell',
  language: 'bash',
  source: `git lfs install                      # once per machine: registers the LFS filters
git lfs track "*.onnx" "*.pt"        # writes the patterns to .gitattributes
git add .gitattributes model.onnx
git commit -m "Add exported model"
git push                             # pushes the pointer to Git, the file to LFS storage
git lfs ls-files                     # which files are stored in LFS
GIT_LFS_SKIP_SMUDGE=1 git clone https://github.com/ada/churn-model.git   # clone pointers only
git lfs pull --include="models/v3/*" # then download just what you need`,
  annotations: [
    {
      id: 'track',
      range: { line: 2 },
      kind: 'function',
      title: 'git lfs track',
      what: 'Adds lines such as "*.pt filter=lfs diff=lfs merge=lfs -text" to .gitattributes.',
      why: 'Commit .gitattributes first: files added before the pattern exists go into plain Git history.',
    },
    {
      id: 'skip',
      range: { line: 7 },
      kind: 'variable',
      title: 'GIT_LFS_SKIP_SMUDGE',
      what: 'Checks out pointer files instead of downloading every large file.',
      why: 'CI jobs that only lint code do not need the 4 GB of weights.',
    },
  ],
};

export const dvcShell: CodeExample = {
  id: 'dvc-shell',
  language: 'bash',
  source: `dvc init                                     # in a Git repository
dvc remote add -d storage s3://acme-ml/churn-model
dvc add data/customers.parquet               # writes data/customers.parquet.dvc, gitignores the data
git add data/customers.parquet.dvc data/.gitignore
git commit -m "Track the customer snapshot of 2026-03-01"
dvc push                                     # upload the data to S3
# a pipeline: dvc.yaml declares stages; dvc repro reruns only what changed; dvc.lock records every hash
dvc repro
git add dvc.lock && git commit -m "Retrain on the March snapshot"
git switch --detach v1.0.0 && dvc checkout   # code AND data exactly as they were at v1.0.0`,
  annotations: [
    {
      id: 'lock',
      range: { line: 8 },
      kind: 'framework',
      title: 'dvc.lock',
      what: 'The hashes of every stage’s inputs, parameters and outputs from the last run.',
      why: 'Committed with the code, it ties one Git commit to one exact data version and one exact model.',
    },
    {
      id: 'checkout',
      range: { line: 10 },
      kind: 'function',
      title: 'dvc checkout',
      what: 'Replaces the data files with the versions named in the .dvc and dvc.lock files of the current commit.',
      why: 'Git moves the code and the pointers; DVC follows the pointers. Together they reproduce a past state.',
    },
  ],
};

export const lineageJson: CodeExample = {
  id: 'model-lineage',
  language: 'json',
  source: `{
  "model": "churn-classifier",
  "version": "1.3.0",
  "git_commit": "85665b295d0bd35cd1546fd79a281e8b6f6601ea",
  "git_tag": "v1.3.0",
  "data": { "path": "data/customers.parquet", "md5": "6555a9b6a59508fa6f2d0934c6ce12b2", "rows": 184220 },
  "params": { "model": "xgboost", "max_depth": 6, "learning_rate": 0.05, "seed": 42 },
  "environment": { "python": "3.12.7", "lock_file_sha256": "1f0c7a..." },
  "metrics": { "roc_auc_validation": 0.871 },
  "created": "2026-03-02T14:05:00Z"
}`,
  annotations: [
    {
      id: 'commit',
      range: { line: 4 },
      kind: 'variable',
      title: 'git_commit',
      what: 'The full commit id of the training code (git rev-parse HEAD at training time).',
      why: 'With the commit, the data hash, the parameters and the environment, anyone can rebuild this model.',
    },
  ],
};
