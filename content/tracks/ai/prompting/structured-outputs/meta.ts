import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ai/prompting/structured-outputs',
  title: 'Prompt engineering and structured outputs',
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Write prompts with clear instructions, context and examples',
    'Request structured output and validate it against a schema',
    'Compare prompt variants with a small evaluation',
  ],
  prerequisites: ['ai/usage/pretrained-apis'],
  concepts: [],
} satisfies LessonMeta;
