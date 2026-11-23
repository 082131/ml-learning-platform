import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'pushed-bad',
    type: 'choice',
    prompt: 'A commit that breaks training was pushed to main an hour ago, and two teammates have pulled. How do you undo it?',
    options: [
      { text: 'git reset --hard HEAD~1, then git push --force', correct: false, explain: 'That rewrites shared history. The teammates still have the commit, and their next push brings it back.' },
      { text: 'git revert <id>, then git push', correct: true, explain: 'A new commit undoes the change. Nothing is rewritten, so everyone can simply pull.' },
      { text: 'git commit --amend to replace it, then git push', correct: false, explain: 'Amend also rewrites the commit, and the push is rejected without --force.' },
    ],
  },
  {
    id: 'soft-mixed',
    type: 'choice',
    prompt: 'After git reset --soft HEAD~1, where are the changes from the commit you undid?',
    options: [
      { text: 'In the working tree only, unstaged', correct: false, explain: 'That is --mixed, the default. --soft leaves the index untouched too.' },
      { text: 'Deleted; reset always discards the commit’s changes', correct: false, explain: 'Only --hard changes the working tree.' },
      { text: 'Staged, ready to commit again', correct: true, explain: '--soft moves only the branch. Index and files still have the commit’s content, so it shows as staged.' },
    ],
  },
  {
    id: 'recover',
    type: 'choice',
    prompt: 'You ran git reset --hard HEAD~3 by mistake. Which of these can you get back?',
    options: [
      { text: 'The three commits, and nothing that was uncommitted', correct: true, explain: 'The reflog has the commits (git reset --hard HEAD@{1}). Uncommitted edits were never stored, so they are gone.' },
      { text: 'The three commits and any uncommitted edits too', correct: false, explain: 'Git never saved the uncommitted edits as objects, so there is nothing to recover.' },
      { text: 'Nothing: reset --hard deletes the commits', correct: false, explain: 'reset moves a branch. The commits stay in the object database and in the reflog.' },
    ],
  },
  {
    id: 'reflog-index',
    type: 'numeric',
    prompt: 'You committed, then ran git commit --amend, then git reset --hard HEAD~1. Which n in HEAD@{n} is the amended commit?',
    answer: 1,
    tolerance: 0,
    hint: 'HEAD@{0} is where HEAD is now; each earlier move adds one.',
    explain: 'HEAD@{0}: after the reset. HEAD@{1}: the amended commit. HEAD@{2}: the original commit.',
  },
  {
    id: 'order-strength',
    type: 'order',
    prompt: 'Order these from least to most destructive to your current work.',
    items: ['git revert HEAD', 'git reset --soft HEAD~1', 'git reset --mixed HEAD~1', 'git reset --hard HEAD~1'],
    explain: 'revert only adds; --soft moves the branch; --mixed also resets the index; --hard also overwrites your files.',
  },
];

export const resetExercise: Exercise = {
  id: 'simulate-reset',
  prompt:
    'Write `reset(repo, commits, mode, target)`. `commits` maps commit ids to snapshots (dicts of path -> content). `repo` is a dict with "head" (a commit id), "index" and "work" (snapshots). Return a new repo after `git reset --<mode> <target>` for mode "soft", "mixed" or "hard". Do not modify the input.',
  starter: `def reset(repo, commits, mode, target):
    pass`,
  hints: [
    'Every mode moves "head" to target.',
    '"mixed" and "hard" also set the index to a copy of the target snapshot; only "hard" sets the working tree too.',
  ],
  solution: `def reset(repo, commits, mode, target):
    snap = commits[target]
    out = {"head": target, "index": dict(repo["index"]), "work": dict(repo["work"])}
    if mode in ("mixed", "hard"):
        out["index"] = dict(snap)
    if mode == "hard":
        out["work"] = dict(snap)
    return out`,
  explanation:
    'reset is three steps that stop at different points: move the branch (soft), then copy the commit into the index (mixed), then into the working tree (hard). Real --hard also deletes tracked files the target lacks, and leaves untracked files alone.',
  tests: `commits = {"c1": {"a.py": "1"}, "c2": {"a.py": "2", "b.py": "x"}}
repo = {"head": "c2", "index": {"a.py": "2", "b.py": "x"}, "work": {"a.py": "3", "b.py": "x"}}
s = reset(repo, commits, "soft", "c1")
assert s == {"head": "c1", "index": {"a.py": "2", "b.py": "x"}, "work": {"a.py": "3", "b.py": "x"}}, s
m = reset(repo, commits, "mixed", "c1")
assert m == {"head": "c1", "index": {"a.py": "1"}, "work": {"a.py": "3", "b.py": "x"}}, m
h = reset(repo, commits, "hard", "c1")
assert h == {"head": "c1", "index": {"a.py": "1"}, "work": {"a.py": "1"}}, h
assert repo["head"] == "c2" and repo["work"]["a.py"] == "3"
h["index"]["a.py"] = "changed"
assert commits["c1"]["a.py"] == "1"`,
};
