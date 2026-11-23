// Code for "Merge, rebase, squash and cherry-pick". The sandbox scenario (merge-rebase) and its extra scripts
// (no-ff merge, squash, cherry-pick, ff-only) are replayed in real Git 2.43 by sim.test.ts. The transcripts below
// were run with Git 2.43.0 on the same history with fixed dates; outputs are copied from that run.
import { gitSandboxExperiment } from '@/lib/git/sandbox';
import type { CodeExample } from '@/lib/types';

export const mergeRebase = gitSandboxExperiment('git-merge-rebase', 'merge-rebase');

export const mergeShell: CodeExample = {
  id: 'merge-commit-shell',
  language: 'bash',
  source: `$ git rev-parse --short $(git merge-base main feature)   # newest commit both branches share
2d9af5d
$ git merge --no-edit feature            # on main: three-way merge of 2d9af5d, main and feature
Merge made by the 'ort' strategy.
 eval.py  | 1 +
 train.py | 1 +
 2 files changed, 2 insertions(+)
 create mode 100644 eval.py
$ git log --oneline --graph
*   46c3d1c Merge branch 'feature'
|\\
| * 577365b Train for 20 epochs
| * 087ad54 Add evaluation
* | 8502521 Add results section
|/
* 2d9af5d Add training script
* c0a9439 Add README`,
  annotations: [
    {
      id: 'ort',
      range: { line: 4 },
      kind: 'framework',
      title: 'ort',
      what: 'Git’s default merge strategy since 2.34 ("Ostensibly Recursive’s Twin").',
      why: 'It compares each side with the merge base file by file, and takes a change from whichever side made it.',
    },
    {
      id: 'merge-node',
      range: { line: 10 },
      kind: 'syntax',
      title: 'Merge commit',
      what: 'A commit with two parents: 8502521 (main) and 577365b (feature).',
      why: 'The original feature commits keep their ids, and the graph records that work happened in parallel.',
    },
  ],
};

export const rebaseShell: CodeExample = {
  id: 'rebase-shell',
  language: 'bash',
  source: `$ git switch feature
$ git rebase main                        # replay feature's commits on top of main
Successfully rebased and updated refs/heads/feature.
$ git log --oneline --graph --all
* 51c1c25 (HEAD -> feature) Train for 20 epochs   # was 577365b: same change, new parent
* 104cbe4 Add evaluation                          # was 087ad54
* 8502521 (main) Add results section
* 2d9af5d Add training script
* c0a9439 Add README
$ git switch main && git merge feature
Updating 8502521..51c1c25
Fast-forward
 eval.py  | 1 +
 train.py | 1 +
 2 files changed, 2 insertions(+)
 create mode 100644 eval.py`,
  annotations: [
    {
      id: 'new-ids',
      range: { line: 5 },
      kind: 'framework',
      title: 'New ids',
      what: 'A rebased commit has a new parent and a new committer date, so a new id.',
      why: 'Anyone who already had 577365b now has a commit that is no longer on the branch. Rebase only commits nobody else has.',
    },
    {
      id: 'ff',
      range: { line: 12 },
      kind: 'framework',
      title: 'Fast-forward',
      what: 'main is an ancestor of feature, so Git just moves main forward.',
      why: 'No merge commit is needed. git merge --no-ff makes one anyway, to record that a feature branch existed.',
    },
  ],
};

export const strategies: CodeExample = {
  id: 'integration-options',
  language: 'bash',
  source: `git merge feature                # fast-forward if possible, else a merge commit
git merge --no-ff feature        # always a merge commit (GitHub: "Create a merge commit")
git merge --ff-only feature      # refuse unless it can fast-forward
git merge --squash feature       # stage all of feature's changes; you then commit once
git commit -m "Add evaluation (#12)"    #   (GitHub: "Squash and merge")
git rebase main                  # on feature: replay its commits on main (GitHub: "Rebase and merge")
git cherry-pick 087ad54          # copy one commit onto the current branch, with a new id
git merge --abort                # give up a merge in progress; also: rebase --abort, cherry-pick --abort`,
  annotations: [
    {
      id: 'squash',
      range: { line: 4 },
      kind: 'parameter',
      title: '--squash',
      what: 'Applies the combined change of the branch to the index, without making a commit or a merge.',
      why: 'main gets one tidy commit per pull request. The branch’s own commits are not ancestors of main, so delete the branch afterwards.',
    },
    {
      id: 'pick',
      range: { line: 7 },
      kind: 'function',
      title: 'cherry-pick',
      what: 'Re-applies the change one commit introduced, as a new commit on HEAD.',
      why: 'Typical use: carry a bug fix from main onto a release branch.',
    },
  ],
};
