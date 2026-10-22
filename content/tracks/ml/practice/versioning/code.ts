// Code for ml/practice/versioning. Outputs were produced by running the program with CPython 3.13.16
// (hashlib); src/lib/practice/versioning.test.ts checks the visual's TypeScript against them.
import { dataCsvLiteral, versioningExperiment, type VersioningState } from '@/lib/practice/versioning';
import type { CodeExample } from '@/lib/types';

export const initial: VersioningState = {
  rows: [
    [2, 15],
    [4, 21],
    [5, 26],
    [8, 32],
    [10, 38],
    [12, 95],
  ],
  dropOverMinutes: 60,
};

/** One state: the data table, the lineage diagram, the code literals and the printed versions. */
export const experiment = versioningExperiment('versioning', initial);

const st = (s: unknown) => s as VersioningState;

export const versionCode: CodeExample = {
  id: 'versioning-hashes',
  language: 'python',
  source: `import hashlib
import json

def short_hash(text):
    """First 12 hex digits of the SHA-256 of the text: a fingerprint of its exact bytes."""
    return hashlib.sha256(text.encode()).hexdigest()[:12]

def fit_line(rows, config):
    """Least-squares line minutes = w * km + b, after the config's cleaning step."""
    if config["drop_over_minutes"] is not None:
        rows = [(km, m) for km, m in rows if m <= config["drop_over_minutes"]]
    n = len(rows)
    sx = sy = sxx = sxy = 0
    for km, m in rows:
        sx += km
        sy += m
        sxx += km * km
        sxy += km * m
    w = (n * sxy - sx * sy) / (n * sxx - sx * sx)
    b = (sy - w * sx) / n
    return w, b

data_csv = {{data}}
config = {"drop_over_minutes": {{drop}}}

rows = [tuple(int(v) for v in line.split(",")) for line in data_csv.splitlines()[1:]]
w, b = fit_line(rows, config)
model_json = json.dumps({"w": round(w, 4), "b": round(b, 4)})

data_id = short_hash(data_csv)
config_id = short_hash(json.dumps(config, sort_keys=True))
run_id = short_hash(data_id + config_id)
model_id = short_hash(model_json)
print("data  ", data_id)
print("config", config_id)
print("run   ", run_id)
print("model ", model_id, model_json)`,
  slots: {
    data: (s) => dataCsvLiteral(st(s).rows),
    drop: (s) => (st(s).dropOverMinutes === null ? 'None' : String(st(s).dropOverMinutes)),
  },
  annotations: [
    {
      id: 'sha',
      range: { line: 6 },
      kind: 'function',
      title: 'A content hash',
      what: 'SHA-256 turns any bytes into a 256-bit number; we keep the first 12 hex digits (48 bits).',
      why: 'Change one byte and the hash changes completely; keep the bytes and it stays the same on every machine. That makes the hash a name for the exact content.',
      inputs: 'text, encoded as UTF-8 bytes',
      output: 'e.g. 8cef040fae78',
    },
    {
      id: 'clean',
      range: { line: 11 },
      kind: 'syntax',
      title: 'The config changes which rows are used',
      what: 'Keeps only deliveries that took at most drop_over_minutes minutes.',
      why: 'Cleaning steps are part of what a model was trained on. If the config is not versioned, the same data file can produce different models.',
    },
    {
      id: 'closed-form',
      range: { line: 19 },
      kind: 'math',
      title: 'Least squares in closed form',
      what: 'The slope that minimizes the squared error, from four sums.',
      why: 'A deterministic fit: the same rows always give the same w and b, so the model hash depends only on the data and the config.',
      output: 'Raises ZeroDivisionError if every kept row has the same distance',
    },
    {
      id: 'data',
      range: { line: 23 },
      kind: 'parameter',
      title: 'data.csv',
      what: 'The dataset as text, filled from the table in the experiment. In a project this is a file on disk.',
      why: 'Hashing the file’s bytes identifies this exact version of the data, whatever its file name.',
    },
    {
      id: 'config',
      range: { line: 24 },
      kind: 'parameter',
      title: 'config.json',
      what: 'The cleaning setting, filled from the experiment’s select control.',
      why: 'Configs are versioned like data: they are inputs of the run.',
    },
    {
      id: 'sort-keys',
      range: { line: 31 },
      kind: 'function',
      title: 'Hash a canonical form of the config',
      what: 'json.dumps with sort_keys=True writes the keys in a fixed order before hashing.',
      why: 'Two dicts with the same content but different key order must get the same hash, or equal configs would look different.',
    },
    {
      id: 'run-id',
      range: { line: 32 },
      kind: 'math',
      title: 'The run is named by its inputs',
      what: 'Hashes the data and config hashes together.',
      why: 'Same inputs, same run ID: a pipeline tool can skip a run whose ID it has already produced, and anyone can check which inputs a run used.',
    },
    {
      id: 'model-id',
      range: { line: 33 },
      kind: 'math',
      title: 'The model is named by its content',
      what: 'Hashes the saved model (here its weights as JSON).',
      why: 'Two runs can produce the identical model; the hash shows it. A registry stores this hash next to the run ID, which is the lineage.',
    },
  ],
};

