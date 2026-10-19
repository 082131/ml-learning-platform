import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ai/ops/latency-cost-security',
  title: 'Caching, latency, cost, privacy and security',
  level: 'advanced',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Estimate the cost and latency of an AI feature from token counts',
    'Cache responses safely',
    'Identify privacy and prompt-injection risks and mitigate them',
  ],
  prerequisites: ['ai/apps/ai-apis'],
  concepts: [],
} satisfies LessonMeta;
