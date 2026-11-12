// Code for dataops/capstone/data-ops-pipeline. capstone.py uses only the Python standard library; it runs in the
// browser, and content/tracks/dataops/python-outputs.test.ts checks its expected output under CPython 3.13.
import type { CodeExample, ProjectBrief } from '@/lib/types';

export const setupCode: CodeExample = {
  id: 'dataops-capstone-setup',
  language: 'bash',
  source: `mkdir labeled-data-pipeline && cd labeled-data-pipeline
python3 -m venv .venv
source .venv/bin/activate              # Windows: .venv\\Scripts\\activate
pip install pytest==9.2.0              # the reference pipeline itself needs only the standard library
python capstone.py                     # prints one decision per weekly batch`,
  annotations: [],
};

export const capstoneRunner: CodeExample = {
  id: 'dataops-capstone-runner',
  language: 'python',
  run: 'pyodide',
  source: `"""Reference data-ops pipeline: annotations in, a validated, versioned, pseudonymized training set out."""
import hashlib
import hmac
import json
import math

KEY = b"demo-key-use-a-secrets-manager"
GOLD = {"t1": 1, "t2": 0}  # gold questions with known answers


class LCG:
    def __init__(self, seed):
        self.state = seed % 2**32

    def random(self):
        self.state = (1664525 * self.state + 1013904223) % 2**32
        return self.state / 2**32


def make_batch(seed, n=60, careless=None):  # stands in for an export from a labeling tool
    rng, rows = LCG(seed), []
    for i in range(n):
        truth = int(rng.random() < 0.4)
        item = {"id": f"t{i + 1}", "email": f"user{i % 25}@example.com", "amount": round(10 + 90 * rng.random(), 2)}
        for ann in ("ana", "ben", "chen"):
            wrong = rng.random() < (0.5 if ann == careless else 0.05)
            if item["id"] in GOLD and ann != careless:
                wrong = False  # careful annotators answer the gold questions correctly
            item[ann] = GOLD.get(item["id"], truth) ^ wrong
        rows.append(item)
    return rows


def kappa(a, b):
    n = len(a)
    p_o = sum(x == y for x, y in zip(a, b)) / n
    pa, pb = sum(a) / n, sum(b) / n
    p_e = pa * pb + (1 - pa) * (1 - pb)
    return (p_o - p_e) / (1 - p_e)


def psi(expected, actual, bins=5):
    cuts = [sorted(expected)[len(expected) * i // bins] for i in range(1, bins)]

    def shares(vals):
        counts = [0] * bins
        for v in vals:
            counts[sum(v >= c for c in cuts)] += 1
        return [max(c / len(vals), 1e-4) for c in counts]

    total = 0.0
    for e, a in zip(shares(expected), shares(actual)):
        total += (a - e) * math.log(a / e)
    return total


def run(batch, baseline_amounts, erased):
    gold_ok = [a for a in ("ana", "ben", "chen") if all(r[a] == GOLD[r["id"]] for r in batch if r["id"] in GOLD)]
    if len(gold_ok) < 2:
        return "STOP: fewer than two annotators pass the gold questions"
    k = kappa([r[gold_ok[0]] for r in batch], [r[gold_ok[1]] for r in batch])
    if k < 0.6:
        return f"STOP: kappa {k:.2f} below 0.6"
    drift = psi(baseline_amounts, [r["amount"] for r in batch])
    if drift > 0.25:
        return f"STOP: amount PSI {drift:.3f}, investigate before training"
    rows = []
    for r in batch:
        if r["email"] in erased or r["id"] in GOLD:
            continue
        votes = [r[a] for a in gold_ok]
        if len(set(votes)) == 1:  # trusted annotators agree; splits go to adjudication
            token = hmac.new(KEY, r["email"].encode(), hashlib.sha256).hexdigest()[:12]
            rows.append({"user": token, "amount": r["amount"], "label": votes[0]})
    version = hashlib.sha256(json.dumps(rows, sort_keys=True).encode()).hexdigest()[:12]
    return f"OK: trusted {gold_ok}, kappa {k:.2f}, PSI {drift:.3f}, {len(rows)} rows, version {version}"


baseline = [r["amount"] for r in make_batch(1)]
print("week 1:", run(make_batch(2), baseline, erased=set()))
print("week 2:", run(make_batch(3, careless="chen"), baseline, erased=set()))
print("week 2, after an erasure request:", run(make_batch(3, careless="chen"), baseline, erased={"user7@example.com"}))
# week 3: two labeling sessions, each with a different careless annotator
print("week 3:", run(make_batch(4, careless="ben") + make_batch(5, careless="ana"), baseline, erased=set()))`,
  expectedOutput: `week 1: OK: trusted ['ana', 'ben', 'chen'], kappa 0.85, PSI 0.035, 50 rows, version 3fcfaf77c0e3
week 2: OK: trusted ['ana', 'ben'], kappa 0.85, PSI 0.063, 54 rows, version 418386894193
week 2, after an erasure request: OK: trusted ['ana', 'ben'], kappa 0.85, PSI 0.063, 51 rows, version ca3037af216e
week 3: STOP: kappa 0.57 below 0.6`,
  annotations: [
    {
      id: 'make-batch',
      range: { line: 20 },
      kind: 'function',
      title: 'make_batch',
      what: 'Generates 60 tickets labeled by three annotators. A careless annotator is wrong half the time, the others 5% of the time; t1 and t2 are gold questions.',
      why: 'A seeded generator stands in for an export from a labeling tool, so everyone gets the same numbers. Milestone 2 replaces it with real exports.',
    },
    {
      id: 'gold',
      range: { line: 58 },
      kind: 'syntax',
      title: 'Gold check',
      what: 'Keeps only annotators who answer every gold question correctly.',
      why: 'In week 2 chen misses a gold question and is left out, so chen’s votes never reach the training set.',
    },
    {
      id: 'kappa-gate',
      range: { line: 62 },
      kind: 'syntax',
      title: 'Agreement gate',
      what: 'Stops the batch when Cohen’s kappa between two trusted annotators is below 0.6.',
      why: 'Low agreement means the guidelines or the annotators need attention, and training on the batch would teach the model their confusion.',
    },
    {
      id: 'psi-gate',
      range: { line: 65 },
      kind: 'syntax',
      title: 'Drift gate',
      what: 'Compares the amount distribution with the baseline batch using PSI over 5 quantile bins.',
      why: 'A large shift may be a real change or an upstream bug; either way a person looks before the pipeline trains on it.',
    },
    {
      id: 'erasure',
      range: { line: 69 },
      kind: 'syntax',
      title: 'Erasure and gold filter',
      what: 'Drops rows of people who asked to be deleted, and the gold questions themselves.',
      why: 'The erasure list is applied on every build, so a rebuilt version can never bring a deleted person back.',
    },
    {
      id: 'token',
      range: { line: 73 },
      kind: 'function',
      title: 'HMAC token',
      what: 'Replaces the email with a keyed hash.',
      why: 'The same person keeps the same token across weeks, and nobody without the key can test whether an email is in the data.',
    },
    {
      id: 'version',
      range: { line: 75 },
      kind: 'variable',
      title: 'version',
      what: 'A hash of the sorted training rows.',
      why: 'The same rows always give the same ID; the erasure request in week 2 produces a new one, which is how you prove the deletion reached the published set.',
    },
  ],
};

