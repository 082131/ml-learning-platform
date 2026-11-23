import type { LessonMeta } from '@/lib/types';

export default {
  id: 'automation/scheduling/apis-retries',
  title: 'Calling APIs reliably: retries, backoff and rate limits',
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Tell transient errors (timeouts, 429, 5xx) from permanent ones (400, 401, 404) and retry only the first',
    'Compute exponential backoff with a cap, and explain why full jitter prevents a thundering herd',
    'Honour Retry-After and rate limits, and always set a request timeout',
    'Retry requests that change things safely, with idempotency keys',
  ],
  prerequisites: ['automation/scheduling/cron-schedules'],
  concepts: ['transient-error', 'exponential-backoff', 'jitter', 'retry-after', 'thundering-herd', 'idempotency-key', 'rate-limit'],
  references: [
    { title: 'AWS Architecture Blog: Exponential Backoff And Jitter', url: 'https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/' },
    { title: 'urllib3: Retry', url: 'https://urllib3.readthedocs.io/en/stable/reference/urllib3.util.html#urllib3.util.Retry', version: '2.8.0' },
    { title: 'tenacity documentation', url: 'https://tenacity.readthedocs.io/en/latest/', version: '9.2.1' },
    { title: 'RFC 9110, section 10.2.3: Retry-After', url: 'https://www.rfc-editor.org/rfc/rfc9110#field.retry-after' },
    { title: 'RFC 6585, section 4: 429 Too Many Requests', url: 'https://www.rfc-editor.org/rfc/rfc6585#section-4' },
  ],
} satisfies LessonMeta;
