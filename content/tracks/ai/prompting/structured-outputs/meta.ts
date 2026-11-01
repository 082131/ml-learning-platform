import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ai/prompting/structured-outputs',
  title: 'Prompt engineering and structured outputs',
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Write a prompt with clear instructions, context and examples, and explain what each part does',
    'Request JSON output that follows a schema, and validate it in code before using it',
    'Handle output that fails validation by retrying with the error or falling back',
    'Compare two prompt variants on a small labeled set instead of a single example',
  ],
  prerequisites: ['ai/usage/pretrained-apis'],
  concepts: ['system-prompt', 'few-shot-prompting', 'structured-output', 'json-schema'],
  references: [
    {
      title: 'JSON Schema: Understanding JSON Schema',
      url: 'https://json-schema.org/understanding-json-schema',
    },
    {
      title: 'Anthropic: Structured outputs',
      url: 'https://docs.anthropic.com/en/docs/build-with-claude/structured-outputs',
    },
    {
      title: 'Anthropic: Prompt engineering overview',
      url: 'https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview',
    },
    {
      title: 'Pydantic: JSON Schema and model validation',
      url: 'https://docs.pydantic.dev/latest/concepts/json_schema/',
      version: '2.x',
    },
  ],
} satisfies LessonMeta;
