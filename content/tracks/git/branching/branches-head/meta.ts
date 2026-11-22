import type { LessonMeta } from '@/lib/types';

export default {
  id: 'git/branching/branches-head',
  title: 'Branches, HEAD and detached HEAD',
  level: 'intermediate',
  minutes: 35,
  kind: 'lesson',
  objectives: [
    'Explain a branch as a movable pointer to a commit, and HEAD as a pointer to the current branch',
    'Create, switch and delete branches, and predict which branch a new commit moves',
    'Recognise a detached HEAD, and keep work made there',
    'Read commit ranges such as HEAD~2 and main..feature',
  ],
  prerequisites: ['git/foundations/objects-hashes'],
  concepts: ['branch', 'head-ref', 'detached-head', 'commit-ancestry'],
  references: [
    { title: 'Pro Git: Git Branching, Branches in a Nutshell', url: 'https://git-scm.com/book/en/v2/Git-Branching-Branches-in-a-Nutshell' },
    { title: 'git-switch documentation', url: 'https://git-scm.com/docs/git-switch', version: 'Git 2.43' },
    { title: 'gitrevisions: specifying revisions and ranges', url: 'https://git-scm.com/docs/gitrevisions', version: 'Git 2.43' },
  ],
} satisfies LessonMeta;
