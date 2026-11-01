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
  concepts: ['canary-release', 'feature-flag', 'rollback', 'eval-set', 'latency-percentile', 'guardrail'],
  references: [
    {
      title: 'Google SRE Workbook: Canarying releases',
      url: 'https://sre.google/workbook/canarying-releases/',
    },
    {
      title: 'OpenTelemetry semantic conventions for generative AI (spans and metrics for model calls)',
      url: 'https://opentelemetry.io/docs/specs/semconv/gen-ai/',
    },
    {
      title: 'Anthropic: Define success criteria and build evaluations',
      url: 'https://docs.anthropic.com/en/docs/test-and-evaluate/develop-tests',
    },
  ],
} satisfies LessonMeta;
