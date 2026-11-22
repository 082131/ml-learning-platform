import type { LessonMeta } from '@/lib/types';

export default {
  id: 'git/branching/undoing-changes',
  title: 'Undoing things: restore, reset, revert, reflog and stash',
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Pick the right command to undo a change in the working tree, the staging area or a commit',
    'Explain what reset --soft, --mixed and --hard each change',
    'Undo a pushed commit safely with revert, and an unpushed one with reset or amend',
    'Recover "lost" commits from the reflog, and set work aside with stash',
  ],
  prerequisites: ['git/branching/merge-rebase'],
  concepts: ['git-reset', 'git-revert', 'reflog', 'stash', 'amend'],
  references: [
    { title: 'Pro Git: Undoing Things', url: 'https://git-scm.com/book/en/v2/Git-Basics-Undoing-Things' },
    { title: 'Pro Git: Reset Demystified', url: 'https://git-scm.com/book/en/v2/Git-Tools-Reset-Demystified' },
    { title: 'git-reflog documentation', url: 'https://git-scm.com/docs/git-reflog', version: 'Git 2.43' },
    { title: 'git-stash documentation', url: 'https://git-scm.com/docs/git-stash', version: 'Git 2.43' },
  ],
} satisfies LessonMeta;
