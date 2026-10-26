import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ai/llm/transformers-llms',
  title: 'Transformers, attention and LLM fundamentals',
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Explain how a language model generates text one token at a time by predicting the next token',
    'Describe how temperature and top-p sampling change the output, and when to use each',
    'Relate context length to the cost of attention and to what the model can see',
    'Explain why a model produces fluent text that can still be wrong, and what that implies for using it',
  ],
  prerequisites: ['ai/representations/tokens-embeddings', 'ml/deep/transformers'],
  concepts: [],
} satisfies LessonMeta;
