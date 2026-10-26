import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ai/ops/deploy-monitor',
  title: 'Deploying and monitoring AI apps',
  level: 'advanced',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Release a prompt or model change behind a flag to a share of traffic',
    'Monitor quality, latency, cost and error rates in production, and alert on changes',
    'Compare a new version with the current one on the evaluation set before and after release',
    'Roll back a bad prompt or model change quickly',
  ],
  prerequisites: ['ai/ops/latency-cost-security', 'ai/reliability/evals-guardrails'],
  concepts: [],
} satisfies LessonMeta;
