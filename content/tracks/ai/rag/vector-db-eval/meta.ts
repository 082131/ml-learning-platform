import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ai/rag/vector-db-eval',
  title: 'Vector databases, chunking, reranking and retrieval evaluation',
  level: 'advanced',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Explain how approximate nearest-neighbor indexes trade accuracy for speed',
    'Measure retrieval quality with recall@k',
    'Decide when reranking is worth its cost',
  ],
  prerequisites: ['ai/rag/rag-pipeline'],
  concepts: [],
} satisfies LessonMeta;
