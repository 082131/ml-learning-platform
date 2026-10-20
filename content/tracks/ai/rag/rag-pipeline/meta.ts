import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ai/rag/rag-pipeline',
  title: 'Retrieval-augmented generation end to end',
  level: 'intermediate',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Chunk documents and explain the trade-off between chunk size and overlap',
    'Retrieve relevant chunks with cosine similarity over embeddings',
    'Rerank candidates with a second score and explain when that helps',
    'Assemble a grounded prompt with numbered sources, and say what the model does with it',
    'Diagnose a wrong RAG answer as a chunking, retrieval or generation problem',
  ],
  prerequisites: ['ai/representations/tokens-embeddings', 'ai/prompting/structured-outputs'],
  concepts: [
    'retrieval-augmented-generation',
    'chunking',
    'reranking',
    'bm25',
    'grounding',
    'cosine-similarity',
  ],
  references: [
    {
      title: 'Lewis et al., Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks',
      url: 'https://arxiv.org/abs/2005.11401',
    },
    {
      title: 'Sentence Transformers: Retrieve & Re-Rank',
      url: 'https://sbert.net/examples/sentence_transformer/applications/retrieve_rerank/README.html',
    },
    {
      title: 'Robertson and Zaragoza, The Probabilistic Relevance Framework: BM25 and Beyond',
      url: 'https://doi.org/10.1561/1500000019',
    },
    {
      title: 'Elasticsearch: similarity settings (BM25 defaults k1 = 1.2, b = 0.75)',
      url: 'https://www.elastic.co/docs/reference/elasticsearch/index-settings/similarity',
    },
  ],
} satisfies LessonMeta;
