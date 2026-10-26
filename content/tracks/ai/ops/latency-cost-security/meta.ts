import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ai/ops/latency-cost-security',
  title: 'Caching, latency, cost, privacy and security',
  level: 'advanced',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Estimate the cost and latency of an AI feature from token counts and request volume',
    'Reduce cost and latency with caching, smaller models and shorter prompts, and measure the effect on quality',
    'Identify prompt-injection, data-leak and excessive-permission risks in an AI feature',
    'Mitigate them by treating model input and output as untrusted and limiting what tools can do',
  ],
  prerequisites: ['ai/apps/ai-apis', 'ai/agents/tool-calling'],
  concepts: [],
} satisfies LessonMeta;
