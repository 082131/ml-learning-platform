import type { LessonMeta } from '@/lib/types';

export default {
  id: 'git/github/pull-requests',
  title: 'Pull requests, code review and branch protection',
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Run a change through a pull request: branch, push, open, review, update, merge',
    'Choose between GitHub’s merge, squash and rebase buttons',
    'Decide whether a pull request can merge under a set of branch protection rules',
    'Work out who must review a change from a CODEOWNERS file',
    'Give and receive review comments that improve code, including ML code',
  ],
  prerequisites: ['git/github/remotes'],
  concepts: ['pull-request', 'code-review', 'branch-protection', 'codeowners', 'workflow-strategy'],
  references: [
    { title: 'GitHub Docs: About pull requests', url: 'https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/about-pull-requests' },
    { title: 'GitHub Docs: About protected branches', url: 'https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches' },
    { title: 'GitHub Docs: About code owners', url: 'https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners' },
    { title: 'Google Engineering Practices: code review', url: 'https://google.github.io/eng-practices/review/' },
  ],
} satisfies LessonMeta;
