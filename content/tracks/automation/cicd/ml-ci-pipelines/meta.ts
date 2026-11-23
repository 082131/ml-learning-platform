import type { LessonMeta } from '@/lib/types';

export default {
  id: 'automation/cicd/ml-ci-pipelines',
  title: 'CI pipelines for ML projects',
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Design a CI workflow for an ML repository: lint, unit tests, data tests, a training smoke run, evaluation, packaging',
    'Predict which jobs run, fail or are skipped from needs, if and paths-ignore',
    'Pass artifacts between jobs and keep the pull request run fast',
    'Write data, smoke and behavioural tests that catch ML-specific breakage',
  ],
  prerequisites: ['automation/scheduling/rerun-safe-jobs', 'git/github/actions-ci'],
  concepts: ['continuous-integration', 'github-actions', 'job-needs', 'path-filter', 'smoke-test', 'status-check'],
  references: [
    { title: 'GitHub Docs: Using jobs in a workflow (needs)', url: 'https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/using-jobs-in-a-workflow' },
    { title: 'GitHub Docs: Expressions, status check functions', url: 'https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/evaluate-expressions-in-workflows-and-actions#status-check-functions' },
    { title: 'GitHub Docs: Workflow syntax, paths filters', url: 'https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions#onpushpull_requestpull_request_targetpathspaths-ignore' },
    { title: 'Breck et al., The ML Test Score (2017)', url: 'https://research.google/pubs/the-ml-test-score-a-rubric-for-ml-production-readiness-and-technical-debt-reduction/' },
  ],
} satisfies LessonMeta;
