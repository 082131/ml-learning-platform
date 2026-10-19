import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ai/apps/ai-apis',
  title: 'Building AI APIs and connecting frontends',
  level: 'advanced',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Wrap a model call in an API endpoint',
    'Stream responses to a frontend',
    'Handle timeouts, rate limits and errors',
  ],
  prerequisites: ['ai/usage/pretrained-apis'],
  concepts: [],
} satisfies LessonMeta;
