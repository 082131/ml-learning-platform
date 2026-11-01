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
  concepts: [
    'model-api',
    'api-key',
    'rate-limit',
    'exponential-backoff',
    'jitter',
    'pretrained-model',
    'token',
  ],
  references: [
    {
      title: 'Anthropic: Messages API reference',
      url: 'https://docs.anthropic.com/en/api/messages',
    },
    {
      title: 'Anthropic: API errors (429, 500, 529) and rate limits',
      url: 'https://docs.anthropic.com/en/api/errors',
    },
    {
      title: 'anthropic Python SDK (retries, timeouts, error classes)',
      url: 'https://github.com/anthropics/anthropic-sdk-python',
      version: '1.x',
    },
    {
      title: 'Hugging Face Transformers: pipelines',
      url: 'https://huggingface.co/docs/transformers/main_classes/pipelines',
    },
    {
      title: 'AWS Architecture Blog: Exponential backoff and jitter',
      url: 'https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/',
    },
    {
      title: 'RFC 9110: Retry-After header',
      url: 'https://www.rfc-editor.org/rfc/rfc9110#field.retry-after',
    },
  ],
} satisfies LessonMeta;
