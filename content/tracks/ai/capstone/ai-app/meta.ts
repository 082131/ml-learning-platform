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
} satisfies LessonMeta;
