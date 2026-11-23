// Code for "Undoing things". The sandbox scenario (undo) and its extra scripts (stash, mixed reset, amend,
// HEAD@{1}) are replayed in real Git 2.43 by sim.test.ts. Transcripts below are from Git 2.43.0 with fixed dates.
import { gitSandboxExperiment } from '@/lib/git/sandbox';
import type { CodeExample } from '@/lib/types';

export const undo = gitSandboxExperiment('git-undo', 'undo');

export const undoTable: CodeExample = {
  id: 'undo-cheatsheet',
  language: 'bash',
  source: `git restore train.py              # discard unstaged edits to a file (working tree <- index)
git restore --staged train.py     # unstage, keep the edits (index <- HEAD)
git commit --amend -m "Better"    # replace the last commit (new id); also adds anything staged
git reset --soft HEAD~1           # undo the last commit, keep its changes staged
git reset HEAD~1                  # (--mixed, the default) undo it, keep its changes unstaged
git reset --hard HEAD~1           # undo it and throw its changes away, with any uncommitted work
git revert a1b2c3d                # new commit that undoes a1b2c3d: safe on pushed branches
git stash                         # put uncommitted changes aside; git stash pop brings them back`,
  annotations: [
    {
      id: 'restore',
      range: { line: 1 },
      kind: 'function',
      title: 'git restore',
      what: 'Copies the index version of the file over the working tree.',
      why: 'The edits were never committed, so no reflog can bring them back. This is one of the few truly destructive commands.',
    },
    {
      id: 'amend',
      range: { line: 3 },
      kind: 'parameter',
      title: '--amend',
      what: 'Makes a new commit with the same parent as HEAD, and moves the branch to it.',
      why: 'The old commit is replaced, not edited (ids cannot change). Do not amend a commit you have pushed.',
    },
    {
      id: 'hard',
      range: { line: 6 },
      kind: 'parameter',
      title: '--hard',
      what: 'Moves the branch, then makes the index and working tree match it.',
      why: 'Committed work can be recovered from the reflog. Uncommitted edits cannot.',
    },
    {
      id: 'revert',
      range: { line: 7 },
      kind: 'function',
      title: 'git revert',
      what: 'Computes the inverse of a commit’s change and commits it.',
      why: 'History only grows, so nobody else’s clone breaks. On main, this is the way to undo.',
    },
  ],
};

export const revertShell: CodeExample = {
  id: 'revert-shell',
  language: 'bash',
  source: `$ git revert --no-edit HEAD
[main 991b812] Revert "Train for 20 epochs"
 Date: Thu Jan 1 00:04:00 2026 +0000
 1 file changed, 1 deletion(-)
$ git log --oneline
991b812 (HEAD -> main) Revert "Train for 20 epochs"
2b36a0f Train for 20 epochs
2d9af5d Add training script
c0a9439 Add README`,
  annotations: [],
};

export const reflogShell: CodeExample = {
  id: 'reflog-shell',
  language: 'bash',
  source: `$ git reset --hard HEAD~2           # oops: two commits too far
HEAD is now at c0a9439 Add README
$ git reflog                         # every position HEAD has had, newest first
c0a9439 (HEAD -> main) HEAD@{0}: reset: moving to HEAD~2
2b36a0f HEAD@{1}: reset: moving to HEAD~1
991b812 HEAD@{2}: revert: Revert "Train for 20 epochs"
2b36a0f HEAD@{3}: commit: Train for 20 epochs
2d9af5d HEAD@{4}: commit: Add training script
c0a9439 (HEAD -> main) HEAD@{5}: commit (initial): Add README
$ git reset --hard HEAD@{1}          # back to where HEAD was one move ago
HEAD is now at 2b36a0f Train for 20 epochs`,
  annotations: [
    {
      id: 'local',
      range: { line: 3 },
      kind: 'function',
      title: 'git reflog',
      what: 'A local log of where HEAD (and each branch) pointed, with the command that moved it.',
      why: 'It is private to your clone and is never pushed. Entries expire after 90 days (30 for commits no branch reaches).',
    },
  ],
};

export const stashShell: CodeExample = {
  id: 'stash-shell',
  language: 'bash',
  source: `$ echo "batch = 64" >> train.py
$ git stash                          # also: git stash push -m "batch size idea"
Saved working directory and index state WIP on main: 2b36a0f Train for 20 epochs
$ git stash list
stash@{0}: WIP on main: 2b36a0f Train for 20 epochs
# ... switch to another branch, fix something, switch back ...
$ git stash pop                      # re-apply and drop; "git stash apply" keeps the entry
On branch main
Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
	modified:   train.py

no changes added to commit (use "git add" and/or "git commit -a")
Dropped refs/stash@{0} (3ed42c177b139633cfb57b8f60e7d4fda05f2cc8)`,
  annotations: [
    {
      id: 'untracked',
      range: { line: 2 },
      kind: 'function',
      title: 'git stash',
      what: 'Saves staged and unstaged changes to tracked files as special commits, then cleans the working tree.',
      why: 'Untracked files stay where they are unless you add -u. Stashes are easy to forget: prefer a WIP commit on a branch for anything longer than a few minutes.',
    },
  ],
};
