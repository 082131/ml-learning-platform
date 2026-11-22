import type { LessonMeta } from '@/lib/types';

export default {
  id: 'git/branching/merge-conflicts',
  title: 'Resolving merge conflicts',
  level: 'intermediate',
  minutes: 40,
  kind: 'lesson',
  objectives: [
    'Explain when a three-way merge succeeds and when it conflicts',
    'Read conflict markers, including the diff3 and zdiff3 styles',
    'Resolve a conflict during a merge, a rebase or a cherry-pick, and finish or abort it',
    'Reduce conflicts in ML repositories (notebooks, configs, lock files)',
  ],
  prerequisites: ['git/branching/merge-rebase'],
  concepts: ['merge-conflict', 'conflict-markers', 'three-way-merge'],
  references: [
    { title: 'Pro Git: Advanced Merging', url: 'https://git-scm.com/book/en/v2/Git-Tools-Advanced-Merging' },
    { title: 'git-merge: How conflicts are presented', url: 'https://git-scm.com/docs/git-merge#_how_conflicts_are_presented', version: 'Git 2.43' },
    { title: 'git-merge-file documentation', url: 'https://git-scm.com/docs/git-merge-file', version: 'Git 2.43' },
    { title: 'nbdime: diffing and merging Jupyter notebooks', url: 'https://nbdime.readthedocs.io/' },
  ],
} satisfies LessonMeta;
