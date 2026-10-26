import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ai/rag/vector-db-eval',
  title: 'Vector databases, chunking, reranking and retrieval evaluation',
  level: 'advanced',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Explain how an approximate nearest-neighbor index (such as HNSW) trades recall for speed',
    'Store embeddings with their text, metadata and model version, and filter by metadata at query time',
    'Measure retrieval quality with recall@k on a set of questions with known answer passages',
    'Decide from measurements whether a reranker or hybrid search is worth its latency',
  ],
  prerequisites: ['ai/rag/rag-pipeline', 'ml/classical/metrics-error-analysis'],
  concepts: [],
} satisfies LessonMeta;
