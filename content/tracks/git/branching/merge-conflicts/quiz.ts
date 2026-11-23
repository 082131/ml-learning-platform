import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'when-conflict',
    type: 'choice',
    prompt: 'Since the merge base, main changed line 2 of params.yaml and feature changed line 5. What does git merge do?',
    options: [
      { text: 'It reports a conflict, because both branches changed the same file', correct: false, explain: 'Git merges by region, not by file. Separate regions merge cleanly.' },
      { text: 'It merges cleanly and takes each change from the side that made it', correct: true, explain: 'Each region was changed on one side only. Lines next to each other would be a different story.' },
      { text: 'It keeps main’s version of the file, since main is the current branch', correct: false, explain: 'A three-way merge never discards a change just because of which branch you are on.' },
    ],
  },
  {
    id: 'rebase-ours',
    type: 'choice',
    prompt: 'You run git rebase main on feature and hit a conflict. In the markers, which side is HEAD?',
    options: [
      { text: 'main, with your feature commits replayed so far', correct: true, explain: 'Rebase checks out main and replays your commits onto it, so HEAD is the new base and your commit is "theirs".' },
      { text: 'feature, because you started the rebase from it', correct: false, explain: 'That is the merge case. During a rebase the roles swap.' },
      { text: 'Neither; rebase conflicts are labelled with commit ids only', correct: false, explain: 'The first marker still says HEAD; the second names the commit being replayed.' },
    ],
  },
  {
    id: 'add-markers',
    type: 'choice',
    prompt: 'You delete the ======= line but leave the <<<<<<< and >>>>>>> lines, then git add the file. What happens?',
    options: [
      { text: 'Git refuses the add until all markers are gone', correct: false, explain: 'git add does not check content. It marks the file resolved, whatever is in it.' },
      { text: 'Git puts the conflict back the next time you run git status', correct: false, explain: 'Status reads the index. Once added, the file is resolved as far as Git knows.' },
      { text: 'The file is marked resolved, markers and all', correct: true, explain: 'Search for <<<<<<< before adding, and let tests or a pre-commit check catch leftovers.' },
    ],
  },
  {
    id: 'count-markers',
    type: 'numeric',
    prompt: 'A file has two separate conflicts. How many marker lines (<<<<<<<, =======, >>>>>>>) must you delete in the default style?',
    answer: 6,
    tolerance: 0,
    hint: 'Each conflict has three marker lines in the default merge style.',
    explain: '3 per conflict × 2 = 6. With zdiff3 there is a fourth (|||||||) per conflict, plus the base lines.',
  },
  {
    id: 'order-resolve',
    type: 'order',
    prompt: 'Put the steps of resolving a merge conflict in order.',
    items: ['git merge feature stops with CONFLICT', 'git status lists the unmerged files', 'Edit each file and remove the markers', 'Run the tests', 'git add the files, then git commit'],
    explain: 'Resolve, check that the result actually works, then mark resolved and commit.',
  },
];

export const resolveExercise: Exercise = {
  id: 'resolve-conflicts',
  prompt:
    'Write `resolve(text, side)` that takes file content with Git conflict markers (default style) and returns the content with every conflict replaced by one side: `side` is "ours" (the lines between <<<<<<< and =======) or "theirs" (between ======= and >>>>>>>). Lines outside conflicts are kept.',
  starter: `def resolve(text, side):
    pass`,
  hints: [
    'Walk the lines with a small state: outside, in ours, or in theirs.',
    'A line starting with "<<<<<<<" switches to ours, "=======" to theirs, and ">>>>>>>" back to outside. Marker lines are never kept.',
  ],
  solution: `def resolve(text, side):
    out, state = [], "outside"
    for line in text.splitlines(keepends=True):
        if line.startswith("<<<<<<<"):
            state = "ours"
        elif line.startswith("=======") and state == "ours":
            state = "theirs"
        elif line.startswith(">>>>>>>") and state == "theirs":
            state = "outside"
        elif state == "outside" or state == side:
            out.append(line)
    return "".join(out)`,
  explanation:
    'This is what git checkout --ours / --theirs does for a whole file. It is fine for generated files such as lock files, but for code and configs read both sides: often the right answer combines them.',
  tests: `t = "model: logistic\\n<<<<<<< HEAD\\nlr: 0.02\\n=======\\nlr: 0.003\\n>>>>>>> tune-lr\\nepochs: 10\\n"
assert resolve(t, "ours") == "model: logistic\\nlr: 0.02\\nepochs: 10\\n"
assert resolve(t, "theirs") == "model: logistic\\nlr: 0.003\\nepochs: 10\\n"
two = "a\\n<<<<<<< HEAD\\nb\\n=======\\nB\\n>>>>>>> x\\nc\\n<<<<<<< HEAD\\n=======\\nD\\nE\\n>>>>>>> x\\n"
assert resolve(two, "ours") == "a\\nb\\nc\\n"
assert resolve(two, "theirs") == "a\\nB\\nc\\nD\\nE\\n"
assert resolve("no conflicts\\n", "ours") == "no conflicts\\n"`,
};
