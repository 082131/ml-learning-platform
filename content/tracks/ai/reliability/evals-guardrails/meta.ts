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
  concepts: ['eval-set', 'llm-as-judge', 'hallucination', 'grounding', 'guardrail', 'prompt-injection'],
  references: [
    {
      title: 'Anthropic: Define success criteria and build evaluations',
      url: 'https://docs.anthropic.com/en/docs/test-and-evaluate/develop-tests',
    },
    {
      title: 'Zheng et al., Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena (judge biases)',
      url: 'https://arxiv.org/abs/2306.05685',
    },
    {
      title: 'OWASP Top 10 for LLM Applications: LLM01 Prompt Injection',
      url: 'https://genai.owasp.org/llmrisk/llm01-prompt-injection/',
      version: '2025',
    },
    {
      title: 'Es et al., RAGAS: Automated Evaluation of Retrieval Augmented Generation (faithfulness)',
      url: 'https://arxiv.org/abs/2309.15217',
    },
  ],
} satisfies LessonMeta;
