import type { GlossaryTerm } from '@/lib/types';

// Glossary terms for the ai/reliability chapter (merged into the glossary by content/index.ts).
export default [
  {
    id: 'eval-set',
    term: 'Evaluation set (evals)',
    short: 'A fixed collection of realistic inputs with the expected behavior for each, scored automatically whenever the AI feature changes.',
    long: 'The AI-application counterpart of a test suite and a held-out test set. It includes hard cases, past failures and inputs that should be refused.',
    introducedIn: 'ai/reliability/evals-guardrails',
    aliases: ['evals', 'eval', 'evaluation set', 'eval suite'],
  },
  {
    id: 'llm-as-judge',
    term: 'LLM-as-judge',
    short: 'Using a language model with a written rubric to grade outputs that code can’t check, such as tone or helpfulness.',
    long: 'Cheap and scalable, but it has biases (toward longer answers, toward its own style) and must itself be checked against human grades on a sample.',
    introducedIn: 'ai/reliability/evals-guardrails',
    aliases: ['model-based grading', 'LLM judge', 'model grader'],
  },
  {
    id: 'guardrail',
    term: 'Guardrail',
    short: 'A check before or after the model call that blocks, rewrites or flags inputs and outputs that break a rule.',
    long: 'Input guardrails catch things like prompt injection or personal data; output guardrails catch unsupported claims, leaked secrets or invalid formats. Each one blocks some good traffic, so measure both sides.',
    introducedIn: 'ai/reliability/evals-guardrails',
    aliases: ['guardrails', 'input filter', 'output filter'],
  },
  {
    id: 'prompt-injection',
    term: 'Prompt injection',
    short: 'Text that tries to override an AI system’s instructions, typed by a user or hidden in a document, email or web page the model reads.',
    long: 'Models can’t reliably tell instructions from data, so no filter stops every injection. The robust defense limits what a successful injection can do: few permissions, checks on tool calls, and a person approving side effects.',
    introducedIn: 'ai/reliability/evals-guardrails',
    aliases: ['injection', 'indirect prompt injection', 'jailbreak'],
  },
] satisfies GlossaryTerm[];
