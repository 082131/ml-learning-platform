import type { GlossaryTerm } from '@/lib/types';

// Glossary terms for the automation/events chapter (merged into the glossary by content/index.ts).
export default [
  {
    id: 'webhook',
    term: 'Webhook',
    short: 'An HTTP request a service sends to a URL you register when something happens (a push, a payment, a new file), so your automation reacts instead of polling.',
    introducedIn: 'automation/events/webhooks',
  },
  {
    id: 'hmac',
    term: 'HMAC',
    short: 'A hash-based message authentication code: a keyed hash (here SHA-256) of a message. Matching it proves the sender knew the shared secret and the message was not altered.',
    introducedIn: 'automation/events/webhooks',
    aliases: ['HMAC-SHA256', 'webhook signature'],
  },
  {
    id: 'at-least-once-delivery',
    term: 'At-least-once delivery',
    short: 'A delivery guarantee where every event arrives, possibly more than once. Receivers must deduplicate to act exactly once.',
    introducedIn: 'automation/events/webhooks',
  },
  {
    id: 'message-queue',
    term: 'Message queue',
    short: 'A buffer between the code that receives work and the workers that do it (Redis, SQS, RabbitMQ, a database table). It lets a webhook answer at once and survives spikes.',
    introducedIn: 'automation/events/webhooks',
  },
  {
    id: 'human-in-the-loop',
    term: 'Human in the loop',
    short: 'A design in which an automated system pauses for a person to approve, edit or reject an action before it takes effect.',
    introducedIn: 'automation/events/agent-guardrails',
    aliases: ['HITL', 'approval step'],
  },
  {
    id: 'tool-risk-tier',
    term: 'Tool risk tier',
    short: 'A classification of an agent’s tools by what they can do (read, reversible write, destructive, external send), used to decide which calls run alone and which need approval.',
    introducedIn: 'automation/events/agent-guardrails',
  },
] satisfies GlossaryTerm[];
