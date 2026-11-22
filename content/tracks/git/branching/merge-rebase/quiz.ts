import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'ff-when',
    type: 'choice',
    prompt: 'You are on main and run git merge feature. When does Git fast-forward instead of making a merge commit?',
    options: [
      { text: 'When feature has fewer commits than main', correct: false, explain: 'Counts do not matter. What matters is whether main’s commit is in feature’s history.' },
      { text: 'When main has no commits that feature lacks', correct: true, explain: 'Then main is an ancestor of feature and can simply move forward to it.' },
      { text: 'When the two branches changed different files', correct: false, explain: 'Different files make a clean three-way merge, but it is still a merge commit if both sides moved.' },
    ],
  },
  {
    id: 'rebase-shared',
    type: 'choice',
    prompt: 'You pushed feature yesterday and a teammate branched from it. Today you rebase feature on main and force-push. What happens to the teammate?',
    options: [
      { text: 'Nothing; their branch follows yours automatically on the next pull', correct: false, explain: 'Their commits sit on your old commit ids. Pulling brings duplicates and conflicts, not a clean update.' },
      { text: 'Their work is built on commits that no longer exist on feature', correct: true, explain: 'Rebase made new commits. Rewrite only branches nobody else builds on, or agree on it first.' },
      { text: 'Git refuses the force-push until they approve it', correct: false, explain: 'Git has no approval step. Branch protection rules on the server can block force-pushes, but that is configuration.' },
    ],
  },
  {
    id: 'squash-branch',
    type: 'choice',
    prompt: 'A pull request was squash-merged into main. Later git branch -d feature refuses: "not fully merged". Why?',
    options: [
      { text: 'Squash merging failed, so the changes are not on main yet', correct: false, explain: 'The changes are on main, in one new commit. Git does not know it contains feature’s work.' },
      { text: 'The branch has unpushed commits that were left out', correct: false, explain: 'Possible in general, but here the refusal happens even when every commit was included.' },
      { text: 'feature’s commits are not ancestors of main', correct: true, explain: 'git branch -d checks ancestry. Use -D after a squash merge, or let GitHub delete the branch.' },
    ],
  },
  {
    id: 'base-count',
    type: 'numeric',
    prompt: 'main: A-B-C-D. feature branched at B and has E-F-G. You rebase feature on main. How many new commit ids does rebase create?',
    answer: 3,
    tolerance: 0,
    hint: 'Rebase rewrites the commits in main..feature.',
    explain: 'E, F and G are replayed on D as E′, F′, G′. A to D keep their ids.',
  },
  {
    id: 'order-rebase-flow',
    type: 'order',
    prompt: 'Put the steps of a rebase-then-fast-forward integration in order.',
    items: ['git switch feature', 'git rebase main', 'Fix any conflicts and git rebase --continue', 'git switch main', 'git merge --ff-only feature'],
    explain: 'Rebase moves the branch you are on; --ff-only on main guarantees no merge commit sneaks in.',
  },
];

export const mergeBaseExercise: Exercise = {
  id: 'merge-base',
  prompt:
    'Write `merge_base(parents, a, b)`. `parents` maps each commit id to the list of its parent ids. Return the common ancestor of `a` and `b` that is not an ancestor of any other common ancestor (assume there is exactly one). A commit counts as its own ancestor.',
  starter: `def merge_base(parents, a, b):
    pass`,
  hints: [
    'Collect the ancestors of a and of b (including themselves) and intersect them.',
    'Among the common ancestors, keep the one that is not reachable from another common ancestor.',
  ],
  solution: `def merge_base(parents, a, b):
    def ancestors(start):
        seen, stack = set(), [start]
        while stack:
            c = stack.pop()
            if c not in seen:
                seen.add(c)
                stack.extend(parents[c])
        return seen
    common = ancestors(a) & ancestors(b)
    for c in common:
        if not any(c != d and c in ancestors(d) for d in common):
            return c`,
  explanation:
    'The merge base is the newest shared commit. A three-way merge compares each side with it: a line changed on one side only is taken from that side, and a line changed on both sides is a conflict. If the merge base equals the current branch, the merge is a fast-forward.',
  tests: `p = {"A": [], "B": ["A"], "C": ["B"], "D": ["C"], "E": ["B"], "F": ["E"]}
assert merge_base(p, "D", "F") == "B"
assert merge_base(p, "F", "D") == "B"
assert merge_base(p, "C", "D") == "C"
assert merge_base(p, "A", "F") == "A"
q = dict(p, M=["D", "F"], G=["F"])
assert merge_base(q, "M", "G") == "F"`,
};
