import type { LessonMeta } from '@/lib/types';

export default {
  id: 'git/capstone/release-ml-repo',
  title: 'Capstone: ship a feature and release v1.1.0',
  level: 'advanced',
  minutes: 60,
  kind: 'capstone',
  objectives: [
    'Carry a change from a branch to a tagged release, the way a team does',
    'Keep a branch current with rebase before review, and merge it through a pull request',
    'Choose the next version from the commit history and write its changelog',
    'Ship the documentation and the CI checks with the code',
  ],
  prerequisites: ['git/releases/ml-versioning', 'git/docs/docs-sites'],
  concepts: ['pull-request', 'semantic-versioning', 'changelog', 'continuous-integration'],
  references: [
    { title: 'GitHub flow', url: 'https://docs.github.com/en/get-started/using-github/github-flow' },
    { title: 'Semantic Versioning 2.0.0', url: 'https://semver.org/spec/v2.0.0.html', version: '2.0.0' },
    { title: 'Keep a Changelog 1.1.0', url: 'https://keepachangelog.com/en/1.1.0/', version: '1.1.0' },
  ],
} satisfies LessonMeta;
