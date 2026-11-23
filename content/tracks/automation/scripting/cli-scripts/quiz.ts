import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'exit-zero',
    type: 'choice',
    prompt: 'A nightly script catches every exception, logs it, and ends normally. What does the scheduler see when the export it needs is missing?',
    options: [
      { text: 'Exit code 0: a success, so nobody is alerted', correct: true, explain: 'Swallowing the error hides it from everything that runs the script. Log it, then exit non-zero (or let it raise).' },
      { text: 'Exit code 1, because an exception was logged', correct: false, explain: 'Logging does not change the exit code. Only sys.exit(n) or an uncaught exception does.' },
      { text: 'A warning status that the scheduler retries later', correct: false, explain: 'Schedulers see only the exit code. There is no warning status.' },
    ],
  },
  {
    id: 'rename',
    type: 'choice',
    prompt: 'On Linux, what does Path("a.csv").rename("data/a.csv") do if data/a.csv already exists?',
    options: [
      { text: 'Raises FileExistsError and leaves both files', correct: false, explain: 'That is Windows. On Unix the rename replaces the target.' },
      { text: 'Replaces data/a.csv silently', correct: true, explain: 'The pathlib docs: on Unix, an existing file target is replaced silently. Check dst.exists() first.' },
      { text: 'Renames the new file to a.csv.1 to avoid a clash', correct: false, explain: 'Python never renames for you. You would have to build that yourself.' },
      { text: 'Merges the two files line by line', correct: false, explain: 'File systems do not merge contents.' },
    ],
  },
  {
    id: 'mkdir',
    type: 'choice',
    prompt: 'Why does the organizer call dst.parent.mkdir(exist_ok=True) instead of mkdir()?',
    options: [
      { text: 'exist_ok makes mkdir create missing parent folders as well', correct: false, explain: 'That is parents=True. exist_ok only tolerates the folder already existing.' },
      { text: 'So the second run does not crash on a folder the first run made', correct: true, explain: 'mkdir() raises FileExistsError if the folder exists; exist_ok=True makes the step idempotent.' },
      { text: 'exist_ok skips the folder if the disk is nearly full', correct: false, explain: 'It has nothing to do with disk space.' },
    ],
  },
  {
    id: 'dryrun-design',
    type: 'choice',
    prompt: 'What design makes a --dry-run mode trustworthy?',
    options: [
      { text: 'Copy the folder to /tmp and run the real script on the copy', correct: false, explain: 'Possible, but slow for big folders and it still risks writing to shared places (APIs, databases).' },
      { text: 'Wrap each side effect in try/except and roll back on error', correct: false, explain: 'Rollback is a different feature. A dry run should never touch anything in the first place.' },
      { text: 'Compute the plan in one function, and apply it in another', correct: true, explain: 'The dry run prints the plan; the real run applies the same plan. Both paths share the decision logic, so the preview is exact.' },
    ],
  },
  {
    id: 'order-script',
    type: 'order',
    prompt: 'Order the steps of the organizer’s main().',
    items: ['Parse the arguments', 'Check the folder exists (exit 2 if not)', 'Compute the plan', 'Apply or print each step, skipping conflicts', 'Log a summary and return the exit code'],
    explain: 'Validate inputs before doing anything, decide before acting, and report at the end.',
  },
];

export const planExercise: Exercise = {
  id: 'plan-moves',
  prompt:
    'Write `plan_moves(names, rules, existing)`. `names` lists top-level file names, `rules` maps a lower-case extension (with the dot, like ".csv") to a folder, and `existing` is a set of paths that already exist, like "data/a.csv". Return `(moves, conflicts)`: `moves` is a list of `(name, "folder/name")` pairs in sorted name order, and `conflicts` the sorted names whose destination already exists (or is taken by an earlier move). Files with no rule are ignored. Match extensions case-insensitively.',
  starter: `def plan_moves(names, rules, existing):
    return [], []`,
  hints: [
    'os.path.splitext(name)[1].lower() gives ".csv" for "Sales.CSV".',
    'Keep a set of taken destinations, starting from `existing`, and add each planned destination to it.',
  ],
  solution: `import os

def plan_moves(names, rules, existing):
    taken = set(existing)
    moves, conflicts = [], []
    for name in sorted(names):
        folder = rules.get(os.path.splitext(name)[1].lower())
        if folder is None:
            continue
        dst = f"{folder}/{name}"
        if dst in taken:
            conflicts.append(name)
        else:
            taken.add(dst)
            moves.append((name, dst))
    return moves, conflicts`,
  explanation:
    'A pure function of its inputs is easy to test and gives you the dry run for free. The real script calls it, then applies the moves.',
  tests: `rules = {".csv": "data", ".png": "figures", ".py": "code"}
m, c = plan_moves(["b.png", "Sales.CSV", "notes.txt", "a.csv", "train.py"], rules, {"data/a.csv"})
assert m == [("Sales.CSV", "data/Sales.CSV"), ("b.png", "figures/b.png"), ("train.py", "code/train.py")], m
assert c == ["a.csv"], c
assert plan_moves([], rules, set()) == ([], [])
m2, c2 = plan_moves(["x.py", "x.PY"], {".py": "code"}, set())
assert m2 == [("x.PY", "code/x.PY"), ("x.py", "code/x.py")] and c2 == []`,
};
