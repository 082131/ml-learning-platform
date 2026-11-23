import type { LessonMeta } from '@/lib/types';

export default {
  id: 'git/foundations/why-version-control',
  title: 'Version control and the three areas of Git',
  level: 'beginner',
  minutes: 40,
  kind: 'lesson',
  objectives: [
    'Explain what a version control system records and why ML projects need one',
    'Move a change from the working tree to the staging area to a commit, and read git status at each step',
    'Write a .gitignore that keeps data, checkpoints and secrets out of a repository',
    'Write commit messages that say what changed and why',
  ],
  prerequisites: [],
  concepts: ['version-control', 'repository', 'working-tree', 'staging-area', 'commit', 'gitignore'],
  references: [
    { title: 'Pro Git, 2nd edition: Getting Started and Git Basics (Chacon and Straub)', url: 'https://git-scm.com/book/en/v2' },
    { title: 'git-status documentation: short format', url: 'https://git-scm.com/docs/git-status#_short_format', version: 'Git 2.43' },
    { title: 'gitignore documentation', url: 'https://git-scm.com/docs/gitignore' },
    { title: 'How to Write a Git Commit Message (Chris Beams)', url: 'https://cbea.ms/git-commit/' },
  ],
} satisfies LessonMeta;
