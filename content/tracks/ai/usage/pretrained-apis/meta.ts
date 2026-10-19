import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ai/usage/pretrained-apis',
  title: 'Using pretrained models via libraries and APIs',
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Call a hosted model API and handle its errors',
    'Run a pretrained model locally with a library',
    'Compare hosted and local use on cost, latency and privacy',
  ],
  prerequisites: ['ai/llm/transformers-llms'],
  concepts: [],
} satisfies LessonMeta;
