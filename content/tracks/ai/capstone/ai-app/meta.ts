import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ai/capstone/ai-app',
  title: 'Capstone: an AI application with evaluation and observability',
  level: 'advanced',
  minutes: 600,
  kind: 'capstone',
  objectives: [
    'Build an AI application that uses retrieval or tools to answer from your own data',
    'Evaluate it with an automated evaluation set and report the results honestly',
    'Ship it with cost limits, guardrails and monitoring',
    'Document its intended use, known failure cases and the model behind it',
  ],
  prerequisites: ['ai/ops/deploy-monitor', 'ai/agents/tool-calling', 'ai/rag/vector-db-eval'],
  concepts: [],
  references: [
    {
      title: 'Anthropic: Messages API reference',
      url: 'https://docs.anthropic.com/en/api/messages',
    },
    {
      title: 'Anthropic: Define success criteria and build evaluations',
      url: 'https://docs.anthropic.com/en/docs/test-and-evaluate/develop-tests',
    },
    {
      title: 'OWASP Top 10 for LLM Applications',
      url: 'https://genai.owasp.org/llm-top-10/',
      version: '2025',
    },
    {
      title: 'Mitchell et al., Model Cards for Model Reporting (2019)',
      url: 'https://arxiv.org/abs/1810.03993',
    },
  ],
} satisfies LessonMeta;
