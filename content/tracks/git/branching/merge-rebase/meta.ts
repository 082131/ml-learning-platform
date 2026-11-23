import type { LessonMeta } from '@/lib/types';

export default {
  id: 'git/branching/merge-rebase',
  title: 'Merge, rebase, squash and cherry-pick',
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Find the merge base of two branches and predict whether a merge fast-forwards',
    'Compare merge commits, rebasing and squash merges by the history each leaves',
    'Explain why rebased commits get new ids, and when rewriting history is unsafe',
    'Copy a single commit to another branch with cherry-pick',
  ],
  prerequisites: ['git/branching/branches-head'],
  concepts: ['merge-base', 'fast-forward', 'three-way-merge', 'merge-commit', 'rebase', 'squash-merge', 'cherry-pick'],
  references: [
    { title: 'Pro Git: Basic Branching and Merging', url: 'https://git-scm.com/book/en/v2/Git-Branching-Basic-Branching-and-Merging' },
    { title: 'Pro Git: Rebasing (including The Perils of Rebasing)', url: 'https://git-scm.com/book/en/v2/Git-Branching-Rebasing' },
    { title: 'git-merge documentation', url: 'https://git-scm.com/docs/git-merge', version: 'Git 2.43' },
    { title: 'git-rebase documentation', url: 'https://git-scm.com/docs/git-rebase', version: 'Git 2.43' },
  ],
} satisfies LessonMeta;
