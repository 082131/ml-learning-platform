import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'cost',
    type: 'choice',
    prompt: 'A repository has 2 GB of history. What does git branch experiment write to disk?',
    options: [
      { text: 'A copy of the current snapshot, so the branch can be edited separately', correct: false, explain: 'Snapshots are shared objects. The branch is only a name for a commit.' },
      { text: 'A small file holding one commit id', correct: true, explain: '.git/refs/heads/experiment, 41 bytes. That is why branches are cheap enough to make for every idea.' },
      { text: 'A full copy of .git/objects, compressed', correct: false, explain: 'Nothing in the object database is copied; both names point into the same objects.' },
    ],
  },
  {
    id: 'which-moves',
    type: 'choice',
    prompt: 'main and feature point at the same commit, and HEAD points at feature. You commit. Which names move?',
    options: [
      { text: 'Both main and feature, because they pointed at the same commit', correct: false, explain: 'Only the branch HEAD is attached to moves. main keeps pointing at the old commit.' },
      { text: 'Neither: branches only move when you push them', correct: false, explain: 'Pushing moves the remote’s branch. Your local branch moves at every commit.' },
      { text: 'feature, and HEAD with it, since HEAD names feature', correct: true, explain: 'HEAD holds "ref: refs/heads/feature", so the new commit id is written to feature.' },
    ],
  },
  {
    id: 'detached',
    type: 'choice',
    prompt: 'You ran git switch --detach v1.0.0, made two commits, and then switched to main. Where are those commits?',
    options: [
      { text: 'Still in the repository, but no branch points at them', correct: true, explain: 'They show in git reflog. Create a branch at the last one to keep them; otherwise gc deletes them eventually.' },
      { text: 'On main, because switching carries commits along', correct: false, explain: 'Switching moves HEAD only. Commits stay where they were made.' },
      { text: 'Gone, because detached commits are never written', correct: false, explain: 'They were written like any commit. They are just unreachable from any branch or tag.' },
    ],
  },
  {
    id: 'range-count',
    type: 'numeric',
    prompt: 'main has commits A-B-C. feature was made at B and has D and E. How many commits does git log main..feature list?',
    answer: 2,
    tolerance: 0,
    hint: 'Count commits reachable from feature but not from main.',
    explain: 'feature reaches A, B, D, E; main reaches A, B, C. The difference is D and E.',
  },
  {
    id: 'order-branch',
    type: 'order',
    prompt: 'Put the steps for trying an idea on a branch in order.',
    items: ['git switch -c try-dropout', 'Edit and commit on the branch', 'git switch main', 'git merge try-dropout (if it worked)', 'git branch -d try-dropout'],
    explain: 'Branch, commit, return, integrate, then delete the name: the commits stay in main’s history.',
  },
];

export const aheadExercise: Exercise = {
  id: 'ahead-behind',
  prompt:
    'Write `ahead_behind(parents, a, b)`. `parents` maps each commit id to the list of its parent ids. Return a tuple: how many commits are reachable from `a` but not from `b`, and how many from `b` but not from `a`. This is what git status reports as "ahead 2, behind 1".',
  starter: `def ahead_behind(parents, a, b):
    pass`,
  hints: [
    'Write a helper that collects every commit reachable from a start commit, following all parents.',
    'Then the answer is the sizes of two set differences.',
  ],
  solution: `def ahead_behind(parents, a, b):
    def reachable(start):
        seen, stack = set(), [start]
        while stack:
            c = stack.pop()
            if c not in seen:
                seen.add(c)
                stack.extend(parents[c])
        return seen
    ra, rb = reachable(a), reachable(b)
    return len(ra - rb), len(rb - ra)`,
  explanation:
    'Git compares sets of reachable commits, not dates or positions. a..b in git log is rb - ra, and git rev-list --left-right --count a...b prints both numbers.',
  tests: `p = {"A": [], "B": ["A"], "C": ["B"], "D": ["B"], "E": ["D"]}
assert ahead_behind(p, "E", "C") == (2, 1)
assert ahead_behind(p, "C", "E") == (1, 2)
assert ahead_behind(p, "C", "C") == (0, 0)
assert ahead_behind(p, "E", "B") == (2, 0)
m = dict(p, M=["C", "E"])
assert ahead_behind(m, "M", "C") == (3, 0)`,
};
