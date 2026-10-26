import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ai/reliability/evals-guardrails',
  title: 'Evals, hallucination analysis and guardrails',
  level: 'advanced',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Build an evaluation set of realistic inputs with expected behavior for an AI feature',
    'Score outputs with exact checks, rubrics and model-based grading, and know the limits of each',
    'Measure and categorize unsupported claims (hallucinations) in answers',
    'Add input and output guardrails and measure what they catch and what they block wrongly',
  ],
  prerequisites: [
    'ai/rag/rag-pipeline',
    'ai/prompting/structured-outputs',
    'ml/classical/metrics-error-analysis',
  ],
  concepts: [],
} satisfies LessonMeta;
