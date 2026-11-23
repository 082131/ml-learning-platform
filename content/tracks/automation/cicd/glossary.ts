import type { GlossaryTerm } from '@/lib/types';

// Glossary terms for the automation/cicd chapter (merged into the glossary by content/index.ts).
export default [
  {
    id: 'job-needs',
    term: 'Job dependencies (needs)',
    short: 'In GitHub Actions, needs: lists the jobs that must finish first. A job whose needed job failed or was skipped is skipped too, unless its if: uses always().',
    introducedIn: 'automation/cicd/ml-ci-pipelines',
    aliases: ['needs'],
  },
  {
    id: 'path-filter',
    term: 'Path filter',
    short: 'paths: or paths-ignore: on a workflow trigger: the workflow runs only when the changed files match. A skipped workflow reports no status at all.',
    introducedIn: 'automation/cicd/ml-ci-pipelines',
    aliases: ['paths-ignore'],
  },
  {
    id: 'smoke-test',
    term: 'Smoke test',
    short: 'A fast end-to-end run on a tiny input that checks the whole thing works at all, such as training on 2,000 rows in CI.',
    introducedIn: 'automation/cicd/ml-ci-pipelines',
  },
  {
    id: 'continuous-delivery',
    term: 'Continuous delivery (CD)',
    short: 'Every change that passes the automated checks is ready to release, and releasing is an automated, repeatable step. Continuous deployment goes further and releases without a manual approval.',
    introducedIn: 'automation/cicd/model-delivery',
    aliases: ['CD', 'continuous deployment'],
  },
  {
    id: 'deployment-environment',
    term: 'Deployment environment',
    short: 'A named target such as staging or production, with its own secrets and protection rules (required reviewers, wait timers, allowed branches).',
    introducedIn: 'automation/cicd/model-delivery',
  },
  {
    id: 'champion-challenger',
    term: 'Champion and challenger',
    short: 'The model in production (champion) and a newly trained candidate (challenger). The challenger replaces the champion only if it wins on the same evaluation.',
    introducedIn: 'automation/cicd/model-delivery',
  },
  {
    id: 'oidc-federation',
    term: 'OIDC federation',
    short: 'A CI job proves who it is to a cloud provider with a short-lived OpenID Connect token and gets temporary credentials, so no long-lived cloud keys are stored as secrets.',
    introducedIn: 'automation/cicd/model-delivery',
    aliases: ['workload identity federation'],
  },
] satisfies GlossaryTerm[];
