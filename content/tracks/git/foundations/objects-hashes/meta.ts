import type { LessonMeta } from '@/lib/types';

export default {
  id: 'git/foundations/objects-hashes',
  title: 'Inside .git: objects, hashes and snapshots',
  level: 'beginner',
  minutes: 40,
  kind: 'lesson',
  objectives: [
    'Name the four Git object types and what each one stores',
    'Compute a blob id by hand from a file’s bytes, and check it against git hash-object',
    'Explain why changing one byte, a date or a parent gives a commit a new id',
    'Explain how unchanged files are shared between snapshots',
  ],
  prerequisites: ['git/foundations/why-version-control'],
  concepts: ['git-object', 'blob', 'tree-object', 'object-id', 'content-hash'],
  references: [
    { title: 'Pro Git: Git Internals, Git Objects', url: 'https://git-scm.com/book/en/v2/Git-Internals-Git-Objects' },
    { title: 'git-hash-object documentation', url: 'https://git-scm.com/docs/git-hash-object', version: 'Git 2.43' },
    { title: 'git-cat-file documentation', url: 'https://git-scm.com/docs/git-cat-file', version: 'Git 2.43' },
    { title: 'Hash function transition (SHA-256)', url: 'https://git-scm.com/docs/hash-function-transition' },
  ],
} satisfies LessonMeta;
