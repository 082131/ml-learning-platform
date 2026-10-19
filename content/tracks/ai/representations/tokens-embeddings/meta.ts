import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ai/representations/tokens-embeddings',
  title: 'Tokenization, embeddings and similarity',
  level: 'beginner',
  minutes: 35,
  kind: 'lesson',
  objectives: [
    'Tokenize text and read token IDs',
    'Compare sentences by embedding similarity',
    'Explain what an embedding model captures and what it misses',
  ],
  prerequisites: ['ai/fundamentals/ai-landscape', 'ml/deep/embeddings'],
  concepts: [],
} satisfies LessonMeta;
