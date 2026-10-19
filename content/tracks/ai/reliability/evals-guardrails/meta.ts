import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ai/reliability/evals-guardrails',
  title: 'Evals, hallucination analysis and guardrails',
  level: 'advanced',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Build an evaluation set for an AI feature',
    'Measure and categorize hallucinations',
    'Add input and output guardrails and measure their effect',
  ],
  prerequisites: ['ai/rag/rag-pipeline'],
  concepts: [],
} satisfies LessonMeta;
