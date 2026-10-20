import type { GlossaryTerm } from '@/lib/types';

// Glossary terms for the ai/rag chapter (merged into the glossary by content/index.ts).
export default [
  {
    id: 'retrieval-augmented-generation',
    term: 'Retrieval-augmented generation (RAG)',
    short:
      'Answering a question by first retrieving relevant passages from your documents and putting them into the language model’s prompt.',
    long: 'A RAG system chunks and embeds documents ahead of time. For each question it retrieves the most similar chunks, often reranks them, and asks the model to answer only from them, citing sources. The model is not retrained.',
    introducedIn: 'ai/rag/rag-pipeline',
    aliases: ['RAG'],
  },
  {
    id: 'chunking',
    term: 'Chunking',
    short: 'Splitting documents into short passages (chunks) that are embedded and retrieved separately.',
    long: 'Chunk size trades precision against context: small chunks match specific questions but can cut a fact in half; large chunks keep context but blur topics together. Overlap repeats a few words between neighboring chunks so a fact near a boundary survives.',
    introducedIn: 'ai/rag/rag-pipeline',
    aliases: ['chunk', 'chunks'],
  },
  {
    id: 'reranking',
    term: 'Reranking',
    short:
      'Re-scoring the first few retrieved results with a second, usually more careful method, and reordering them.',
    long: 'The first stage (for example cosine similarity) is cheap enough to run over every chunk. A reranker, often a cross-encoder model that reads the question and the chunk together, only scores the top candidates.',
    introducedIn: 'ai/rag/rag-pipeline',
    aliases: ['reranker', 're-ranking'],
  },
  {
    id: 'bm25',
    term: 'BM25',
    short:
      'A keyword relevance score: a document scores higher when it contains rare words of the query, with diminishing returns for repeats.',
    long: 'BM25 (Best Matching 25) is the default ranking function of search engines such as Elasticsearch. It finds exact terms like product codes that embeddings blur, and misses paraphrases that embeddings catch, so the two are often combined.',
    introducedIn: 'ai/rag/rag-pipeline',
  },
  {
    id: 'grounding',
    term: 'Grounding',
    short: 'Making a model answer from given source text, and only claim what that text supports.',
    long: 'A grounded RAG prompt tells the model to use only the context, to cite sources, and to say when the answer is not there. Grounding reduces but does not eliminate made-up answers, so citations should be checked.',
    introducedIn: 'ai/rag/rag-pipeline',
    aliases: ['grounded'],
  },
] satisfies GlossaryTerm[];
