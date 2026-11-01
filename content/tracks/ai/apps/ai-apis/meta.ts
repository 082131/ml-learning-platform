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
  concepts: [
    'http-endpoint',
    'input-validation',
    'server-sent-events',
    'time-to-first-token',
    'api-key',
    'rate-limit',
  ],
  references: [
    {
      title: 'WHATWG HTML Standard: Server-sent events (the event stream format)',
      url: 'https://html.spec.whatwg.org/multipage/server-sent-events.html',
    },
    {
      title: 'FastAPI: StreamingResponse and request body validation',
      url: 'https://fastapi.tiangolo.com/advanced/custom-response/#streamingresponse',
    },
    {
      title: 'Anthropic: Streaming messages',
      url: 'https://docs.anthropic.com/en/docs/build-with-claude/streaming',
    },
    {
      title: 'MDN: Using readable streams (fetch response bodies)',
      url: 'https://developer.mozilla.org/en-US/docs/Web/API/Streams_API/Using_readable_streams',
    },
  ],
} satisfies LessonMeta;
