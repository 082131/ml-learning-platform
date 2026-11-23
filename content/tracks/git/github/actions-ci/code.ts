// Code for "GitHub Actions and continuous integration". The matrix expansion follows GitHub's documented rules
// (src/lib/git/matrix.ts, tested against the example in GitHub's matrix documentation). Job durations in the
// matrix view are stated assumptions, not measurements. Action major versions were current when this was written;
// check each action's README for the latest.
import { matrixExperiment } from '@/lib/git/experiments';
import type { CodeExample } from '@/lib/types';

export const matrix = matrixExperiment('git-matrix');

export const ciWorkflow: CodeExample = {
  id: 'ci-workflow',
  language: 'yaml',
  source: `# .github/workflows/ci.yml
name: CI
on:
  pull_request:
  push:
    branches: [main]
permissions:
  contents: read
concurrency:
  group: ci-\${{ github.ref }}
  cancel-in-progress: true
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        python: ["3.11", "3.12", "3.13"]
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-python@v6
        with:
          python-version: \${{ matrix.python }}
          cache: pip
      - run: pip install -r requirements.txt -r requirements-dev.txt
      - run: ruff check .
      - run: pytest -q --maxfail=1
      - run: python train.py --smoke --rows 1000   # the pipeline runs end to end on a tiny sample`,
  annotations: [
    {
      id: 'on',
      range: { line: 3 },
      kind: 'syntax',
      title: 'on: triggers',
      what: 'Run for every pull request, and for pushes to main.',
      why: 'The pull_request run is what branch protection checks; the push run confirms main itself after each merge.',
    },
    {
      id: 'permissions',
      range: { line: 7 },
      kind: 'syntax',
      title: 'permissions',
      what: 'The access the job’s GITHUB_TOKEN gets. contents: read is enough to test.',
      why: 'Least privilege: a compromised dependency in the test run cannot push code or create releases.',
    },
    {
      id: 'concurrency',
      range: { line: 9 },
      kind: 'syntax',
      title: 'concurrency',
      what: 'Cancels an older run of the same branch when a new commit arrives.',
      why: 'Only the latest commit of a PR matters; this saves runner minutes.',
    },
    {
      id: 'matrix',
      range: { line: 18 },
      kind: 'syntax',
      title: 'matrix',
      what: 'One job per value: three jobs here, each with its own matrix.python.',
      why: 'fail-fast: false lets all versions finish, so you see every version that breaks, not only the first.',
    },
    {
      id: 'uses',
      range: { line: 20 },
      kind: 'framework',
      title: 'uses: owner/repo@ref',
      what: 'Runs a published action at a tag.',
      why: 'Tags can be moved. For third-party actions, pin the full commit SHA (with the tag in a comment) so the code you run cannot change underneath you.',
    },
    {
      id: 'cache',
      range: { line: 24 },
      kind: 'parameter',
      title: 'cache: pip',
      what: 'Caches pip’s download cache, keyed on the requirements files.',
      why: 'Installs drop from minutes to seconds on a hit; the key changes when the requirements do.',
    },
    {
      id: 'smoke',
      range: { line: 28 },
      kind: 'function',
      title: 'Smoke test',
      what: 'Runs training on 1,000 rows.',
      why: 'Unit tests miss shape mismatches and missing columns between stages. A tiny end-to-end run catches them in seconds.',
    },
  ],
};

export const secretsYaml: CodeExample = {
  id: 'secrets-yaml',
  language: 'yaml',
  source: `# A step that needs a secret: only in a trusted context (push to main), never echoed
      - name: Upload the evaluation report
        if: github.event_name == 'push' && github.ref == 'refs/heads/main'
        env:
          REPORTS_TOKEN: \${{ secrets.REPORTS_TOKEN }}    # set in Settings -> Secrets and variables -> Actions
        run: python scripts/upload_report.py reports/eval.json`,
  annotations: [
    {
      id: 'secret',
      range: { line: 5 },
      kind: 'variable',
      title: 'secrets.*',
      what: 'An encrypted repository or organisation secret, exposed to this step as an environment variable.',
      why: 'GitHub masks secret values in logs. Workflows triggered from forks get no secrets, so a stranger’s PR cannot read them.',
    },
  ],
};

export const matrixYaml: CodeExample = {
  id: 'matrix-include-exclude',
  language: 'yaml',
  source: `strategy:
  matrix:
    os: [ubuntu-latest, windows-latest]
    python: ["3.11", "3.12", "3.13"]          # 2 x 3 = 6 combinations
    exclude:
      - os: windows-latest
        python: "3.11"                        # -> 5
    include:
      - os: ubuntu-latest
        python: "3.14"
        experimental: true                    # matches no combination: a new job -> 6
      - python: "3.13"
        coverage: true                        # fits the 3.13 jobs: adds a key to both
continue-on-error: \${{ matrix.experimental == true }}`,
  annotations: [
    {
      id: 'exclude',
      range: { line: 5 },
      kind: 'syntax',
      title: 'exclude',
      what: 'Removes every combination that matches all the listed keys.',
      why: 'Applied before include.',
    },
    {
      id: 'include',
      range: { line: 8 },
      kind: 'syntax',
      title: 'include',
      what: 'Each entry is merged into every combination it does not contradict; if it fits none, it becomes a new job.',
      why: 'One mechanism both adds variables to existing jobs and adds whole new jobs, which is why it surprises people.',
    },
  ],
};
