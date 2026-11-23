import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'areas',
    type: 'choice',
    prompt:
      'You edit train.py, run git add train.py, then edit train.py again. What does git commit -m "Tune" (without -a) save?',
    options: [
      { text: 'Both edits, because commit reads the working tree', correct: false, explain: 'Commit reads the staging area, not the working tree. The second edit was never staged.' },
      { text: 'The first edit only: the version staged by git add', correct: true, explain: 'git add copies the file’s content at that moment into the index. git status would show MM: staged, then modified again.' },
      { text: 'Nothing; Git refuses until the second edit is staged', correct: false, explain: 'Git commits whatever is staged. Unstaged changes are allowed and simply stay in the working tree.' },
    ],
  },
  {
    id: 'status-code',
    type: 'choice',
    prompt: 'git status --short prints "A  notes.md" and " M train.py". Which statement is right?',
    options: [
      { text: 'notes.md is new and staged; train.py is modified but not staged', correct: true, explain: 'The left column compares the index with HEAD, the right column compares the working tree with the index.' },
      { text: 'Both files are staged; A and M only name the kind of change', correct: false, explain: 'The column matters. M in the right column means the change is only in the working tree.' },
      { text: 'notes.md was added to .gitignore; train.py is staged', correct: false, explain: 'Ignored files show as !! and only with --ignored. A means added to the index.' },
    ],
  },
  {
    id: 'snapshot',
    type: 'choice',
    prompt: 'What does a Git commit store?',
    options: [
      { text: 'A diff against the previous commit, plus the author, the dates and the message', correct: false, explain: 'Git computes diffs when you ask for them. Each commit points to a full tree; unchanged files are shared, not copied.' },
      { text: 'A full snapshot of the files, plus parents, author, dates and message', correct: true, explain: 'Unchanged files point to the same stored content, so a snapshot of a large project costs only what changed.' },
      { text: 'Only the files that were staged since the last push, as one compressed patch', correct: false, explain: 'The index holds every tracked file, not just changed ones, and pushing has nothing to do with what a commit contains.' },
    ],
  },
  {
    id: 'ignore',
    type: 'choice',
    prompt:
      'config.env with an API key was committed last week. You add config.env to .gitignore and commit that. Is the key safe now?',
    options: [
      { text: 'Yes: once a file matches .gitignore, Git drops it from the repository at the next commit', correct: false, explain: '.gitignore only affects untracked files. A tracked file stays tracked, and old commits keep the key forever.' },
      { text: 'Yes, as long as you also run git rm --cached config.env before pushing again', correct: false, explain: 'That stops tracking it from now on, but last week’s commits still contain the key, and anyone with a clone has them.' },
      { text: 'No: old commits still contain it. Rotate the key and stop tracking the file', correct: true, explain: 'Treat a committed secret as leaked. Rotation is the fix; history rewriting (git filter-repo) only limits further spread.' },
    ],
  },
  {
    id: 'order',
    type: 'order',
    prompt: 'Put the steps of saving a change in order.',
    items: ['Edit files in the working tree', 'Check what changed with git status', 'Stage the changes you want with git add', 'Record them with git commit -m "..."', 'Read the result with git log --oneline'],
    explain: 'Changes flow working tree → staging area → repository; status and log let you check each step.',
  },
];

export const statusExercise: Exercise = {
  id: 'parse-status',
  prompt:
    'Write `summarize(lines)` for lines of `git status --short` output (two status letters, a space, then a path). Return a dict with three sorted lists: "staged" (left letter is not a space or ?), "unstaged" (right letter is not a space or ?), and "untracked" (code ??). A file can be both staged and unstaged.',
  starter: `def summarize(lines):
    pass`,
  hints: [
    'line[0] is the index column, line[1] the working-tree column, and the path starts at line[3].',
    'Handle "??" first, then test each column separately.',
  ],
  solution: `def summarize(lines):
    out = {"staged": [], "unstaged": [], "untracked": []}
    for line in lines:
        x, y, path = line[0], line[1], line[3:]
        if x + y == "??":
            out["untracked"].append(path)
            continue
        if x != " ":
            out["staged"].append(path)
        if y != " ":
            out["unstaged"].append(path)
    return {k: sorted(v) for k, v in out.items()}`,
  explanation:
    'The two columns are independent: the left compares the staging area with HEAD, the right compares the working tree with the staging area. MM means a file was staged and then changed again.',
  tests: `r = summarize(["A  notes.md", " M train.py", "?? data.csv", "MM README.md"])
assert r["staged"] == ["README.md", "notes.md"], r
assert r["unstaged"] == ["README.md", "train.py"], r
assert r["untracked"] == ["data.csv"], r
assert summarize([]) == {"staged": [], "unstaged": [], "untracked": []}
assert summarize(["D  old.py", " D gone.py"]) == {"staged": ["old.py"], "unstaged": ["gone.py"], "untracked": []}`,
};
