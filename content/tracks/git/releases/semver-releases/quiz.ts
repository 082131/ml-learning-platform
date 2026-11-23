import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'bump-kind',
    type: 'choice',
    prompt: 'Your library is at 2.3.1. You rename the argument n_estimators to n_trees in a public function, keeping no alias. What is the next version?',
    options: [
      { text: '2.4.0, since renaming an argument adds a new name', correct: false, explain: 'Old calls with n_estimators= now fail. Breaking a public API needs a major bump.' },
      { text: '3.0.0, because callers using the old name break', correct: true, explain: 'Any incompatible change to the public API bumps MAJOR. Keeping the old name as a deprecated alias would make it 2.4.0.' },
      { text: '2.3.2, because no behaviour changed', correct: false, explain: 'Behaviour for existing callers did change: their code raises TypeError.' },
    ],
  },
  {
    id: 'zero-major',
    type: 'choice',
    prompt: 'What does SemVer promise about versions 0.y.z?',
    options: [
      { text: 'The same as 1.y.z, but the project is younger', correct: false, explain: 'The spec says the opposite: no stability promise yet.' },
      { text: 'Nothing: anything may change at any time', correct: true, explain: 'Major version zero is for initial development. In practice many projects treat a 0.y bump as breaking, which is what npm’s ^0.2.3 assumes.' },
      { text: 'Only patch releases may contain breaking changes', correct: false, explain: 'SemVer gives no such rule for 0.y.z; the public API is simply not considered stable.' },
    ],
  },
  {
    id: 'lightweight',
    type: 'choice',
    prompt: 'Why use git tag -a for a release rather than a lightweight tag?',
    options: [
      { text: 'Lightweight tags cannot be pushed to GitHub', correct: false, explain: 'Both kinds push. GitHub releases work with either.' },
      { text: 'An annotated tag runs the tests before it is created', correct: false, explain: 'Git runs nothing. CI can be triggered by a tag push, of either kind.' },
      { text: 'It stores who tagged, when and why, as its own object', correct: true, explain: 'A lightweight tag is only a name for a commit. git describe also uses annotated tags by default.' },
    ],
  },
  {
    id: 'precedence',
    type: 'order',
    prompt: 'Sort these versions by SemVer precedence, lowest first.',
    items: ['1.9.0', '1.10.0-alpha', '1.10.0-alpha.2', '1.10.0-beta', '1.10.0', '2.0.0-rc.1'],
    explain: 'Numbers compare numerically (9 < 10), a pre-release sorts before its release, and alpha.2 > alpha because it has more identifiers.',
  },
  {
    id: 'caret-count',
    type: 'numeric',
    prompt: 'Of 1.2.2, 1.2.9, 1.3.0, 1.9.0 and 2.0.0, how many satisfy the npm range ^1.2.3?',
    answer: 3,
    tolerance: 0,
    hint: '^1.2.3 means >=1.2.3 and <2.0.0.',
    explain: '1.2.9, 1.3.0 and 1.9.0. 1.2.2 is below the lower bound and 2.0.0 is the next major.',
  },
];

export const nextVersionExercise: Exercise = {
  id: 'next-version',
  prompt:
    'Write `next_version(current, messages)` for versions "MAJOR.MINOR.PATCH" (no pre-releases) and Conventional Commits messages. A message whose first line is "type!: ..." or "type(scope)!: ...", or that contains a line starting with "BREAKING CHANGE: ", is a major bump; type feat is minor; fix and perf are patch; anything else is no release. Return the new version string, or `current` if nothing warrants a release.',
  starter: `def next_version(current, messages):
    pass`,
  hints: [
    'Find the type with a regular expression on the first line, such as r"^(\\w+)(\\([^)]*\\))?(!)?: ".',
    'Take the highest bump over all messages, then reset the lower parts to 0 (a minor bump of 1.4.2 is 1.5.0).',
  ],
  solution: `import re

def next_version(current, messages):
    rank = 0  # 0 none, 1 patch, 2 minor, 3 major
    for msg in messages:
        lines = msg.split("\\n")
        m = re.match(r"^(\\w+)(\\([^)]*\\))?(!)?: ", lines[0])
        if m and m.group(3) or any(l.startswith("BREAKING CHANGE: ") for l in lines[1:]):
            rank = max(rank, 3)
        elif m and m.group(1) == "feat":
            rank = max(rank, 2)
        elif m and m.group(1) in ("fix", "perf"):
            rank = max(rank, 1)
    major, minor, patch = (int(x) for x in current.split("."))
    if rank == 3:
        return f"{major + 1}.0.0"
    if rank == 2:
        return f"{major}.{minor + 1}.0"
    if rank == 1:
        return f"{major}.{minor}.{patch + 1}"
    return current`,
  explanation:
    'This is what semantic-release and release-please do by default: the commit messages decide the version, so a release can be fully automated. The messages also become the changelog.',
  tests: `assert next_version("1.4.2", ["fix: handle empty batches", "docs: typo"]) == "1.4.3"
assert next_version("1.4.2", ["feat: early stopping", "fix: x"]) == "1.5.0"
assert next_version("1.4.2", ["feat(api)!: return probabilities"]) == "2.0.0"
assert next_version("1.4.2", ["refactor: rename\\n\\nBREAKING CHANGE: load_model is removed"]) == "2.0.0"
assert next_version("1.4.2", ["chore: deps", "test: more"]) == "1.4.2"
assert next_version("0.9.9", ["perf: faster predict"]) == "0.9.10"
assert next_version("1.4.2", ["Update stuff"]) == "1.4.2"`,
};
