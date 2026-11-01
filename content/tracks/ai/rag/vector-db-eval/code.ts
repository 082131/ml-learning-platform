// Code for the vector database lesson. The IVF index, recall and the Lumen retrieval evaluation run in the browser
// (src/lib/ai/ivf.ts and src/lib/ai/retrievalEval.ts, unit-tested). The vectors for the index are seeded synthetic
// unit vectors in 16 dimensions. The SQL and Faiss samples follow pgvector 0.8 and the Faiss wiki and are not run here.
// The pure-Python runner was run with CPython 3.13 and its output copied here.
import vocabText from '@/lib/ai/data/vocab.txt?raw';
import { ivfExperiment } from '@/lib/ai/ivf';
import { lumenDocs, lumenQueries, lumenVectors } from '@/lib/ai/lumen';
import { retrievalEvalExperiment } from '@/lib/ai/retrievalEval';
import { parseVocab } from '@/lib/ai/wordpiece';
import type { CodeExample } from '@/lib/types';

export const ivf = ivfExperiment('ivf', 7, { nlist: 32, nprobe: 4 });

export const retrievalEval = retrievalEvalExperiment(
  'retrieval-eval',
  { docs: lumenDocs, queries: lumenQueries, vectors: lumenVectors(), vocab: parseVocab(vocabText) },
  { size: 40, overlap: 10, keywordWeight: 0 },
);

export const pgvectorCode: CodeExample = {
  id: 'pgvector',
  language: 'sql',
  source: `CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE chunks (
  id         bigserial PRIMARY KEY,
  doc_id     text NOT NULL,
  title      text NOT NULL,
  body       text NOT NULL,
  model      text NOT NULL,            -- which embedding model made the vector
  embedding  vector(384) NOT NULL
);
CREATE INDEX ON chunks USING hnsw (embedding vector_cosine_ops);

SET hnsw.ef_search = 100;              -- more candidates: higher recall, slower
SELECT id, title, 1 - (embedding <=> $1) AS cosine
FROM chunks
WHERE model = 'all-MiniLM-L6-v2' AND doc_id IN ('api', 'security')
ORDER BY embedding <=> $1
LIMIT 5;`,
  annotations: [
    {
      id: 'model-column',
      range: { line: 8 },
      kind: 'variable',
      title: 'model',
      what: 'The name and version of the embedding model that produced each vector.',
      why: 'Vectors from different models are not comparable. When you change models you must re-embed everything, and this column tells you what is done.',
    },
    {
      id: 'vector-type',
      range: { line: 9 },
      kind: 'syntax',
      title: 'vector(384)',
      what: 'A column of 384-number vectors, the size all-MiniLM-L6-v2 produces.',
      why: 'The dimension is fixed by the model; inserting a vector of another size is an error.',
    },
    {
      id: 'hnsw-index',
      range: { line: 11 },
      kind: 'framework',
      title: 'USING hnsw (embedding vector_cosine_ops)',
      what: 'Builds an HNSW graph index for cosine distance.',
      why: 'Without an index every query compares against every row: fine for thousands, slow for millions.',
    },
    {
      id: 'ef-search',
      range: { line: 13 },
      kind: 'parameter',
      title: 'hnsw.ef_search',
      what: 'How many candidates the graph search keeps (pgvector’s default is 40).',
      why: 'It plays the role nprobe plays in the IVF experiment: higher means better recall and slower queries.',
    },
    {
      id: 'distance',
      range: { line: 14 },
      kind: 'math',
      title: '1 - (embedding <=> $1)',
      what: '<=> is cosine distance, so 1 minus it is the cosine similarity with the query vector $1.',
      why: 'Same score as in the RAG lesson, computed by the database.',
    },
    {
      id: 'filter',
      range: { line: 16 },
      kind: 'syntax',
      title: 'WHERE … (metadata filter)',
      what: 'Only chunks from the current model and from two articles are eligible.',
      why: 'Filters enforce permissions and focus. With an approximate index, a strict filter can leave fewer than LIMIT rows; pgvector 0.8 adds iterative scans for that.',
    },
  ],
};

export const faissCode: CodeExample = {
  id: 'faiss-ivf',
  language: 'python',
  source: `import faiss  # vectors: float32 array of shape (n, 16), rows normalized to length 1

d, nlist = vectors.shape[1], 32
quantizer = faiss.IndexFlatIP(d)                 # finds the closest cluster centers
index = faiss.IndexIVFFlat(quantizer, d, nlist, faiss.METRIC_INNER_PRODUCT)
index.train(vectors)                             # k-means: learn the 32 centers
index.add(vectors)                               # put each vector in its cluster's list
index.nprobe = 4                                 # search the 4 closest clusters
scores, ids = index.search(queries, 10)          # shapes (n_queries, 10)`,
  annotations: [
    {
      id: 'ivf',
      range: { line: 5 },
      kind: 'framework',
      title: 'faiss.IndexIVFFlat',
      what: 'The same IVF index as the experiment: clusters, plus a full (“flat”) comparison inside the searched clusters.',
      why: 'IVF needs a training step and is cheap in memory; HNSW needs no training and uses more memory for its links.',
    },
    {
      id: 'train',
      range: { line: 6 },
      kind: 'function',
      title: 'index.train(vectors)',
      what: 'Runs k-means to find nlist cluster centers.',
      why: 'Train on data that looks like what you will store, or the clusters won’t fit the real data.',
    },
    {
      id: 'nprobe',
      range: { line: 8 },
      kind: 'parameter',
      title: 'index.nprobe',
      what: 'How many clusters each query searches. The slider in the experiment.',
      why: 'It can be changed per query without rebuilding the index.',
    },
  ],
};

export const recallRunner: CodeExample = {
  id: 'recall-runner',
  language: 'python',
  run: 'pyodide',
  source: `# For each question: the ids your retriever returned (best first), and the id of the chunk that answers it.
results = {
    "reset-link":   (["security#1", "email#0", "security#0"], "security#1"),
    "e402":         (["payments#0", "sync#1", "sync#0"], "sync#1"),
    "rate-limit":   (["api#1", "api#0", "plans#0"], "api#1"),
    "handwriting":  (["api#0", "plans#1", "sync#0"], None),          # no chunk answers it
}


def recall_at_k(results, k):
    answerable = [(ids, gold) for ids, gold in results.values() if gold is not None]
    hits = sum(gold in ids[:k] for ids, gold in answerable)
    return hits / len(answerable)


def mrr(results):
    answerable = [(ids, gold) for ids, gold in results.values() if gold is not None]
    return sum(1 / (ids.index(gold) + 1) if gold in ids else 0 for ids, gold in answerable) / len(answerable)


for k in [1, 3]:
    print(f"recall@{k} = {recall_at_k(results, k):.2f}")
print(f"MRR = {mrr(results):.2f}")`,
  annotations: [],
  expectedOutput: `recall@1 = 0.67
recall@3 = 1.00
MRR = 0.83`,
};
