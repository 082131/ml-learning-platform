import type { LessonMeta } from '@/lib/types';

export default {
  id: 'git/releases/ml-versioning',
  title: 'Versioning data and models: Git LFS, DVC and model registries',
  level: 'advanced',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Explain why large binaries do not belong in plain Git history',
    'Describe what Git LFS and DVC store in Git (pointer files) and what they store elsewhere',
    'Link a model version to the exact code commit, data version, parameters and environment',
    'Choose between Git LFS, DVC, table formats and a model registry for a given artifact',
  ],
  prerequisites: ['git/releases/semver-releases'],
  concepts: ['git-lfs', 'dvc', 'pointer-file', 'model-registry', 'data-lineage'],
  references: [
    { title: 'Git LFS specification', url: 'https://github.com/git-lfs/git-lfs/blob/main/docs/spec.md' },
    { title: 'DVC documentation: Get started', url: 'https://dvc.org/doc/start' },
    { title: 'MLflow Model Registry', url: 'https://mlflow.org/docs/latest/model-registry.html' },
    { title: 'GitHub Docs: About large files on GitHub', url: 'https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github' },
  ],
} satisfies LessonMeta;
