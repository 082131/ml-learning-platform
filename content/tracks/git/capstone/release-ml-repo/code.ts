// Code for the Git track capstone. The sandbox scenario (capstone) is replayed in real Git 2.43 by sim.test.ts,
// including the merge commit and the annotated v1.1.0 tag. The repository commands are for your own GitHub
// repository; they need your account, so they are not run on this page.
import { gitSandboxExperiment } from '@/lib/git/sandbox';
import type { CodeExample, ProjectBrief } from '@/lib/types';

export const capstone = gitSandboxExperiment('git-capstone', 'capstone');

export const setupRepo: CodeExample = {
  id: 'capstone-setup',
  language: 'bash',
  source: `gh repo create churn-model --private --clone    # or use any repository of your own
cd churn-model
# add: README.md, .gitignore, pyproject.toml, src/churn_model/, tests/, CHANGELOG.md
git add . && git commit -m "chore: initial project"
git push -u origin main
git tag -a v1.0.0 -m "First release" && git push origin v1.0.0
# Settings -> Branches (or Rules): protect main, require 1 approval and the CI check`,
  annotations: [
    {
      id: 'protect',
      range: { line: 7 },
      kind: 'framework',
      title: 'Protect main first',
      what: 'Require a pull request, a passing CI check and (if you have a partner) one approval.',
      why: 'The rules make the process real: from now on nothing reaches main except through a reviewed, tested PR.',
    },
  ],
};

export const featureFlow: CodeExample = {
  id: 'capstone-feature',
  language: 'bash',
  source: `git switch -c feat/evaluate
# write src/churn_model/evaluate.py with a Google-style docstring and a doctest, plus tests/test_evaluate.py
git add src tests && git commit -m "feat: add evaluate() with ROC AUC and recall at top k"
# document it: README usage, docs/how-to/evaluate.md, and the CHANGELOG's [Unreleased] section
git add README.md docs CHANGELOG.md && git commit -m "docs: explain how to evaluate a model"
git fetch && git rebase origin/main            # be current before review
git push -u origin feat/evaluate
gh pr create --fill --base main
gh pr checks --watch                           # CI: lint, tests, doctests, docs build --strict
gh pr merge --squash --delete-branch           # after approval
git switch main && git pull`,
  annotations: [
    {
      id: 'feat',
      range: { line: 3 },
      kind: 'syntax',
      title: 'feat:',
      what: 'A Conventional Commits type: a new feature, so a minor release.',
      why: 'With squash merging, make the PR title a Conventional Commit too: it becomes the commit message on main.',
    },
    {
      id: 'rebase',
      range: { line: 6 },
      kind: 'function',
      title: 'Rebase before review',
      what: 'Replays your two commits on the latest main.',
      why: 'Reviewers and CI see the code that will land, and "require branches to be up to date" is satisfied.',
    },
  ],
};

export const releaseFlow: CodeExample = {
  id: 'capstone-release',
  language: 'bash',
  source: `git log --oneline v1.0.0..main                 # what changed since the last release
# feat since v1.0.0 and no breaking change: 1.0.0 -> 1.1.0
# move the [Unreleased] notes to "## [1.1.0] - <today>" in CHANGELOG.md, bump the version in pyproject.toml
git switch -c release/1.1.0
git commit -am "chore: release 1.1.0"
gh pr create --fill && gh pr merge --squash --delete-branch   # through review like any change
git switch main && git pull
git tag -a v1.1.0 -m "Add evaluate()" && git push origin v1.1.0
gh release create v1.1.0 --title "v1.1.0" --notes-from-tag --verify-tag`,
  annotations: [
    {
      id: 'range',
      range: { line: 1 },
      kind: 'syntax',
      title: 'v1.0.0..main',
      what: 'Commits on main since the v1.0.0 tag.',
      why: 'The raw material for both the version decision and the changelog.',
    },
    {
      id: 'tag-main',
      range: { line: 8 },
      kind: 'function',
      title: 'Tag the merged commit',
      what: 'The annotated tag goes on main after the release PR merged.',
      why: 'Tag what was reviewed and tested. A tag on a local, unmerged commit would point at something main never contained.',
    },
  ],
};

export const brief: ProjectBrief = {
  goal: 'Take a small ML repository from v1.0.0 to v1.1.0 the way a team would: a feature on a branch, a reviewed pull request with green CI, documentation in the same change, and a tagged release with a changelog.',
  dataset:
    'Any small tabular dataset you are allowed to use (for example scikit-learn’s breast cancer dataset, loaded in code so no data file is committed). If you track a data file, use DVC or Git LFS as in the versioning lesson.',
  milestones: [
    'Create the repository with README, .gitignore (data, checkpoints, .env), pyproject.toml, tests and CHANGELOG.md, and tag v1.0.0.',
    'Add CI (.github/workflows/ci.yml): ruff, pytest with --doctest-modules on two Python versions, and mkdocs build --strict if you have docs. Make the checks required for main.',
    'Implement evaluate() on a feature branch, with a Google-style docstring containing a doctest, and unit tests.',
    'Update the README usage section, add a how-to page, and add an [Unreleased] changelog entry in the same pull request.',
    'Rebase on main, open the PR, get a review (from a partner, or review it yourself the next day with the checklist), and squash-merge it.',
    'Decide the version from the commits, release it through a small release PR, tag v1.1.0 (annotated) and create the GitHub release.',
  ],
  rubric: [
    { criterion: 'History', detail: 'main has one commit per PR with Conventional Commits messages; no secrets, data or checkpoints anywhere in history.' },
    { criterion: 'Review and CI', detail: 'main is protected; the feature PR shows green required checks and at least one review comment that led to a change.' },
    { criterion: 'Documentation', detail: 'evaluate() has a docstring that passes doctest and pydoclint; the README quick start runs on a fresh clone; the changelog entry is written for users.' },
    { criterion: 'Release', detail: 'v1.1.0 is an annotated tag on a commit in main, the version in pyproject.toml matches, and the GitHub release links the changelog.' },
    { criterion: 'Reproducibility', detail: 'A model trained from v1.1.0 records the commit id, data version and parameters (for example in a JSON file next to the model).' },
  ],
  hints: [
    'Commit .gitignore before anything else, and run git status before every commit.',
    'If the rebase conflicts, use zdiff3 to see the base, resolve, run the tests, then git rebase --continue.',
    'If you work alone, ask a colleague or classmate to review, or review it yourself after a break, using the checklist from the pull request lesson.',
    'git describe --tags on main after the release should print exactly v1.1.0.',
  ],
};
