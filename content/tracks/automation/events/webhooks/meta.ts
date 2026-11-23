import type { LessonMeta } from '@/lib/types';

export default {
  id: 'automation/events/webhooks',
  title: 'Webhooks and event-driven automation',
  level: 'advanced',
  minutes: 40,
  kind: 'lesson',
  objectives: [
    'Choose between schedules, polling and events for an automation',
    'Verify webhook signatures with HMAC-SHA256 over the raw body, in constant time',
    'Answer within the sender’s timeout by queueing work, and deduplicate at-least-once deliveries',
    'Place workflow tools (GitHub Actions events, n8n, Zapier, Make) correctly in an ML system',
  ],
  prerequisites: ['automation/scheduling/apis-retries'],
  concepts: ['webhook', 'hmac', 'at-least-once-delivery', 'message-queue', 'idempotent'],
  references: [
    { title: 'GitHub Docs: Validating webhook deliveries', url: 'https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries' },
    { title: 'GitHub Docs: Handling failed webhook deliveries', url: 'https://docs.github.com/en/webhooks/using-webhooks/handling-failed-webhook-deliveries' },
    { title: 'GitHub Docs: Best practices for using webhooks', url: 'https://docs.github.com/en/webhooks/using-webhooks/best-practices-for-using-webhooks' },
    { title: 'Stripe Docs: Receive Stripe events in your webhook endpoint', url: 'https://docs.stripe.com/webhooks' },
    { title: 'RFC 2104: HMAC', url: 'https://www.rfc-editor.org/rfc/rfc2104' },
  ],
} satisfies LessonMeta;
