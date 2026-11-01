import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ai/ops/latency-cost-security',
  title: 'Caching, latency, cost, privacy and security',
  level: 'advanced',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Estimate the cost and latency of an AI feature from token counts and request volume',
    'Reduce cost and latency with caching, smaller models and shorter prompts, and measure the effect on quality',
    'Identify prompt-injection, data-leak and excessive-permission risks in an AI feature',
    'Mitigate them by treating model input and output as untrusted and limiting what tools can do',
  ],
  prerequisites: ['ai/apps/ai-apis', 'ai/agents/tool-calling'],
  concepts: [
    'prompt-caching',
    'response-cache',
    'time-to-first-token',
    'prompt-injection',
    'least-privilege',
    'tool-calling',
    'agent-loop',
  ],
  references: [
    {
      title: 'Anthropic: Prompt caching (cache_control, pricing of cache reads and writes)',
      url: 'https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching',
    },
    {
      title:
        'OWASP Top 10 for LLM Applications (prompt injection, sensitive information disclosure, excessive agency)',
      url: 'https://genai.owasp.org/llm-top-10/',
      version: '2025',
    },
    {
      title: 'Greshake et al., Not what you’ve signed up for: indirect prompt injection',
      url: 'https://arxiv.org/abs/2302.12173',
    },
    {
      title:
        'Simon Willison: The lethal trifecta for AI agents (private data, untrusted content, external communication)',
      url: 'https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/',
    },
  ],
} satisfies LessonMeta;
