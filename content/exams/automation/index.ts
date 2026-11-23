import type { ExamDef } from '@/lib/exam/types';
import { tasks } from './handson';
import { questions } from './questions';

export const automationExam: ExamDef = {
  track: 'automation',
  title: 'Automation for ML and AI Engineers certification exam',
  summary:
    'Scenario questions at the level of the GitHub Actions and Astronomer Apache Airflow 3 certifications and the orchestration domain of AWS MLA-C01, extended with the scripting, scheduling, reliability and agent practice of this track: what to automate, cron, retries and rerun safety, ML CI, model delivery gates, DAGs and backfills, webhooks and agent guardrails.',
  certifications: [
    {
      name: 'GitHub Actions',
      vendor: 'GitHub',
      url: 'https://resources.github.com/learn/certifications/',
      format:
        'Multiple-choice exam on authoring and maintaining workflows, consuming workflows, authoring and maintaining actions, and managing GitHub Actions in an organization.',
    },
    {
      name: 'Astronomer Certification for Apache Airflow 3 Fundamentals',
      vendor: 'Astronomer',
      url: 'https://www.astronomer.io/certification/',
      format:
        'Multiple-choice exam on Airflow concepts: DAGs and tasks, scheduling and timetables, catchup and backfills, task dependencies and trigger rules, and the Airflow 3 architecture.',
    },
    {
      name: 'AWS Certified Machine Learning Engineer – Associate (MLA-C01)',
      vendor: 'AWS',
      url: 'https://aws.amazon.com/certification/certified-machine-learning-engineer-associate/',
      format:
        'Domain 3, deployment and orchestration of ML workflows, covers CI/CD pipelines for models, orchestration, and deployment strategies such as canary and blue/green releases.',
    },
  ],
  domains: [
    { id: 'plan', title: 'Choosing and scripting automation', count: 12, maps: 'Track content: toil, break-even, CLI scripts' },
    { id: 'schedule', title: 'Schedules and cron', count: 14, maps: 'GitHub Actions: workflow triggers · Airflow: scheduling' },
    { id: 'reliable', title: 'Retries, idempotency and rerun safety', count: 16, maps: 'Airflow: task retries and idempotency' },
    { id: 'ci', title: 'CI for ML with GitHub Actions', count: 16, maps: 'GitHub Actions: authoring and securing workflows · MLA-C01 Domain 3' },
    { id: 'delivery', title: 'Model delivery and release gates', count: 12, maps: 'MLA-C01 Domain 3: deployment strategies' },
    { id: 'orchestrate', title: 'DAG orchestration and backfills', count: 18, maps: 'Airflow 3 Fundamentals: DAGs, timetables, catchup, backfills' },
    { id: 'events', title: 'Webhooks and agent guardrails', count: 12, maps: 'Track content: webhooks, at-least-once delivery, agent controls' },
  ],
  minutes: 150,
  passPercent: 75,
  questions,
  handsOn: { minutes: 120, passPercent: 70, tasks },
};
