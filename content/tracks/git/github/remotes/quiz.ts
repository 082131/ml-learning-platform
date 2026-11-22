import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'origin-main',
    type: 'choice',
    prompt: 'git status says "Your branch is up to date with origin/main", but a teammate pushed five minutes ago. Why?',
    options: [
      { text: 'origin/main is your last fetched copy; you have not fetched', correct: true, explain: 'Status compares with the remote-tracking branch, which only moves when you fetch, pull or push.' },
      { text: 'Their push is still being processed and has not reached GitHub', correct: false, explain: 'A push is done when it returns. The remote has the commit; your clone does not know.' },
      { text: 'git status only checks GitHub for new commits once an hour', correct: false, explain: 'Git does no background polling. Some editors run git fetch for you, plain Git does not.' },
    ],
  },
  {
    id: 'fetch-vs-pull',
    type: 'choice',
    prompt: 'What is the difference between git fetch and git pull?',
    options: [
      { text: 'fetch downloads only the latest commit; pull downloads the full history', correct: false, explain: 'Both download every missing object. The difference is what happens afterwards.' },
      { text: 'fetch works on one branch; pull updates every branch you have', correct: false, explain: 'pull integrates into the current branch only.' },
      { text: 'pull is fetch followed by a merge or rebase into your branch', correct: true, explain: 'fetch only updates origin/*. pull then integrates the upstream into the branch you are on.' },
    ],
  },
  {
    id: 'lease',
    type: 'choice',
    prompt: 'You rebased your pushed feature branch. Meanwhile a reviewer pushed a fix to it, which you have not fetched. What does git push --force-with-lease do?',
    options: [
      { text: 'Overwrites the branch, deleting the reviewer’s fix', correct: false, explain: 'That is plain --force. The lease checks the remote first.' },
      { text: 'Refuses, because the branch moved since your last fetch', correct: true, explain: 'origin/feature still has the old id, the server has a newer one, so the lease fails. Fetch, rebase on their fix, push again.' },
      { text: 'Merges the reviewer’s fix into your branch, then pushes', correct: false, explain: 'Push never merges. Integration is always your job, locally.' },
    ],
  },
  {
    id: 'ahead-behind',
    type: 'numeric',
    prompt: 'git status -sb shows "## main...origin/main [ahead 2, behind 3]". You run git pull --rebase. How many commits are you ahead afterwards?',
    answer: 2,
    tolerance: 0,
    hint: 'Rebase puts your commits on top of origin/main.',
    explain: 'Your 2 commits are replayed after origin/main’s 3, so you are ahead 2, behind 0, and git push will be accepted.',
  },
  {
    id: 'order-sync',
    type: 'order',
    prompt: 'Put the steps for pushing after a rejected push in order.',
    items: ['git push is rejected (fetch first)', 'git fetch', 'git log --oneline main..origin/main to see their commits', 'git rebase origin/main (fix conflicts, run tests)', 'git push'],
    explain: 'Fetch and read before integrating; then the push is a fast-forward.',
  },
];

export const pushExercise: Exercise = {
  id: 'push-check',
  prompt:
    'Write `push_result(parents, local, remote_tip, mode, lease=None)`. `parents` maps commit ids to parent lists. Return "accepted" or "rejected" for pushing commit `local` to a remote branch at `remote_tip`. mode "normal": accept only a fast-forward (remote_tip is reachable from local). mode "force": always accept. mode "lease": accept only if remote_tip equals `lease`, the id you last fetched.',
  starter: `def push_result(parents, local, remote_tip, mode, lease=None):
    pass`,
  hints: [
    'For "normal", walk from local through all parents and check whether remote_tip is among the commits you reach.',
    'For "lease", compare ids only: the lease does not care about ancestry.',
  ],
  solution: `def push_result(parents, local, remote_tip, mode, lease=None):
    if mode == "force":
        return "accepted"
    if mode == "lease":
        return "accepted" if remote_tip == lease else "rejected"
    seen, stack = set(), [local]
    while stack:
        c = stack.pop()
        if c not in seen:
            seen.add(c)
            stack.extend(parents[c])
    return "accepted" if remote_tip in seen else "rejected"`,
  explanation:
    'A normal push may only add commits to the remote branch. --force skips the check entirely; --force-with-lease replaces it with "the branch is where I last saw it", which protects work you have not seen.',
  tests: `p = {"A": [], "B": ["A"], "C": ["B"], "G": ["B"], "C2": ["G"]}
assert push_result(p, "C", "B", "normal") == "accepted"
assert push_result(p, "C", "G", "normal") == "rejected"
assert push_result(p, "C2", "G", "normal") == "accepted"
assert push_result(p, "C", "G", "force") == "accepted"
assert push_result(p, "C", "G", "lease", lease="B") == "rejected"
assert push_result(p, "C", "G", "lease", lease="G") == "accepted"
assert push_result(p, "B", "B", "normal") == "accepted"`,
};
