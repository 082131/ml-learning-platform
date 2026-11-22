import type { LessonMeta } from '@/lib/types';

export default {
  id: 'git/github/remotes',
  title: 'Remotes: clone, fetch, pull and push',
  level: 'intermediate',
  minutes: 40,
  kind: 'lesson',
  objectives: [
    'Explain remotes and remote-tracking branches such as origin/main',
    'Read ahead/behind counts and decide whether a push will be accepted',
    'Choose between pull with merge, pull with rebase and fetch-then-decide',
    'Use --force-with-lease instead of --force, and know when neither is acceptable',
  ],
  prerequisites: ['git/branching/merge-conflicts'],
  concepts: ['remote', 'remote-tracking-branch', 'upstream-branch', 'force-push'],
  references: [
    { title: 'Pro Git: Working with Remotes', url: 'https://git-scm.com/book/en/v2/Git-Basics-Working-with-Remotes' },
    { title: 'Pro Git: Remote Branches', url: 'https://git-scm.com/book/en/v2/Git-Branching-Remote-Branches' },
    { title: 'git-push documentation (--force-with-lease)', url: 'https://git-scm.com/docs/git-push', version: 'Git 2.43' },
    { title: 'git-pull documentation', url: 'https://git-scm.com/docs/git-pull', version: 'Git 2.43' },
  ],
} satisfies LessonMeta;
