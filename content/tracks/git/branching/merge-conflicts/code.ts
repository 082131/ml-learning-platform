// Code for "Resolving merge conflicts". The sandbox scenario (conflict) and its extra scripts (abort, rebase with a
// conflict, cherry-pick with a conflict) are replayed in real Git 2.43 by sim.test.ts; the merge lab's presets are
// checked against git merge-file in merge3.test.ts. Transcripts below are from Git 2.43.0.
import { mergeLabExperiment } from '@/lib/git/mergeLab';
import { gitSandboxExperiment } from '@/lib/git/sandbox';
import type { CodeExample } from '@/lib/types';

export const conflict = gitSandboxExperiment('git-conflict', 'conflict');
export const mergeLab = mergeLabExperiment('git-merge-lab');

export const conflictShell: CodeExample = {
  id: 'conflict-shell',
  language: 'bash',
  source: `$ git merge tune-lr
Auto-merging params.yaml
CONFLICT (content): Merge conflict in params.yaml
Automatic merge failed; fix conflicts and then commit the result.
$ git status
On branch main
You have unmerged paths.
  (fix conflicts and run "git commit")
  (use "git merge --abort" to abort the merge)

Unmerged paths:
  (use "git add <file>..." to mark resolution)
	both modified:   params.yaml
$ cat params.yaml
model: logistic
<<<<<<< HEAD
lr: 0.02
=======
lr: 0.003
>>>>>>> tune-lr
epochs: 10`,
  annotations: [
    {
      id: 'ours',
      range: { line: 16 },
      kind: 'syntax',
      title: '<<<<<<< HEAD',
      what: 'Start of the conflict. The lines up to ======= are the current branch’s version ("ours").',
      why: 'During a merge, HEAD is the branch you are on. During a rebase, HEAD is the branch you are replaying onto, so "ours" and "theirs" swap meaning.',
    },
    {
      id: 'theirs',
      range: { line: 19 },
      kind: 'syntax',
      title: '>>>>>>> tune-lr',
      what: 'End of the conflict. The lines since ======= are the other side’s version.',
      why: 'Lines outside the markers (model, epochs) merged cleanly and need no attention.',
    },
  ],
};

export const zdiff3Shell: CodeExample = {
  id: 'zdiff3',
  language: 'bash',
  source: `$ git config --global merge.conflictStyle zdiff3   # show the merge base too (Git 2.35+)
$ git merge tune-lr && cat params.yaml
model: logistic
<<<<<<< HEAD
lr: 0.02
||||||| b883fd2
lr: 0.01
=======
lr: 0.003
>>>>>>> tune-lr
epochs: 10`,
  annotations: [
    {
      id: 'base',
      range: { line: 6 },
      kind: 'syntax',
      title: '||||||| base',
      what: 'What the line was in the merge base (here, commit b883fd2).',
      why: 'Now you can see what each side did: main raised lr from 0.01, tune-lr lowered it. Without the base, you only see two numbers.',
    },
  ],
};

export const resolveCommands: CodeExample = {
  id: 'resolve-commands',
  language: 'bash',
  source: `git diff --name-only --diff-filter=U   # list files that still have conflicts
# edit each file: keep what you want, delete all three marker lines
git add params.yaml                    # mark it resolved
git commit --no-edit                   # finish a merge (Git prepared the message)

git checkout --ours   params.yaml      # take one side for a whole file ...
git checkout --theirs params.yaml      # ... (useful for generated files)

git rebase --continue                  # finish the current step of a rebase after git add
git cherry-pick --continue             # same for cherry-pick and revert
git merge --abort                      # or give up and return to before the merge`,
  annotations: [
    {
      id: 'filter',
      range: { line: 1 },
      kind: 'parameter',
      title: '--diff-filter=U',
      what: 'Only unmerged paths.',
      why: 'A quick checklist of what is left before you can commit.',
    },
    {
      id: 'abort',
      range: { line: 11 },
      kind: 'function',
      title: '--abort',
      what: 'Restores the branch, index and files to how they were before the merge started.',
      why: 'Always safe while resolving. Start again with a clearer head, or ask the other author.',
    },
  ],
};

export const notebookTools: CodeExample = {
  id: 'nbdime',
  language: 'bash',
  source: `pip install nbdime
nbdime config-git --enable --global    # notebook-aware diff and merge for git diff / git merge
nbdiff-web before.ipynb after.ipynb    # side-by-side diff of cells, ignoring execution counts

pip install nbstripout
nbstripout --install                   # strip outputs on commit, so outputs never conflict`,
  annotations: [
    {
      id: 'nbdime',
      range: { line: 2 },
      kind: 'framework',
      title: 'nbdime',
      what: 'Registers a diff and merge driver for .ipynb files.',
      why: 'A notebook is JSON with outputs and counters. A line merge of that JSON produces conflicts that are hard to read and easy to break.',
    },
  ],
};
