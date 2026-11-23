import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'version-pick',
    type: 'choice',
    prompt: 'Since v1.0.0, main has "feat: add evaluate()", "docs: explain evaluation" and "fix: seed the split". What is the next version?',
    options: [
      { text: '1.0.1, because one of the commits is a fix', correct: false, explain: 'The highest bump wins, and feat is a minor bump.' },
      { text: '2.0.0, because a new public function changes the API', correct: false, explain: 'Adding a function is backward compatible. Only breaking changes bump MAJOR.' },
      { text: '1.1.0, because feat is the highest bump and nothing breaks', correct: true, explain: 'feat → minor; fix and docs do not raise it further.' },
    ],
  },
  {
    id: 'tag-where',
    type: 'choice',
    prompt: 'Where should the v1.1.0 tag point?',
    options: [
      { text: 'At the release commit on main, after the release PR merged', correct: true, explain: 'Tag what was reviewed and tested, on the branch users get. Then git describe on main prints v1.1.0.' },
      { text: 'At the last commit of the feature branch, before the merge', correct: false, explain: 'With squash merging, that commit never reaches main, so the tag would name code main does not contain.' },
      { text: 'At whatever HEAD is when you remember to tag', correct: false, explain: 'A release must name a specific, reviewed commit; tagging later can include unreleased work.' },
    ],
  },
  {
    id: 'docs-same-pr',
    type: 'choice',
    prompt: 'Why do the README and changelog updates belong in the feature PR rather than a later docs PR?',
    options: [
      { text: 'GitHub refuses to merge a feature PR that has no documentation files', correct: false, explain: 'GitHub has no such rule, though a team can add a CI check for it.' },
      { text: 'The reviewer checks code and docs together, so main stays documented', correct: true, explain: 'Every commit on main is releasable with correct docs. A "later" docs PR is often never written.' },
      { text: 'Documentation commits are not allowed on main by branch protection', correct: false, explain: 'Branch protection treats all commits alike.' },
    ],
  },
  {
    id: 'commits-on-main',
    type: 'numeric',
    prompt: 'The feature PR has 2 commits and the release PR has 1. Both are squash-merged. How many new commits does main get?',
    answer: 2,
    tolerance: 0,
    hint: 'Squash merging makes one commit per PR.',
    explain: 'One squash commit for the feature PR and one for the release PR.',
  },
  {
    id: 'order-capstone',
    type: 'order',
    prompt: 'Put the capstone steps in order.',
    items: ['Branch from main and commit the feature with tests and docs', 'Rebase on origin/main and push the branch', 'Open the PR; CI and review', 'Squash-merge into main', 'Tag the release commit and publish the GitHub release'],
    explain: 'Branch, prepare, review, integrate, release.',
  },
];

export const changelogExercise: Exercise = {
  id: 'changelog-section',
  prompt:
    'Write `changelog_section(version, date, messages)` that turns Conventional Commits messages into a Keep a Changelog section. Start with "## [<version>] - <date>". Group descriptions (the text after ": ", with the first letter capitalized) under "### Added" (feat), "### Changed" (perf, and any breaking change, prefixed "**Breaking:** ") and "### Fixed" (fix), in that order, each item as "- <text>", with a blank line before each heading. Skip other types and empty groups. Return the text joined with newlines.',
  starter: `def changelog_section(version, date, messages):
    pass`,
  hints: [
    'Parse the first line with re.match(r"^(\\w+)(\\([^)]*\\))?(!)?: (.+)$", line); a "BREAKING CHANGE: " line in the body also marks it breaking.',
    'Collect lists per group in a dict that keeps insertion order: {"Added": [], "Changed": [], "Fixed": []}.',
  ],
  solution: `import re

def changelog_section(version, date, messages):
    groups = {"Added": [], "Changed": [], "Fixed": []}
    for msg in messages:
        lines = msg.split("\\n")
        m = re.match(r"^(\\w+)(\\([^)]*\\))?(!)?: (.+)$", lines[0])
        if not m:
            continue
        kind, bang, text = m.group(1), m.group(3), m.group(4)
        text = text[0].upper() + text[1:]
        breaking = bool(bang) or any(l.startswith("BREAKING CHANGE: ") for l in lines[1:])
        if breaking:
            groups["Changed"].append("**Breaking:** " + text)
        elif kind == "feat":
            groups["Added"].append(text)
        elif kind == "perf":
            groups["Changed"].append(text)
        elif kind == "fix":
            groups["Fixed"].append(text)
    out = [f"## [{version}] - {date}"]
    for name, items in groups.items():
        if items:
            out += ["", f"### {name}"] + [f"- {t}" for t in items]
    return "\\n".join(out)`,
  explanation:
    'Release tools generate exactly this draft. A person then edits it for users: merging related items, adding migration notes for breaking changes, and linking issues.',
  tests: `r = changelog_section("1.1.0", "2026-03-02", ["feat: add evaluate()", "docs: explain it", "fix(split): seed the shuffle", "perf: cache features"])
assert r == "## [1.1.0] - 2026-03-02\\n\\n### Added\\n- Add evaluate()\\n\\n### Changed\\n- Cache features\\n\\n### Fixed\\n- Seed the shuffle", r
b = changelog_section("2.0.0", "2026-04-01", ["feat!: return probabilities", "refactor: rename\\n\\nBREAKING CHANGE: load_model is gone"])
assert b == "## [2.0.0] - 2026-04-01\\n\\n### Changed\\n- **Breaking:** Return probabilities\\n- **Breaking:** Rename", b
assert changelog_section("1.0.1", "2026-01-02", ["chore: deps"]) == "## [1.0.1] - 2026-01-02"`,
};
