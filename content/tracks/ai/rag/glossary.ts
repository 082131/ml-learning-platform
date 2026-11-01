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
  {
    id: 'vector-database',
    term: 'Vector database',
    short:
      'A store for embeddings with their text and metadata, built to find the nearest vectors to a query quickly.',
    long: 'Examples are dedicated systems and extensions to existing databases (such as pgvector for PostgreSQL). Most use an approximate nearest-neighbor index and support metadata filters.',
    introducedIn: 'ai/rag/vector-db-eval',
    aliases: ['vector store', 'vector DB', 'pgvector'],
  },
  {
    id: 'ann-index',
    term: 'Approximate nearest-neighbor (ANN) index',
    short:
      'A data structure that finds most of the nearest vectors while comparing the query with only a fraction of them.',
    long: 'It trades a little recall for a lot of speed. IVF and HNSW are the two most common kinds; each has a setting (nprobe, ef_search) that moves along that trade-off at query time.',
    introducedIn: 'ai/rag/vector-db-eval',
    aliases: ['ANN', 'approximate nearest neighbor', 'approximate search'],
  },
  {
    id: 'ivf-index',
    term: 'IVF index',
    short:
      'An inverted-file index: k-means splits the vectors into nlist clusters, and a query searches only the nprobe clusters with the closest centers.',
    introducedIn: 'ai/rag/vector-db-eval',
    aliases: ['IVF', 'inverted file index', 'nprobe', 'nlist'],
  },
  {
    id: 'hnsw',
    term: 'HNSW',
    short:
      'Hierarchical navigable small world: a graph index where each vector links to near neighbors, searched greedily from a sparse top layer down.',
    long: 'Fast and accurate at high recall, at the cost of memory for the links and slower inserts. ef_search sets how many candidates the search keeps.',
    introducedIn: 'ai/rag/vector-db-eval',
    aliases: ['hierarchical navigable small world', 'ef_search'],
  },
  {
    id: 'recall-at-k',
    term: 'Recall@k',
    short: 'For retrieval: the share of questions whose answer passage appears in the top k results.',
    long: 'For comparing an approximate index with exact search, recall@k is instead the share of the exact top k that the index also returned.',
    introducedIn: 'ai/rag/vector-db-eval',
    aliases: ['recall at k', 'recall@5', 'recall@10'],
  },
  {
    id: 'mean-reciprocal-rank',
    term: 'Mean reciprocal rank (MRR)',
    short: 'The average over questions of 1 / (rank of the first correct result), counting a miss as 0.',
    introducedIn: 'ai/rag/vector-db-eval',
    aliases: ['MRR', 'reciprocal rank'],
  },
  {
    id: 'metadata-filter',
    term: 'Metadata filter',
    short:
      'A condition on stored fields (document, product, language, permissions) applied together with vector search.',
    long: 'Used to search only what a user may see or what the question is about. Filtering after an approximate search can return fewer than k results, so databases offer filtered or iterative search.',
    introducedIn: 'ai/rag/vector-db-eval',
    aliases: ['metadata filtering', 'filtered search'],
  },
  {
    id: 'hybrid-search',
    term: 'Hybrid search',
    short:
      'Combining keyword search (such as BM25) with vector search, so both exact terms and paraphrases are found.',
    introducedIn: 'ai/rag/vector-db-eval',
    aliases: ['hybrid retrieval'],
  },
] satisfies GlossaryTerm[];
