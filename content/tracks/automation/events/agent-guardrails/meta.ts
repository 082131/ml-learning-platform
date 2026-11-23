import type { LessonMeta } from '@/lib/types';

export default {
  id: 'automation/events/agent-guardrails',
  title: 'AI agents that automate work, with guardrails',
  level: 'advanced',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Decide between a fixed workflow, an LLM step inside a workflow, and an autonomous agent',
    'Classify an agent’s tools by risk and choose an autonomy level for each tier',
    'Defend against prompt injection with harness-level controls: approvals, allowlists, least privilege, budgets',
    'Make agent runs observable and auditable',
  ],
  prerequisites: ['automation/events/webhooks', 'ai/agents/tool-calling'],
  concepts: ['agent', 'agent-loop', 'tool-calling', 'human-in-the-loop', 'tool-risk-tier', 'prompt-injection', 'guardrail', 'least-privilege'],
  references: [
    { title: 'Anthropic: Building effective agents', url: 'https://www.anthropic.com/engineering/building-effective-agents' },
    { title: 'OWASP Top 10 for LLM Applications: LLM01 Prompt Injection', url: 'https://genai.owasp.org/llmrisk/llm01-prompt-injection/' },
    { title: 'OWASP Top 10 for LLM Applications: Excessive Agency', url: 'https://genai.owasp.org/llmrisk/llm062025-excessive-agency/' },
    { title: 'NIST AI 600-1: Generative AI Profile', url: 'https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence' },
  ],
} satisfies LessonMeta;
