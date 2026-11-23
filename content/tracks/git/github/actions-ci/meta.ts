import type { LessonMeta } from '@/lib/types';

export default {
  id: 'git/github/actions-ci',
  title: 'GitHub Actions and continuous integration',
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Read a GitHub Actions workflow: triggers, jobs, steps and runners',
    'Expand a build matrix with include and exclude, and count its jobs',
    'Write a CI workflow that lints and tests a Python ML project on every pull request',
    'Use caching, secrets and required status checks correctly',
  ],
  prerequisites: ['git/github/pull-requests'],
  concepts: ['continuous-integration', 'github-actions', 'build-matrix', 'status-check'],
  references: [
    { title: 'GitHub Docs: Workflow syntax for GitHub Actions', url: 'https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions' },
    { title: 'GitHub Docs: Running variations of jobs in a workflow (matrix)', url: 'https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/running-variations-of-jobs-in-a-workflow' },
    { title: 'GitHub Docs: Using secrets in GitHub Actions', url: 'https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions' },
    { title: 'actions/setup-python README', url: 'https://github.com/actions/setup-python' },
  ],
} satisfies LessonMeta;
