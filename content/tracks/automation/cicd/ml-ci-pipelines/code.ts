// Code for "CI pipelines for ML projects". Which jobs run comes from src/lib/automation/workflow.ts, which follows
// GitHub's documented rules for needs, if and paths-ignore (unit-tested); job durations are assumptions.
// ml_tests.py runs under CPython 3.13 and Pyodide (checked by python-outputs.test.ts). The workflow is configuration
// and is not run here; action major versions were current when written, check each action's README.
import { workflowExperiment } from '@/lib/automation/experiments';
import type { CodeExample } from '@/lib/types';

export const workflow = workflowExperiment('auto-workflow');

export const mlWorkflow: CodeExample = {
  id: 'ml-ci-yaml',
  language: 'yaml',
  source: `# .github/workflows/ml-ci.yml
name: ml-ci
on:
  pull_request:
    paths-ignore: ["docs/**", "**.md"]
  push:
    branches: [main]
    paths-ignore: ["docs/**", "**.md"]
permissions:
  contents: read
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - run: pipx run ruff check .
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-python@v6
        with: { python-version: "3.13", cache: pip }
      - run: pip install -r requirements.txt && pytest -q tests/unit
  data-checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-python@v6
        with: { python-version: "3.13", cache: pip }
      - run: pip install -r requirements.txt && pytest -q tests/data
  train-smoke:
    needs: [unit-tests, data-checks]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-python@v6
        with: { python-version: "3.13", cache: pip }
      - run: pip install -r requirements.txt
      - run: python train.py --sample 2000 --out artifacts/model.joblib
      - uses: actions/upload-artifact@v4
        with: { name: smoke-model, path: artifacts/ }
  evaluate:
    needs: train-smoke
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/download-artifact@v4
        with: { name: smoke-model, path: artifacts/ }
      - run: pip install -r requirements.txt && python evaluate.py artifacts/model.joblib --min-auc 0.70
  build-image:
    needs: [lint, evaluate]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - run: docker build -t scorer:\${{ github.sha }} .
  deploy-staging:
    needs: build-image
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - run: ./deploy.sh staging scorer:\${{ github.sha }}
  report:
    needs: deploy-staging
    if: always()
    runs-on: ubuntu-latest
    steps:
      - run: echo "deploy=\${{ needs.deploy-staging.result }}"   # post a summary to the team channel here`,
  annotations: [
    {
      id: 'paths-ignore',
      range: { line: 5 },
      kind: 'syntax',
      title: "paths-ignore",
      what: "The workflow does not run when every changed file matches these patterns.",
      why: "Saves runner minutes on docs-only changes, but a required check from this workflow then never reports, and the PR waits on \"Expected\". Make the check non-required, or use a job-level filter that reports success.",
    },
    {
      id: 'needs',
      range: { line: 32 },
      kind: 'syntax',
      title: "needs",
      what: "train-smoke starts only after both jobs finish, and only if both succeeded.",
      why: "Jobs without needs run in parallel. needs builds the DAG and decides what is skipped when something fails.",
    },
    {
      id: 'smoke-training',
      range: { line: 39 },
      kind: 'function',
      title: "Smoke training",
      what: "Trains on 2,000 rows: minutes, not hours.",
      why: "Catches broken feature code, shape mismatches and missing columns between stages on every PR.",
    },
    {
      id: 'artifacts-between-jobs',
      range: { line: 40 },
      kind: 'framework',
      title: "Artifacts between jobs",
      what: "Each job runs on a fresh machine. Files pass between jobs only as uploaded artifacts.",
      why: "evaluate tests the exact model train-smoke produced, not a rebuild.",
    },
    {
      id: 'a-minimum-bar',
      range: { line: 49 },
      kind: 'parameter',
      title: "A minimum bar",
      what: "evaluate.py exits non-zero if the smoke model scores below 0.70 AUC on a fixed validation sample.",
      why: "A floor, not a target: it catches a model that learned nothing (a label leak removed, a join that dropped all positives).",
    },
    {
      id: 'deploy-only-from-main',
      range: { line: 58 },
      kind: 'syntax',
      title: "Deploy only from main",
      what: "The condition skips the job on pull requests.",
      why: "GitHub adds success() implicitly: the job also needs build-image to have succeeded.",
    },
    {
      id: 'environment',
      range: { line: 60 },
      kind: 'syntax',
      title: "environment",
      what: "A GitHub deployment environment: its own secrets, and optional protection rules.",
      why: "The next lesson adds required reviewers on production.",
    },
    {
      id: 'always',
      range: { line: 65 },
      kind: 'syntax',
      title: "always()",
      what: "Runs whatever happened before, even after failures and skips.",
      why: "For reporting and clean-up. Never use it on a deploy job.",
    },
  ],
};

