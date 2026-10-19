import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ai/ops/deploy-monitor',
  title: 'Deploying and monitoring AI apps',
  level: 'advanced',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Deploy an AI feature behind a version flag',
    'Monitor quality, latency and cost in production',
    'Roll back a bad prompt or model change',
  ],
  prerequisites: ['ai/ops/latency-cost-security', 'ai/reliability/evals-guardrails'],
  concepts: [],
} satisfies LessonMeta;