export const brief: ProjectBrief = {
  goal: 'Build a pipeline that turns weekly exports from a labeling tool into a versioned, validated, pseudonymized training set, and keeps doing so safely: annotator quality checks, agreement and label-error audits, schema and drift gates against a baseline, reproducible versions, erasure across versions, and the documentation another engineer needs to run it.',
  dataset:
    'Start with the reference pipeline’s generated batches (seeded, so everyone gets the same numbers). Then use a real labeled dataset with more than one annotation per item, split into weekly batches: a public sentiment or toxicity dataset that publishes individual annotator votes works well, or label 300 items yourself with two friends using an open-source labeling tool.',
  milestones: [
    'Run capstone.py, read each decision, then change one gate threshold and one careless annotator and predict the output before you run it',
    'Replace the generator with real exports: one file per labeling session, with item, annotator, label and timestamp, landed unchanged',
    'Write annotation guidelines with at least 10 edge cases; measure Cohen’s kappa (or Krippendorff’s alpha for more annotators) per class and per batch',
    'Seed every batch with gold questions, drop annotators who fail them, and send split votes to an adjudication queue instead of a majority vote',
    'Find likely label errors with out-of-fold predicted probabilities and per-class thresholds; review the top 20 by hand and record how many were real errors',
    'Infer a schema and baseline from the first accepted batch; block on schema violations and on PSI above a written threshold, and keep a report for every batch',
    'Version every published training set (a table format, lakeFS or DVC) and record the version with each model you train; rebuild an old version and confirm the same hash',
    'Implement erasure: one request ID, every copy removed (current table, old versions after retention, exports), and a completion log',
    'Write a datasheet and a runbook: what each gate means, what to do when it fires, who may read raw data, and how long versions are kept',
  ],
  rubric: [
    {
      criterion: 'Label quality',
      detail:
        'Guidelines exist and changed in response to disagreements; agreement is measured per class; gold questions and adjudication decide who and what to trust.',
    },
    {
      criterion: 'Label errors',
      detail:
        'Suspected errors come from out-of-fold predictions with per-class thresholds; the hand review reports precision, and fixes are made on a branch.',
    },
    {
      criterion: 'Validation',
      detail:
        'Schema checks block, drift is measured against a stored baseline with written thresholds, and breaking a batch on purpose makes the right gate fire.',
    },
    {
      criterion: 'Versioning',
      detail:
        'Every published set has an ID derived from its content; any model can name its training data, and rebuilding gives the same ID.',
    },
    {
      criterion: 'Privacy',
      detail:
        'Direct identifiers are replaced with keyed tokens before labeling; k and l are measured on anything shared; the key is not stored with the data.',
    },
    {
      criterion: 'Erasure',
      detail:
        'A deletion request reaches every copy within a stated deadline, a test proves the person is absent from the latest version, and a log records completion.',
    },
    {
      criterion: 'Documentation',
      detail:
        'The datasheet covers collection, labeling, personal data, known gaps and unsuitable uses; the runbook lets a newcomer handle every gate.',
    },
    {
      criterion: 'Code quality',
      detail:
        'Each gate is a small tested function; a fresh clone and one command rebuild every version from the raw exports.',
    },
  ],
  hints: [
    'Compute agreement before you build anything else. If kappa is low on your first batch, fix the guidelines, not the model.',
    'Put the gold questions where annotators cannot tell them apart from normal items, and rotate them so they do not become known.',
    'Keep the out-of-fold predictions for every batch; a second audit after relabeling should flag far fewer items.',
    'Test erasure as you test idempotency: build, erase, rebuild, and assert the token is absent and the version ID changed.',
    'Write each threshold down with its reason before you see the batch that crosses it. A threshold chosen afterwards is a decision, not a gate.',
  ],
};
