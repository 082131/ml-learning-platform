// Code for "Semantic versioning, tags and releases". The next-version and changelog logic (src/lib/git/semver.ts)
// is tested against the SemVer 2.0.0 precedence example and npm's documented range expansions in libs.test.ts.
// The release sandbox scenario is replayed in real Git 2.43 by sim.test.ts, including the annotated tag's id.
// The Python runner is checked under CPython by python-outputs.test.ts.
import { rangeExperiment, semverExperiment } from '@/lib/git/experiments';
import { gitSandboxExperiment } from '@/lib/git/sandbox';
import type { CodeExample } from '@/lib/types';

export const semver = semverExperiment('git-semver');
export const ranges = rangeExperiment('git-ranges');
export const release = gitSandboxExperiment('git-release', 'release');

export const precedenceRunner: CodeExample = {
  id: 'semver-precedence',
  language: 'python',
  run: 'pyodide',
  source: `def semver_key(version):
    """Sort key for SemVer 2.0.0 precedence (build metadata after + is ignored)."""
    core, _, pre = version.split("+")[0].partition("-")
    major, minor, patch = (int(x) for x in core.split("."))
    if not pre:
        return (major, minor, patch, 1, ())  # a release sorts after its pre-releases
    ids = tuple((0, int(p), "") if p.isdigit() else (1, 0, p) for p in pre.split("."))
    return (major, minor, patch, 0, ids)

versions = ["1.0.0", "1.0.0-rc.1", "1.0.0-beta.11", "1.0.0-alpha", "1.0.0-beta",
            "1.0.0-alpha.beta", "1.0.0-beta.2", "1.0.0-alpha.1", "0.9.12", "1.0.0+build.7"]
for v in sorted(versions, key=semver_key):
    print(v)

print(sorted(["1.10.0", "1.9.0", "1.2.0"]))                   # string sorting gets it wrong
print(sorted(["1.10.0", "1.9.0", "1.2.0"], key=semver_key))`,
  annotations: [
    {
      id: 'release-last',
      range: { line: 6 },
      kind: 'syntax',
      title: 'Release after pre-releases',
      what: '1.0.0-rc.1 comes before 1.0.0: a pre-release is a candidate for that version.',
      why: 'The 0/1 flag in the key puts every pre-release of a version before the release itself.',
    },
    {
      id: 'numeric',
      range: { line: 7 },
      kind: 'syntax',
      title: 'Identifier rules',
      what: 'Numeric identifiers compare as numbers and sort before alphanumeric ones; others compare as text.',
      why: 'That is why beta.2 < beta.11, and alpha.1 < alpha.beta. A shorter list of equal identifiers sorts first.',
    },
  ],
  expectedOutput: `0.9.12
1.0.0-alpha
1.0.0-alpha.1
1.0.0-alpha.beta
1.0.0-beta
1.0.0-beta.2
1.0.0-beta.11
1.0.0-rc.1
1.0.0
1.0.0+build.7
['1.10.0', '1.2.0', '1.9.0']
['1.2.0', '1.9.0', '1.10.0']`,
};

export const releaseShell: CodeExample = {
  id: 'release-shell',
  language: 'bash',
  source: `$ git tag -a v1.0.0 -m "First release"     # annotated: a tag object with tagger, date, message
$ git cat-file -p v1.0.0
object 1454ac673a09978b1d7916227e00bc29e84ff80e
type commit
tag v1.0.0
tagger Ada Lovelace <ada@example.com> 1767225600 +0000

First release
$ git push origin v1.0.0                    # tags are not pushed with branches
$ git describe                              # one commit later: nearest tag, commits since, short id
v1.0.0-1-gba02f5c
$ gh release create v1.0.0 --title "v1.0.0" --notes-file release-notes.md dist/*.whl`,
  annotations: [
    {
      id: 'describe',
      range: { line: 11 },
      kind: 'function',
      title: 'git describe',
      what: 'v1.0.0, then 1 commit since it, then g + the abbreviated commit id.',
      why: 'A readable build version for logs and model metadata: which release, and how far past it.',
    },
    {
      id: 'gh-release',
      range: { line: 12 },
      kind: 'function',
      title: 'gh release create',
      what: 'Creates a GitHub release from the tag, with notes and attached files (here, the built wheel).',
      why: 'A tag marks a commit; a release is GitHub’s page around it, with notes and downloads. Use --generate-notes to list merged PRs.',
    },
  ],
};

export const changelogMd: CodeExample = {
  id: 'changelog-md',
  language: 'markdown',
  source: `# Changelog
All notable changes to this project are documented here.
The format follows Keep a Changelog, and the project uses Semantic Versioning.

## [Unreleased]

## [1.1.0] - 2026-03-02
### Added
- Early stopping in \`train()\`, controlled by \`patience\` (default 5).
### Fixed
- \`predict()\` no longer fails on an empty batch.

## [1.0.0] - 2026-01-15
### Added
- First release: training, evaluation and batch prediction for the churn model.

[Unreleased]: https://github.com/ada/churn-model/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/ada/churn-model/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/ada/churn-model/releases/tag/v1.0.0`,
  annotations: [
    {
      id: 'unreleased',
      range: { line: 5 },
      kind: 'syntax',
      title: '[Unreleased]',
      what: 'Changes merged since the last release collect here.',
      why: 'At release time this heading becomes the new version, so the notes are written while the change is fresh.',
    },
    {
      id: 'groups',
      range: { line: 8 },
      kind: 'syntax',
      title: 'Change types',
      what: 'Added, Changed, Deprecated, Removed, Fixed, Security.',
      why: 'Written for users, not developers: what can they do now, and what must they change.',
    },
  ],
};

export const pythonSpecifiers: CodeExample = {
  id: 'python-specifiers',
  language: 'toml',
  source: `# pyproject.toml: version constraints (PEP 440) for a library
[project]
name = "churn-model"
version = "1.1.0"
dependencies = [
  "scikit-learn>=1.5,<2",   # any 1.x from 1.5: trust the library's SemVer promise
  "pandas~=2.2",            # compatible release: >=2.2, ==2.*
  "numpy>=1.26",            # lower bound only
]
# An application pins exact versions in a lock file (uv.lock, requirements.txt with ==) instead.`,
  annotations: [
    {
      id: 'compat',
      range: { line: 7, startCol: 3, endCol: 15 },
      kind: 'syntax',
      title: '~= (compatible release)',
      what: '~=2.2 means >=2.2 and ==2.*; ~=2.2.1 means >=2.2.1 and ==2.2.*.',
      why: 'The Python cousin of npm’s ~ and ^: accept fixes and features, refuse the next major.',
    },
  ],
};
