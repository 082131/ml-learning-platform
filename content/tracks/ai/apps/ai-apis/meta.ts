import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ai/apps/ai-apis',
  title: 'Building AI APIs and connecting frontends',
  level: 'advanced',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Wrap a model call in an HTTP endpoint with input validation',
    'Stream a response to a frontend token by token',
    'Handle timeouts, rate limits and provider errors without losing the user’s request',
    'Keep API keys on the server and out of the browser',
  ],
  prerequisites: ['ai/usage/pretrained-apis', 'ai/prompting/structured-outputs'],
  concepts: [],
} satisfies LessonMeta;
