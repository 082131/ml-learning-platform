// Code for "Documentation sites, API references and docs as code". Configuration follows the MkDocs, Material for
// MkDocs, mkdocstrings and Sphinx documentation; the Pages workflow uses GitHub's documented Pages actions. Action
// major versions were current when this was written; check each action's README for the latest.
import { diataxisExperiment } from '@/lib/git/docsKinds';
import type { CodeExample } from '@/lib/types';

export const diataxis = diataxisExperiment('git-diataxis');

export const docsTree: CodeExample = {
  id: 'docs-tree',
  language: 'bash',
  source: `churn-model/
├── mkdocs.yml
├── docs/
│   ├── index.md                  # landing page: what it is, where to start
│   ├── tutorials/first-model.md  # learning: a guided first success
│   ├── how-to/train-on-gpu.md    # tasks: recipes for readers with a goal
│   ├── reference/api.md          # facts: generated from docstrings
│   ├── reference/cli.md
│   ├── explanation/splits.md     # understanding: why the design is what it is
│   └── decisions/0003-use-dvc-for-data.md   # architecture decision records
└── src/churn_model/...`,
  annotations: [
    {
      id: 'folders',
      range: { line: 5, startCol: 4, endCol: 17 },
      kind: 'framework',
      title: 'One folder per kind',
      what: 'Tutorials, how-to guides, reference and explanation kept apart.',
      why: 'Each page serves one reader need. Mixed pages are too long for the expert and too dense for the beginner.',
    },
  ],
};

export const mkdocsYaml: CodeExample = {
  id: 'mkdocs-yml',
  language: 'yaml',
  source: `site_name: churn-model
repo_url: https://github.com/ada/churn-model
edit_uri: edit/main/docs/              # "edit this page" opens a pull request
theme:
  name: material
plugins:
  - search
  - mkdocstrings:
      handlers:
        python:
          options:
            docstring_style: google
            show_source: false
nav:
  - Home: index.md
  - Tutorials: [tutorials/first-model.md]
  - How-to guides: [how-to/train-on-gpu.md]
  - Reference: [reference/api.md, reference/cli.md]
  - Explanation: [explanation/splits.md]
  - Decisions: [decisions/0003-use-dvc-for-data.md]`,
  annotations: [
    {
      id: 'mkdocstrings',
      range: { line: 8 },
      kind: 'framework',
      title: 'mkdocstrings',
      what: 'Renders API reference pages from your Python docstrings.',
      why: 'The reference is generated, so it cannot drift from the code. You write it once, in the docstring.',
    },
    {
      id: 'edit-uri',
      range: { line: 3 },
      kind: 'syntax',
      title: 'edit_uri',
      what: 'Adds an edit link to each page that points at the Markdown file on GitHub.',
      why: 'A reader who finds a mistake can fix it in a pull request in a minute. That is docs as code.',
    },
  ],
};

export const apiPage: CodeExample = {
  id: 'api-md',
  language: 'markdown',
  source: `# API reference

::: churn_model.split
    options:
      show_root_heading: true

::: churn_model.train`,
  annotations: [
    {
      id: 'directive',
      range: { line: 3 },
      kind: 'syntax',
      title: '::: identifier',
      what: 'mkdocstrings replaces the line with the rendered documentation of that function, class or module.',
      why: 'Sphinx does the same with ".. autofunction:: churn_model.split" in reStructuredText.',
    },
  ],
};

export const sphinxConf: CodeExample = {
  id: 'sphinx-conf',
  language: 'python',
  source: `# docs/conf.py: the Sphinx equivalent
project = "churn-model"
extensions = [
    "sphinx.ext.autodoc",     # pull documentation from docstrings
    "sphinx.ext.napoleon",    # understand Google and NumPy style sections
    "sphinx.ext.doctest",     # run >>> examples in the docs: make doctest
    "myst_parser",            # write pages in Markdown instead of reStructuredText
]
html_theme = "furo"`,
  annotations: [
    {
      id: 'napoleon',
      range: { line: 5 },
      kind: 'framework',
      title: 'napoleon',
      what: 'Converts Google- and NumPy-style docstring sections into reStructuredText for autodoc.',
      why: 'Without it, Sphinx expects :param x: fields and shows Args: sections as plain text.',
    },
  ],
};

export const pagesWorkflow: CodeExample = {
  id: 'docs-pages-workflow',
  language: 'yaml',
  source: `# .github/workflows/docs.yml: build on every PR, publish from main
name: Docs
on:
  pull_request:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-python@v6
        with: { python-version: "3.12" }
      - run: pip install mkdocs-material "mkdocstrings[python]" -e .
      - run: mkdocs build --strict          # warnings (broken links, missing pages) fail the build
      - uses: actions/upload-pages-artifact@v3
        with: { path: site }
  deploy:
    if: github.ref == 'refs/heads/main'
    needs: build
    runs-on: ubuntu-latest
    permissions: { pages: write, id-token: write }
    environment: { name: github-pages, url: "\${{ steps.deployment.outputs.page_url }}" }
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4`,
  annotations: [
    {
      id: 'strict',
      range: { line: 15 },
      kind: 'parameter',
      title: '--strict',
      what: 'Turns warnings, such as a link to a page that does not exist, into errors.',
      why: 'On pull requests this works like a test suite for the docs: broken docs cannot merge.',
    },
    {
      id: 'deploy',
      range: { line: 19 },
      kind: 'syntax',
      title: 'Deploy only from main',
      what: 'The deploy job runs only for pushes to main, after the build job.',
      why: 'Every PR proves the docs build; only merged docs are published. Set Pages to "GitHub Actions" in the repository settings.',
    },
  ],
};

export const adrMd: CodeExample = {
  id: 'adr',
  language: 'markdown',
  source: `# 3. Use DVC for training data

Date: 2026-02-10
Status: Accepted (supersedes 1. Store data in Git LFS)

## Context
Snapshots are 4-12 GB and change monthly. LFS bandwidth costs grew past our budget,
and we need to tie each model to the exact data and pipeline that produced it.

## Decision
Track data and pipeline outputs with DVC, with an S3 remote in our account.

## Consequences
Data lives in our bucket, not on GitHub. Everyone needs AWS credentials and \`dvc pull\`.
dvc.lock gives lineage for free. CI caches the DVC cache between runs.`,
  annotations: [
    {
      id: 'status',
      range: { line: 4 },
      kind: 'syntax',
      title: 'Status',
      what: 'Proposed, Accepted, Deprecated or Superseded.',
      why: 'ADRs are never edited into a new decision; a new ADR supersedes the old one, so the history of reasoning survives.',
    },
    {
      id: 'consequences',
      range: { line: 13 },
      kind: 'syntax',
      title: 'Consequences',
      what: 'What becomes easier and what becomes harder.',
      why: 'The part future readers need most: it explains constraints that otherwise look arbitrary.',
    },
  ],
};
