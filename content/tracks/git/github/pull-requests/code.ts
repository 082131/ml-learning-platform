// Code for "Pull requests and code review". The merge box follows GitHub's documented protected-branch rules
// (src/lib/git/protection.ts, unit-tested in libs.test.ts); the CODEOWNERS matcher follows GitHub's documented
// examples (codeowners.ts, tested against them). The gh commands are GitHub CLI 2.x.
import { codeownersExperiment, protectionExperiment } from '@/lib/git/experiments';
import type { CodeExample } from '@/lib/types';

export const protection = protectionExperiment('git-protection');
export const owners = codeownersExperiment('git-codeowners');

export const prFlow: CodeExample = {
  id: 'pr-flow',
  language: 'bash',
  source: `git switch -c feat/stratified-split
# ... commit the change and its tests ...
git push -u origin feat/stratified-split
gh pr create --base main --title "Stratify the train/test split by churn label" --body-file pr.md
gh pr checks --watch                 # wait for CI on the pull request
# review feedback: commit fixes on the same branch and push; the PR updates itself
git commit -am "Seed the split for reproducibility" && git push
gh pr merge --squash --delete-branch # after approval and green checks`,
  annotations: [
    {
      id: 'base',
      range: { line: 4, startCol: 13, endCol: 24 },
      kind: 'parameter',
      title: '--base main',
      what: 'The branch the changes should go into. The PR shows the commits in main..feat/stratified-split.',
      why: 'A PR is not a Git object: it is GitHub’s page for a branch comparison, plus discussion, reviews and checks.',
    },
    {
      id: 'update',
      range: { line: 7 },
      kind: 'function',
      title: 'Updating a PR',
      what: 'Pushing more commits to the branch adds them to the open pull request.',
      why: 'Reviewers can look at only the new commits. Avoid force-pushing during review: it makes earlier comments hard to follow.',
    },
  ],
};

export const reviewCommands: CodeExample = {
  id: 'review-commands',
  language: 'bash',
  source: `gh pr checkout 42                    # fetch the PR's branch and switch to it, to run it locally
pytest -q && python train.py --smoke # try it, not just read it
gh pr review 42 --comment -b "Looks right. One question on the seed, see inline."
gh pr review 42 --request-changes -b "The test set now leaks into scaling: fit the scaler on train only."
gh pr review 42 --approve`,
  annotations: [
    {
      id: 'checkout',
      range: { line: 1 },
      kind: 'function',
      title: 'gh pr checkout',
      what: 'Creates a local branch from the pull request, even from a fork.',
      why: 'For ML changes, running the code (a smoke test, a metric on a small sample) catches what reading misses.',
    },
  ],
};

export const prTemplate: CodeExample = {
  id: 'pr-template',
  language: 'markdown',
  source: `<!-- .github/pull_request_template.md: GitHub pre-fills every new PR with this -->
## What and why
<!-- One paragraph. Link the issue: "Closes #123" closes it when this merges. -->

## How it was tested
- [ ] Unit tests added or updated
- [ ] Ran the pipeline on the sample dataset

## Results (for model changes)
| metric | main | this PR |
| ------ | ---- | ------- |
| ROC AUC (validation) | | |

## Risks
<!-- Data or schema changes, new dependencies, anything a reviewer should look at first. -->`,
  annotations: [
    {
      id: 'closes',
      range: { line: 3 },
      kind: 'syntax',
      title: 'Closes #123',
      what: 'A closing keyword (close, fix, resolve and their forms) followed by an issue number.',
      why: 'GitHub links the issue and closes it when the PR merges into the default branch.',
    },
    {
      id: 'metrics',
      range: { line: 9 },
      kind: 'syntax',
      title: 'Results table',
      what: 'Before/after numbers for a model change.',
      why: 'A reviewer cannot see a metric in a diff. Asking for it in the template makes it part of every review.',
    },
  ],
};
