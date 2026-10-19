import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ai/capstone/ai-app',
  title: 'Capstone: an AI application with evaluation and observability',
  level: 'advanced',
  minutes: 600,
  kind: 'capstone',
  objectives: [
    'Build an AI application with retrieval or tools',
    'Evaluate it with an automated eval set',
    'Monitor and document its behavior in use',
  ],
  prerequisites: ['ai/ops/deploy-monitor', 'ai/agents/tool-calling'],
  concepts: [],
} satisfies LessonMeta;
