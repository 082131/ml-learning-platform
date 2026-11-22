// Code for "Branches, HEAD and detached HEAD". The sandbox scenario (branching) is replayed in real Git 2.43 by
// sim.test.ts. The shell transcripts were run with Git 2.43.0 and fixed dates; outputs are copied from that run.
import { gitSandboxExperiment } from '@/lib/git/sandbox';
import type { CodeExample } from '@/lib/types';

export const branching = gitSandboxExperiment('git-branching', 'branching');

export const branchCommands: CodeExample = {
  id: 'branch-commands',
  language: 'bash',
  source: `git branch                      # list local branches; * marks the current one
git branch -v                   # ... with the commit each points to
git switch -c feature           # create a branch at HEAD and switch to it
git switch main                 # switch back: files change to main's snapshot
git switch -                    # the previous branch, like cd -
git branch -m feature add-eval  # rename
git branch -d add-eval          # delete; refused if its commits are on no other branch
git branch -D add-eval          # delete anyway (the commits stay reachable from the reflog for a while)`,
  annotations: [
    {
      id: 'switch-c',
      range: { line: 3 },
      kind: 'function',
      title: 'git switch -c',
      what: 'Creates the branch at the current commit, then moves HEAD to it.',
      why: 'git checkout -b does the same. switch (Git 2.23+) only switches branches; checkout also restores files, which made it easy to misuse.',
    },
    {
      id: 'delete',
      range: { line: 7 },
      kind: 'parameter',
      title: '-d versus -D',
      what: '-d deletes only if the branch is merged into HEAD or its upstream.',
      why: 'The safety check stops you from losing commits that exist nowhere else.',
    },
  ],
};

export const rangesShell: CodeExample = {
  id: 'revision-ranges',
  language: 'bash',
  source: `$ git log --oneline --graph --all
* 8502521 (HEAD -> main) Add results section
| * 26313e9 (feature) Add evaluation
| * 2b36a0f Train for 20 epochs
|/
* 2d9af5d Add training script
* c0a9439 Add README
$ git log --oneline main..feature      # on feature but not on main: what a merge would bring in
26313e9 Add evaluation
2b36a0f Train for 20 epochs
$ git log --oneline feature..main      # on main but not on feature
8502521 Add results section
$ git rev-parse --short feature~1      # first parent, once; ~2 = grandparent; ^2 = second parent of a merge
2b36a0f
$ git branch -d feature
error: the branch 'feature' is not fully merged.
If you are sure you want to delete it, run 'git branch -D feature'`,
  annotations: [
    {
      id: 'dotdot',
      range: { line: 8, startCol: 22, endCol: 35 },
      kind: 'syntax',
      title: 'A..B',
      what: 'Commits reachable from B but not from A.',
      why: 'This is exactly the list of commits a pull request from B into A contains.',
    },
    {
      id: 'tilde',
      range: { line: 13, startCol: 30, endCol: 39 },
      kind: 'syntax',
      title: '~ and ^',
      what: 'X~n follows first parents n times. X^n picks the n-th parent of a merge commit.',
      why: 'HEAD~1 is the commit before this one, the usual target of git reset and git diff.',
    },
  ],
};

export const detachedShell: CodeExample = {
  id: 'detached-rescue',
  language: 'bash',
  source: `$ git switch --detach feature~1
HEAD is now at 2b36a0f Train for 20 epochs
$ echo x > x.txt && git add x.txt && git commit -q -m "Experiment on detached HEAD"
$ git switch main
Warning: you are leaving 1 commit behind, not connected to
any of your branches:

  7170f4e Experiment on detached HEAD

If you want to keep it by creating a new branch, this may be a good time
to do so with:

 git branch <new-branch-name> 7170f4e

Switched to branch 'main'
$ git branch try-x 7170f4e            # the commit now has a name and is safe`,
  annotations: [
    {
      id: 'rescue',
      range: { line: 16 },
      kind: 'function',
      title: 'Naming the commit',
      what: 'A branch pointing at the orphaned commit makes it reachable again.',
      why: 'Unreachable commits are deleted by garbage collection once their reflog entries expire: after 30 days by default (gc.reflogExpireUnreachable).',
    },
  ],
};
