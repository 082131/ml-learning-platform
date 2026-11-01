import type { GlossaryTerm } from '@/lib/types';

// Glossary terms for the ai/ops chapter (merged into the glossary by content/index.ts).
export default [
  {
    id: 'prompt-caching',
    term: 'Prompt caching',
    short:
      'A provider feature that stores the processed start of a prompt, so later requests with the same prefix are cheaper and faster to read.',
    long: 'Only an exact prefix match counts: put stable content (instructions, examples, tool definitions) first and changing content (the question) last. Cached reads are billed at a fraction of the input price.',
    introducedIn: 'ai/ops/latency-cost-security',
    aliases: ['prompt cache', 'prefix caching', 'cache_control'],
  },
  {
    id: 'response-cache',
    term: 'Response cache',
    short:
      'Your own store of past answers, keyed by the normalized request, so repeated questions skip the model entirely.',
    long: 'Safe for answers that don’t depend on the user or on time; it must be cleared when the documents or the prompt change.',
    introducedIn: 'ai/ops/latency-cost-security',
    aliases: ['answer cache', 'semantic cache'],
  },
  {
    id: 'least-privilege',
    term: 'Least privilege',
    short:
      'Giving a component only the permissions its current task needs, so a mistake or an attack can do as little as possible.',
    long: 'For AI agents: offer only the tools the task needs, scope their credentials to the current user, and require approval for actions with side effects.',
    introducedIn: 'ai/ops/latency-cost-security',
    aliases: ['principle of least privilege'],
  },
  {
    id: 'canary-release',
    term: 'Canary release',
    short:
      'Sending a small share of real traffic to a new version first, comparing it with the current one, and widening only if it holds up.',
    introducedIn: 'ai/ops/deploy-monitor',
    aliases: ['canary', 'canary deployment', 'staged rollout'],
  },
  {
    id: 'feature-flag',
    term: 'Feature flag',
    short:
      'A setting, changed without redeploying, that decides which version (of a prompt, model or feature) each request gets.',
    introducedIn: 'ai/ops/deploy-monitor',
    aliases: ['feature flags', 'flag'],
  },
  {
    id: 'rollback',
    term: 'Rollback',
    short: 'Switching traffic back to the previous known-good version when a new one misbehaves.',
    long: 'Fast when prompts, model names and settings are versioned configuration behind a flag; slow when they are hard-coded and need a full redeploy.',
    introducedIn: 'ai/ops/deploy-monitor',
    aliases: ['roll back', 'revert'],
  },
] satisfies GlossaryTerm[];
