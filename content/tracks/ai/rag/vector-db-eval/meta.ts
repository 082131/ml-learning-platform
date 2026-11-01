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
  concepts: [
    'vector-database',
    'ann-index',
    'ivf-index',
    'hnsw',
    'recall-at-k',
    'mean-reciprocal-rank',
    'metadata-filter',
    'hybrid-search',
    'reranking',
    'chunking',
  ],
  references: [
    {
      title:
        'Malkov and Yashunin, Efficient and robust approximate nearest neighbor search using HNSW graphs',
      url: 'https://arxiv.org/abs/1603.09320',
    },
    {
      title: 'pgvector README: HNSW and IVFFlat indexes, filtering, iterative scans',
      url: 'https://github.com/pgvector/pgvector',
      version: '0.8',
    },
    {
      title: 'Faiss wiki: Faster search (IndexIVFFlat, nlist, nprobe)',
      url: 'https://github.com/facebookresearch/faiss/wiki/Faster-search',
    },
    {
      title:
        'Thakur et al., BEIR: a heterogeneous benchmark for information retrieval (BM25 vs dense retrieval)',
      url: 'https://arxiv.org/abs/2104.08663',
    },
  ],
} satisfies LessonMeta;
