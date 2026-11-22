import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'readme-first',
    type: 'choice',
    prompt: 'A visitor lands on your repository. What should the first lines of the README tell them?',
    options: [
      { text: 'The full list of modules and what each file contains', correct: false, explain: 'That belongs in reference docs, if anywhere. It does not help a visitor decide anything.' },
      { text: 'What the project does and for whom, in a sentence or two', correct: true, explain: 'Then how to install and run it. Readers decide in seconds whether to keep reading.' },
      { text: 'The history of the project and why the authors started it', correct: false, explain: 'Motivation helps, briefly, after the reader knows what the project is.' },
    ],
  },
  {
    id: 'comment-vs-docstring',
    type: 'choice',
    prompt: 'What belongs in a function’s docstring rather than in comments inside it?',
    options: [
      { text: 'How to call it: arguments, return value, errors, an example', correct: true, explain: 'The docstring is for callers and shows up in help(), IDEs and API docs. Comments explain tricky implementation details to maintainers.' },
      { text: 'A line-by-line explanation of the algorithm and its steps', correct: false, explain: 'Callers do not need it. Explain non-obvious lines with comments next to them.' },
      { text: 'The names of everyone who changed it, with dates and reasons', correct: false, explain: 'Git already records that (git log, git blame). Docs that copy it go stale.' },
    ],
  },
  {
    id: 'doctest-fail',
    type: 'choice',
    prompt: 'You change split() to return (test, train) instead of (train, test), and run pytest --doctest-modules. What happens?',
    options: [
      { text: 'Doctests only check that examples run without errors, so it passes', correct: false, explain: 'doctest compares the printed output exactly, not just whether it ran.' },
      { text: 'Nothing, because doctest skips functions that have tests elsewhere', correct: false, explain: 'doctest knows nothing about other tests. It runs every >>> example it finds.' },
      { text: 'The docstring example fails: its output no longer matches', correct: true, explain: 'That is the point: the documentation is tested, so it cannot silently drift from the code.' },
    ],
  },
  {
    id: 'model-card',
    type: 'choice',
    prompt: 'Which item is most specific to a model card, compared with a README?',
    options: [
      { text: 'Installation instructions for each supported platform', correct: false, explain: 'Every README has them. A model card is about the model’s behaviour.' },
      { text: 'Intended uses, out-of-scope uses, and metrics by segment', correct: true, explain: 'Model cards (Mitchell et al., 2019) document where a model should and should not be used, and how it performs for different groups.' },
      { text: 'The license of the code and of any bundled dependencies', correct: false, explain: 'Licenses belong in LICENSE and the README. A model card may mention the model’s license, but that is not its point.' },
    ],
  },
  {
    id: 'order-readme',
    type: 'order',
    prompt: 'Put these README sections in the order a newcomer needs them.',
    items: ['One-sentence description', 'Installation', 'Usage (quick start)', 'Model and results', 'Contributing', 'License'],
    explain: 'What it is, how to get it, how to use it, how good it is, how to help, what you may do with it.',
  },
];

export const docCheckExercise: Exercise = {
  id: 'docstring-params',
  prompt:
    'Write `check_docstring(params, docstring)` like a documentation linter. `params` lists the function’s parameter names; `docstring` is a Google-style docstring. Collect the names documented in its "Args:" section (an entry is a line indented one level below "Args:" that starts with a name, optionally followed by " (type)", then ":"). Return a dict with sorted lists "missing" (in params, not documented) and "extra" (documented, not in params). Ignore "self".',
  starter: `def check_docstring(params, docstring):
    pass`,
  hints: [
    'Find the line that is exactly "Args:" after stripping, then read lines until one is indented no deeper than "Args:" (or is a new section).',
    'Entry lines are indented more than "Args:" but less than their continuation lines; re.match(r"\\s*(\\w+)\\s*(\\(.*\\))?:", line) captures the name.',
  ],
  solution: `import re

def check_docstring(params, docstring):
    lines = docstring.splitlines()
    documented = []
    indent = lambda s: len(s) - len(s.lstrip())
    for i, line in enumerate(lines):
        if line.strip() == "Args:":
            base = indent(line)
            entry = None
            for l in lines[i + 1:]:
                if not l.strip():
                    continue
                if indent(l) <= base:
                    break
                if entry is None:
                    entry = indent(l)
                if indent(l) == entry:
                    m = re.match(r"\\s*\\*{0,2}(\\w+)\\s*(\\(.*\\))?:", l)
                    if m:
                        documented.append(m.group(1))
            break
    params = [p for p in params if p != "self"]
    return {
        "missing": sorted(p for p in params if p not in documented),
        "extra": sorted(d for d in documented if d not in params),
    }`,
  explanation:
    'This is the core of pydoclint and of ruff’s docstring rules: compare what the docs claim with the signature. Run it in CI and stale parameter docs become a failing check instead of a confused user.',
  tests: `good = """Split rows.

    Args:
        rows (list): The examples to split.
        test_size (float): Share of rows for the test set,
            between 0 and 1.
        seed (int): Seed for the shuffle.

    Returns:
        tuple: Train and test rows.
    """
assert check_docstring(["rows", "test_size", "seed"], good) == {"missing": [], "extra": []}
assert check_docstring(["rows", "test_fraction", "seed"], good) == {"missing": ["test_fraction"], "extra": ["test_size"]}
assert check_docstring(["self", "rows"], "Do it.\\n\\n    Args:\\n        rows: The rows.\\n") == {"missing": [], "extra": []}
assert check_docstring(["x"], "No sections.") == {"missing": ["x"], "extra": []}`,
};
