import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ai/llm/transformers-llms',
  title: 'Transformers, attention and LLM fundamentals',
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Explain next-token prediction and sampling',
    'Relate context length to attention cost',
    'Explain why LLMs produce fluent but sometimes wrong text',
  ],
  prerequisites: ['ai/representations/tokens-embeddings', 'ml/deep/transformers'],
  concepts: [],
} satisfies LessonMeta;
