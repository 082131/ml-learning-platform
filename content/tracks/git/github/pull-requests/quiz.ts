import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'pr-is',
    type: 'choice',
    prompt: 'What is a pull request, in Git terms?',
    options: [
      { text: 'A special commit type that GitHub adds to the repository', correct: false, explain: 'PRs are not stored in the Git objects. They live on GitHub, next to the repository.' },
      { text: 'A request for GitHub to run git pull on your laptop', correct: false, explain: 'The name is historical: you ask the maintainers to pull your branch into theirs.' },
      { text: 'A GitHub page for merging one branch into another, with review', correct: true, explain: 'It compares base and head branches, shows the diff, and collects comments, reviews and checks.' },
    ],
  },
  {
    id: 'up-to-date',
    type: 'choice',
    prompt: 'Protection requires branches to be up to date before merging. CI passed on your PR, but main moved on. Why does GitHub block the merge?',
    options: [
      { text: 'CI tested your branch without main’s new commits', correct: true, explain: 'Each side can pass alone and fail together. Updating the branch re-runs CI on the combined code.' },
      { text: 'The diff on the PR page is out of date and needs to be refreshed', correct: false, explain: 'The diff refreshes itself. The rule is about what CI tested.' },
      { text: 'A merge commit cannot be created when the branches have diverged', correct: false, explain: 'Diverged branches merge with a merge commit all the time; this rule is stricter on purpose.' },
    ],
  },
  {
    id: 'codeowners-last',
    type: 'choice',
    prompt: 'CODEOWNERS has "*.py @ml-team" on line 2 and "/src/serving/ @platform-team" on line 4. Who owns src/serving/app.py?',
    options: [
      { text: '@ml-team and @platform-team, since both lines match', correct: false, explain: 'Owners are not combined. Only one line decides.' },
      { text: '@platform-team, because the last matching line wins', correct: true, explain: 'Order matters: put broad patterns first and specific ones later.' },
      { text: '@ml-team, because file-type rules beat folder rules', correct: false, explain: 'There is no ranking of pattern types; position in the file decides.' },
    ],
  },
  {
    id: 'pr-size',
    type: 'numeric',
    prompt: 'A team’s rule is "at most 400 changed lines per PR". A change touches 1,100 lines. At least how many PRs should it be split into?',
    answer: 3,
    tolerance: 0,
    hint: 'Divide and round up.',
    explain: '1,100 / 400 = 2.75, so 3. Splitting by concern (refactor, feature, tests) usually gives better PRs than splitting by size.',
  },
  {
    id: 'order-pr',
    type: 'order',
    prompt: 'Put the life of a pull request in order.',
    items: ['Create a branch and commit', 'Push the branch and open the PR', 'CI runs and reviewers comment', 'Push fixes to the same branch', 'Merge once approved and green, then delete the branch'],
    explain: 'Everything happens on the branch until the final merge into main.',
  },
];

export const ownersExercise: Exercise = {
  id: 'codeowners-match',
  prompt:
    'Write `owners_for(lines, path)` for a simplified CODEOWNERS. Each line is "pattern owner owner ..." (blank lines and lines starting with # are skipped; a pattern with no owners means "no owner"). Patterns: "*" matches every path; "*.ext" matches files ending in .ext; "/dir/" matches paths starting with dir/; "dir/" matches paths with a dir folder at any depth. The last matching line wins. Return its list of owners, or [] if none matches.',
  starter: `def owners_for(lines, path):
    pass`,
  hints: [
    'Split each line on whitespace: the first part is the pattern, the rest are owners.',
    'Check the pattern kinds in turn; for "dir/" test path.startswith("dir/") or "/dir/" in "/" + path.',
  ],
  solution: `def owners_for(lines, path):
    result = []
    for line in lines:
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        pattern, *owners = line.split()
        if pattern == "*":
            hit = True
        elif pattern.startswith("*."):
            hit = path.endswith(pattern[1:])
        elif pattern.startswith("/") and pattern.endswith("/"):
            hit = path.startswith(pattern[1:])
        elif pattern.endswith("/"):
            hit = ("/" + path).find("/" + pattern) >= 0
        else:
            hit = path == pattern.lstrip("/")
        if hit:
            result = owners
    return result`,
  explanation:
    'Because the last match wins, a CODEOWNERS file reads from general to specific. A line with a pattern and no owners removes ownership for those paths, which is how vendored code is often excluded.',
  tests: `rules = ["# owners", "*  @ada", "*.py  @ml-team", "/data/  @data-team", "/src/serving/  @platform-team @ada", "docs/  @docs-team", "/src/serving/vendor/"]
assert owners_for(rules, "README.md") == ["@ada"]
assert owners_for(rules, "train.py") == ["@ml-team"]
assert owners_for(rules, "src/serving/app.py") == ["@platform-team", "@ada"]
assert owners_for(rules, "src/serving/vendor/lib.py") == []
assert owners_for(rules, "data/raw.csv") == ["@data-team"]
assert owners_for(rules, "src/data/load.py") == ["@ml-team"]
assert owners_for(rules, "project/docs/index.md") == ["@docs-team"]
assert owners_for([], "a.py") == []`,
};