export const versionRunner: CodeExample = {
  id: 'versioning-runner',
  language: 'python',
  run: 'pyodide',
  source: `import hashlib
import json

def short_hash(text):
    """First 12 hex digits of the SHA-256 of the text: a fingerprint of its exact bytes."""
    return hashlib.sha256(text.encode()).hexdigest()[:12]

def fit_line(rows, config):
    """Least-squares line minutes = w * km + b, after the config's cleaning step."""
    if config["drop_over_minutes"] is not None:
        rows = [(km, m) for km, m in rows if m <= config["drop_over_minutes"]]
    n = len(rows)
    sx = sy = sxx = sxy = 0
    for km, m in rows:
        sx += km
        sy += m
        sxx += km * km
        sxy += km * m
    w = (n * sxy - sx * sy) / (n * sxx - sx * sx)
    b = (sy - w * sx) / n
    return w, b

data_csv = "km,minutes\\n2,15\\n4,21\\n5,26\\n8,32\\n10,38\\n12,95\\n"
config = {"drop_over_minutes": 60}

rows = [tuple(int(v) for v in line.split(",")) for line in data_csv.splitlines()[1:]]
w, b = fit_line(rows, config)
model_json = json.dumps({"w": round(w, 4), "b": round(b, 4)})

data_id = short_hash(data_csv)
config_id = short_hash(json.dumps(config, sort_keys=True))
run_id = short_hash(data_id + config_id)
model_id = short_hash(model_json)
print("data  ", data_id)
print("config", config_id)
print("run   ", run_id)
print("model ", model_id, model_json)`,
  annotations: [],
  expectedOutput: `data   8cef040fae78
config 70c76fc9e04a
run    0737369cee8c
model  4e11ae29f6b4 {"w": 2.8039, "b": 10.1373}`,
};

/** The same idea with DVC. Run with DVC 3.67.1 and git; the outputs in the comments are from that run. */
export const dvcWorkflow: CodeExample = {
  id: 'versioning-dvc',
  language: 'bash',
  source: `dvc init
dvc add data/deliveries.csv            # writes data/deliveries.csv.dvc, ignores the CSV in git
cat data/deliveries.csv.dvc            # outs: - md5: 89c27812ea64a3d2e3e2ce96af4ca867, size: 43
git add data/deliveries.csv.dvc data/.gitignore
git commit -m "data v1"
dvc remote add -d storage /mnt/dvc-store
dvc push                               # 1 file pushed

# later: fix a row, version it again
dvc add data/deliveries.csv            # md5 becomes 0c08dadb2b846e5dc66a91eadfb7bf30
git commit -am "data v2: fix typo in row 6"

# go back to v1 of the data
git checkout HEAD~1 data/deliveries.csv.dvc
dvc checkout                           # data/deliveries.csv holds the v1 bytes again`,
  annotations: [
    {
      id: 'add',
      range: { line: 2, startCol: 0, endCol: 27 },
      match: 'dvc add data/deliveries.csv',
      kind: 'framework',
      title: 'dvc add',
      what: 'Hashes the file (MD5), copies it into DVC’s cache under that hash, and writes a small .dvc pointer file.',
      why: 'Git is bad at large binary files. DVC keeps the bytes outside git and puts only the hash in git, so a git commit pins the exact data version.',
      output: 'data/deliveries.csv.dvc and an entry in data/.gitignore',
    },
    {
      id: 'pointer',
      range: { line: 4 },
      kind: 'syntax',
      title: 'Commit the pointer, not the data',
      what: 'The .dvc file (a few lines of YAML with the hash and size) goes into git.',
      why: 'Now the code commit and the data version travel together: checking out a commit tells you exactly which data it used.',
    },
    {
      id: 'push',
      range: { line: 7, startCol: 0, endCol: 8 },
      match: 'dvc push',
      kind: 'framework',
      title: 'dvc push',
      what: 'Uploads the cached files to the remote storage (a folder here; S3, GCS, Azure or SSH in a team).',
      why: 'Teammates and CI can then fetch any version with dvc pull, by hash.',
    },
    {
      id: 'checkout',
      range: { line: 15, startCol: 0, endCol: 12 },
      match: 'dvc checkout',
      kind: 'framework',
      title: 'dvc checkout',
      what: 'Makes the data files match the hashes in the current .dvc files.',
      why: 'git checkout restores the pointer; dvc checkout restores the bytes it points to. Together they rebuild an old experiment’s inputs.',
    },
  ],
};
