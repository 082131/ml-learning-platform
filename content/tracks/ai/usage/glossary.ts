import type { GlossaryTerm } from '@/lib/types';

// Glossary terms for the ai/usage chapter (merged into the glossary by content/index.ts).
export default [
  {
    id: 'api-key',
    term: 'API key',
    short: 'A secret string that identifies your account to a provider’s API; whoever has it can spend your money.',
    long: 'Keep it in an environment variable or a secret manager on the server. Never put it in browser code, a mobile app or a repository.',
    introducedIn: 'ai/usage/pretrained-apis',
    aliases: ['API keys', 'API token'],
  },
  {
    id: 'rate-limit',
    term: 'Rate limit',
    short: 'A cap on how many requests (or tokens) you may send per minute; requests above it get HTTP 429 Too Many Requests.',
    long: 'Providers usually say how long to wait in a Retry-After header. Limits protect shared capacity and your budget.',
    introducedIn: 'ai/usage/pretrained-apis',
    aliases: ['rate limits', 'rate limited', '429', 'Retry-After'],
  },
  {
    id: 'exponential-backoff',
    term: 'Exponential backoff',
    short: 'Waiting longer after each failed attempt (for example 1 s, 2 s, 4 s, 8 s) before retrying.',
    long: 'Doubling the wait gives a struggling server room to recover. It is combined with a cap on the wait, a limit on attempts and jitter.',
    introducedIn: 'ai/usage/pretrained-apis',
    aliases: ['backoff'],
  },
  {
    id: 'jitter',
    term: 'Jitter',
    short: 'Randomness added to retry waits so that many clients that failed together don’t all retry at the same moment.',
    long: '“Full jitter” waits a uniform random time between 0 and the exponential backoff delay.',
    introducedIn: 'ai/usage/pretrained-apis',
  },
] satisfies GlossaryTerm[];
