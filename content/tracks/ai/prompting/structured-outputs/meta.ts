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
  concepts: [],
} satisfies LessonMeta;
