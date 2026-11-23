import type { LessonMeta } from '@/lib/types';

export default {
  id: 'git/releases/semver-releases',
  title: 'Semantic versioning, tags, releases and changelogs',
  level: 'advanced',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Apply Semantic Versioning 2.0.0, including pre-releases and the 0.y.z rule',
    'Compute the next version from Conventional Commits messages',
    'Tag a release with an annotated tag and publish it on GitHub',
    'Write a changelog entry in the Keep a Changelog format',
    'Read version constraints: npm caret and tilde ranges, and Python’s ~= and ==',
  ],
  prerequisites: ['git/github/actions-ci'],
  concepts: ['semantic-versioning', 'git-tag', 'annotated-tag', 'release', 'changelog', 'conventional-commits'],
  references: [
    { title: 'Semantic Versioning 2.0.0', url: 'https://semver.org/spec/v2.0.0.html', version: '2.0.0' },
    { title: 'Conventional Commits 1.0.0', url: 'https://www.conventionalcommits.org/en/v1.0.0/', version: '1.0.0' },
    { title: 'Keep a Changelog 1.1.0', url: 'https://keepachangelog.com/en/1.1.0/', version: '1.1.0' },
    { title: 'PEP 440: Version Identification and Dependency Specification', url: 'https://peps.python.org/pep-0440/' },
    { title: 'GitHub Docs: About releases', url: 'https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases' },
  ],
} satisfies LessonMeta;
