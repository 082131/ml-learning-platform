import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ai/usage/pretrained-apis',
  title: 'Using pretrained models via libraries and APIs',
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Call a hosted model API, read its response and usage, and handle rate-limit and server errors with retries',
    'Run a small pretrained model locally with a library',
    'Compare hosted and local models on cost, latency, quality and data privacy',
  ],
  prerequisites: ['ai/llm/transformers-llms', 'ai/fundamentals/ai-landscape'],
  concepts: [],
} satisfies LessonMeta;
