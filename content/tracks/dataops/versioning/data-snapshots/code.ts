// Code for the data snapshots lesson. versions.py is pure Python; its output for every setting was produced with
// CPython 3.13 (snapshots.test.ts checks the browser's version against it). manifest.py runs in the browser and
// is checked under CPython by content/tracks/dataops/python-outputs.test.ts. The Delta Lake, lakeFS and DVC
// snippets illustrate those tools and are not run here.
import { SNAPSHOT_SOURCE, snapshotExperiment, snapshotSlots, type SnapshotState } from '@/lib/dataops/snapshots';
import type { CodeExample } from '@/lib/types';

export const sn = snapshotExperiment('snapshots');

const st = (s: unknown) => s as SnapshotState;

export const versionsPython: CodeExample = {
  id: 'versions-python',
  language: 'python',
  source: SNAPSHOT_SOURCE,
  slots: {
    pattern: (s) => snapshotSlots(st(s)).pattern,
    share: (s) => snapshotSlots(st(s)).share,
    fileRows: (s) => snapshotSlots(st(s)).fileRows,
  },
  annotations: [
    {
      id: 'pattern',
      range: { line: 11, startCol: 11, endCol: 22 },
      match: '{{pattern}}',
      kind: 'parameter',
      title: 'PATTERN',
      what: 'Whether each version changes rows scattered over the table, or one contiguous block.',
      why: 'Label corrections land anywhere; a daily append or a reprocessed day lands in one place. The difference decides the cost.',
    },
    {
      id: 'share',
      range: { line: 12, startCol: 8, endCol: 17 },
      match: '{{share}}',
      kind: 'parameter',
      title: 'SHARE',
      what: 'How many row updates each version makes, as a share of the 100,000 rows.',
      why: 'Random draws can hit the same row twice, so the number of distinct changed rows is a little lower.',
    },
    {
      id: 'file-rows',
      range: { line: 13, startCol: 12, endCol: 24 },
      match: '{{fileRows}}',
      kind: 'parameter',
      title: 'FILE_ROWS',
      what: 'How many rows each data file holds.',
      why: 'Bigger files mean fewer files to manage, and more rows rewritten for each touched file.',
    },
    {
      id: 'files',
      range: { line: 25 },
      kind: 'variable',
      title: 'files',
      what: 'The set of file numbers that hold at least one changed row.',
      why: 'Copy-on-write must rewrite each of them in full; the untouched files are shared with the previous version.',
    },
    {
      id: 'cow',
      range: { line: 27 },
      kind: 'math',
      title: 'copy-on-write cost',
      what: 'Touched files × rows per file: the rows written for this version.',
      why: 'One changed row in a file costs a whole file.',
    },
    {
      id: 'mor',
      range: { line: 28 },
      kind: 'math',
      title: 'merge-on-read cost',
      what: 'Only the changed rows are written, to a delta file.',
      why: 'Cheap to write; every read of the latest version must merge the deltas until a compaction rewrites them into base files.',
    },
  ],
};

export const manifestRunner: CodeExample = {
  id: 'manifest-runner',
  language: 'python',
  run: 'pyodide',
  source: `import hashlib
import json

# A dataset version is a manifest: the content hash of every file it contains.
files_v1 = {"part-000.csv": "id,label\\n1,cat\\n2,dog\\n", "part-001.csv": "id,label\\n3,dog\\n4,cat\\n"}
files_v2 = dict(files_v1, **{"part-001.csv": "id,label\\n3,dog\\n4,dog\\n"})  # one label corrected


def manifest(files):
    return {name: hashlib.sha256(body.encode()).hexdigest()[:12] for name, body in sorted(files.items())}


def version_id(m):  # the version is the hash of its manifest, so equal content means an equal ID
    return hashlib.sha256(json.dumps(m, sort_keys=True).encode()).hexdigest()[:12]


m1, m2 = manifest(files_v1), manifest(files_v2)
print("v1", version_id(m1), m1)
print("v2", version_id(m2), m2)
changed = [f for f in m2 if m1.get(f) != m2[f]]
print("files to store for v2:", changed, "(the rest are shared with v1)")
print("rebuilding v1 gives the same ID:", version_id(manifest(files_v1)) == version_id(m1))`,
  annotations: [],
  expectedOutput: `v1 2aa71949496a {'part-000.csv': '9a03b9759193', 'part-001.csv': 'af620319c545'}
v2 a64cc1d42dc0 {'part-000.csv': '9a03b9759193', 'part-001.csv': '2ab166ba5492'}
files to store for v2: ['part-001.csv'] (the rest are shared with v1)
rebuilding v1 gives the same ID: True`,
};

export const deltaSql: CodeExample = {
  id: 'delta-time-travel',
  language: 'sql',
  source: `-- Delta Lake (Spark SQL), not run here. Every write creates a new table version.
DESCRIBE HISTORY training_examples;                          -- versions, timestamps, operations

SELECT * FROM training_examples VERSION AS OF 42;            -- the exact rows model v7 trained on
SELECT * FROM training_examples TIMESTAMP AS OF '2026-10-01';

RESTORE TABLE training_examples TO VERSION AS OF 42;         -- roll back a bad relabeling

-- Old files are kept until VACUUM removes those older than the retention period (7 days by default).
VACUUM training_examples RETAIN 720 HOURS;`,
  annotations: [],
};

export const lakefsBash: CodeExample = {
  id: 'lakefs-branch',
  language: 'bash',
  source: `# lakeFS, not run here: Git-like branches over object storage, without copying data
lakectl branch create lakefs://ml-data/relabel-2026-11 --source lakefs://ml-data/main
# ... the relabeling job writes corrected labels to the branch ...
lakectl diff lakefs://ml-data/main lakefs://ml-data/relabel-2026-11
lakectl commit lakefs://ml-data/relabel-2026-11 -m "Fix 412 labels flagged by the audit (guidelines v2)"
lakectl merge lakefs://ml-data/relabel-2026-11 lakefs://ml-data/main
lakectl tag create lakefs://ml-data/train-model-v8 lakefs://ml-data/main   # pin what model v8 trains on`,
  annotations: [],
};

export const dvcPipeline: CodeExample = {
  id: 'dvc-pipeline',
  language: 'bash',
  source: `# DVC, not run here: version data next to code, and rerun only the stages whose inputs changed
dvc stage add -n prepare -d raw/ -d prepare.py -o data/clean.parquet python prepare.py
dvc stage add -n train -d data/clean.parquet -d train.py -p train.lr -o model.pkl python train.py
dvc repro            # runs stages whose dependencies' hashes changed; records them in dvc.lock
git add dvc.yaml dvc.lock && git commit -m "Retrain on relabeled data"
dvc push             # uploads data and model files to remote storage, by content hash
git checkout v1.2 && dvc checkout   # restores the exact data and model of an old commit`,
  annotations: [],
};