export const mlTests: CodeExample = {
  id: 'ml-tests',
  language: 'python',
  run: 'pyodide',
  source: `import csv
import io

SAMPLE = """customer_id,tenure_months,monthly_spend,churned
1,3,49.0,1
2,40,19.5,0
3,12,35.0,0
4,1,60.0,1
5,26,22.0,0
6,7,55.5,1
"""
SCHEMA = {"customer_id": int, "tenure_months": int, "monthly_spend": float, "churned": int}

def load(text):
    return [{k: SCHEMA[k](v) for k, v in row.items()} for row in csv.DictReader(io.StringIO(text))]

def train(rows):
    """A tiny threshold model: churn if tenure is below the cut that best separates the classes."""
    cuts = sorted({r["tenure_months"] for r in rows})
    acc = lambda c: sum((r["tenure_months"] < c) == bool(r["churned"]) for r in rows) / len(rows)
    return max(cuts, key=acc)

# Data tests: cheap, run on every pull request.
def test_schema():
    rows = load(SAMPLE)
    assert set(rows[0]) == set(SCHEMA), rows[0].keys()

def test_no_duplicate_ids():
    ids = [r["customer_id"] for r in load(SAMPLE)]
    assert len(ids) == len(set(ids))

def test_ranges():
    assert all(r["tenure_months"] >= 0 and r["monthly_spend"] > 0 for r in load(SAMPLE))

# Model tests: a smoke run on a tiny sample, a minimum bar, and a behavioural check.
def test_train_smoke_beats_baseline():
    rows = load(SAMPLE)
    cut = train(rows)
    acc = sum((r["tenure_months"] < cut) == bool(r["churned"]) for r in rows) / len(rows)
    baseline = max(sum(r["churned"] for r in rows), sum(1 - r["churned"] for r in rows)) / len(rows)
    assert acc > baseline, (acc, baseline)

def test_longer_tenure_never_raises_churn():
    cut = train(load(SAMPLE))
    predict = lambda tenure: tenure < cut
    assert all(predict(t) >= predict(t + 1) for t in range(0, 60))

for test in [test_schema, test_no_duplicate_ids, test_ranges, test_train_smoke_beats_baseline, test_longer_tenure_never_raises_churn]:
    try:
        test()
        print(f"PASSED {test.__name__}")
    except AssertionError as e:
        print(f"FAILED {test.__name__}: {e}")`,
  expectedOutput: `PASSED test_schema
PASSED test_no_duplicate_ids
PASSED test_ranges
PASSED test_train_smoke_beats_baseline
PASSED test_longer_tenure_never_raises_churn`,
  annotations: [
    {
      id: 'the-schema-as-data',
      range: { line: 12 },
      kind: 'variable',
      title: "The schema as data",
      what: "Column names and types the pipeline expects.",
      why: "A renamed or retyped column upstream fails here, in seconds, not in production.",
    },
    {
      id: 'data-test',
      range: { line: 28 },
      kind: 'function',
      title: "Data test",
      what: "Duplicate keys usually mean a bad join upstream.",
      why: "Data tests run on fixtures in CI, and on real batches inside the pipeline.",
    },
    {
      id: 'beats-the-baseline',
      range: { line: 36 },
      kind: 'function',
      title: "Beats the baseline",
      what: "The model must beat always predicting the majority class.",
      why: "Not a quality target: a check that training still learns something at all.",
    },
    {
      id: 'behavioural-test',
      range: { line: 43 },
      kind: 'function',
      title: "Behavioural test",
      what: "An invariance the model must respect: more tenure never makes churn more likely here.",
      why: "Behavioural tests (invariance, direction) catch models that score well for the wrong reasons.",
    },
  ],
};
