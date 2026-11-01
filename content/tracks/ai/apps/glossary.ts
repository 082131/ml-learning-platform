import type { GlossaryTerm } from '@/lib/types';

// Glossary terms for the ai/apps chapter (merged into the glossary by content/index.ts).
export default [
  {
    id: 'http-endpoint',
    term: 'HTTP endpoint',
    short: 'A URL and method on your server (such as POST /api/ask) that accepts a request and returns a response.',
    long: 'An AI endpoint validates the input, calls the model with the server’s API key, and returns or streams the result. The browser only ever talks to your endpoint.',
    introducedIn: 'ai/apps/ai-apis',
    aliases: ['endpoint', 'API endpoint', 'route'],
  },
  {
    id: 'input-validation',
    term: 'Input validation',
    short: 'Checking a request’s shape, types and limits before doing any work, and rejecting it with a clear 4xx error if it fails.',
    introducedIn: 'ai/apps/ai-apis',
    aliases: ['request validation'],
  },
  {
    id: 'server-sent-events',
    term: 'Server-sent events (SSE)',
    short: 'A simple text format for a server to push a stream of events over one HTTP response: event and data lines, each event ended by a blank line.',
    long: 'Most model APIs stream replies this way, and your own endpoint can pass the stream on to the browser. Content type: text/event-stream.',
    introducedIn: 'ai/apps/ai-apis',
    aliases: ['SSE', 'event stream', 'text/event-stream'],
  },
  {
    id: 'time-to-first-token',
    term: 'Time to first token (TTFT)',
    short: 'How long after sending a request the first output token arrives.',
    long: 'It covers network time, queueing and reading the prompt (prefill). With streaming, it is when the user first sees text.',
    introducedIn: 'ai/apps/ai-apis',
    aliases: ['TTFT', 'first token'],
  },
] satisfies GlossaryTerm[];
