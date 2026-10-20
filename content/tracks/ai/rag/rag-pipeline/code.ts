// Code for the RAG lesson. Retrieval uses the bundled all-MiniLM-L6-v2 vectors (scripts/ai/generate_embeddings.py);
// chunking, BM25, reranking and prompt assembly run in src/lib/ai and are unit-tested. The generation step is
// a scripted, labeled simulation. The pure-Python runner was run with CPython 3.13 and its output copied here.
import vocabText from '@/lib/ai/data/vocab.txt?raw';
import { lumenDocs, lumenQueries, lumenVectors } from '@/lib/ai/lumen';
import { pyStr } from '@/lib/ai/pythonRepr';
import { CANDIDATES, ragExperiment, type RagState } from '@/lib/ai/ragExperiment';
import { parseVocab } from '@/lib/ai/wordpiece';
import type { CodeExample } from '@/lib/types';

export const rag = ragExperiment(
  'rag',
  { docs: lumenDocs, queries: lumenQueries, vectors: lumenVectors(), vocab: parseVocab(vocabText) },
  { query: 'e402', size: 40, overlap: 10, k: 3, keywordWeight: 0.5 },
);

const st = (s: unknown) => s as RagState;

export const ragCode: CodeExample = {
  id: 'rag-retrieve',
  language: 'python',
  source: `import numpy as np
from sentence_transformers import SentenceTransformer

SIZE, OVERLAP, K, KEYWORD_WEIGHT = {{size}}, {{overlap}}, {{k}}, {{weight}}
model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

# docs: list of (title, text); chunk_words is the function in chunking.py below
chunks = [(title, c) for title, text in docs for c in chunk_words(text, SIZE, OVERLAP)]
vectors = model.encode([c for _, c in chunks], normalize_embeddings=True)

question = {{question}}
cosine = vectors @ model.encode(question, normalize_embeddings=True)
candidates = np.argsort(-cosine, kind="stable")[:${CANDIDATES}]
keyword = bm25(question, [c for _, c in chunks])[candidates]  # any BM25 implementation
keyword = keyword / keyword.max() if keyword.max() > 0 else keyword
score = (1 - KEYWORD_WEIGHT) * cosine[candidates] + KEYWORD_WEIGHT * keyword
top = candidates[np.argsort(-score, kind="stable")][:K]

context = "\\n\\n".join(f"[{n}] ({chunks[i][0]}) {chunks[i][1]}" for n, i in enumerate(top, 1))
prompt = f"{SYSTEM}\\n\\nContext:\\n{context}\\n\\nQuestion: {question}\\nAnswer:"`,
  slots: {
    size: (s) => String(st(s).size),
    overlap: (s) => String(st(s).overlap),
    k: (s) => String(st(s).k),
    weight: (s) => st(s).keywordWeight.toFixed(1),
    question: (s) => pyStr(lumenQueries.find((q) => q.id === st(s).query)?.text ?? ''),
  },
  annotations: [
    {
      id: 'settings',
      range: { line: 4 },
      kind: 'parameter',
      title: 'SIZE, OVERLAP, K, KEYWORD_WEIGHT',
      what: 'The four settings of the experiment, filled from its current state.',
      why: 'These are the knobs you tune in a real RAG system, usually by measuring retrieval quality on a set of test questions.',
    },
    {
      id: 'chunks',
      range: { line: 8, startCol: 0, endCol: 6 },
      match: 'chunks',
      kind: 'variable',
      title: 'chunks',
      what: 'Every document cut into windows of SIZE words that share OVERLAP words, kept with the title of their document.',
      why: 'An embedding of a short passage is specific; an embedding of a whole document blurs every topic in it together.',
      output: 'A list of (title, text) pairs',
    },
    {
      id: 'encode-chunks',
      range: { line: 9, startCol: 0, endCol: 7 },
      match: 'vectors',
      kind: 'variable',
      title: 'vectors',
      what: 'One unit-length embedding per chunk.',
      why: 'Computed once when documents are added (indexing), then stored, usually in a vector database.',
      output: 'Shape (number of chunks, 384)',
    },
    {
      id: 'cosine',
      range: { line: 12, startCol: 9, endCol: 16 },
      match: 'vectors',
      kind: 'math',
      title: 'vectors @ query vector',
      what: 'The cosine similarity of every chunk with the question, in one matrix product.',
      why: 'The vectors have length 1, so the dot product is the cosine similarity.',
      output: 'Shape (number of chunks,)',
    },
    {
      id: 'candidates',
      range: { line: 13, startCol: 0, endCol: 10 },
      match: 'candidates',
      kind: 'variable',
      title: 'candidates',
      what: `The indices of the ${CANDIDATES} chunks with the highest cosine similarity: the first stage.`,
      why: 'The first stage is cheap and runs over everything; the reranker only looks at these few.',
    },
    {
      id: 'bm25',
      range: { line: 14, startCol: 10, endCol: 14 },
      match: 'bm25',
      kind: 'function',
      title: 'bm25(question, texts)',
      what: 'A keyword score for each chunk: rare words of the question that appear in the chunk raise it most.',
      why: 'Exact terms such as “E-402” matter to the user but barely move an embedding. The rank_bm25 package or a search engine provides BM25.',
      output: 'One score per chunk, 0 when no question word appears',
    },
    {
      id: 'score',
      range: { line: 16, startCol: 0, endCol: 5 },
      match: 'score',
      kind: 'math',
      title: 'score',
      what: 'The rerank score: a weighted mix of the cosine similarity and the keyword score scaled to 0..1.',
      why: 'With KEYWORD_WEIGHT = 0 the order stays the cosine order; higher weights favor exact word matches.',
    },
    {
      id: 'top',
      range: { line: 17, startCol: 0, endCol: 3 },
      match: 'top',
      kind: 'variable',
      title: 'top',
      what: 'The K best candidates after reranking.',
      why: 'Only these reach the model. A chunk ranked K + 1 might as well not exist.',
    },
    {
      id: 'prompt',
      range: { line: 20, startCol: 0, endCol: 6 },
      match: 'prompt',
      kind: 'variable',
      title: 'prompt',
      what: 'The instructions, the numbered context chunks and the question, as one string.',
      why: 'Numbering the sources lets the model cite them and lets your code check the citations.',
      output: 'Exactly the text shown in the prompt panel',
    },
  ],
};

/** Runs in the browser with Pyodide. Pure Python. */
export const chunkRunner: CodeExample = {
  id: 'chunk-runner',
  language: 'python',
  run: 'pyodide',
  source: `def chunk_words(text, size, overlap):
    words, chunks, start = text.split(), [], 0
    while True:
        chunks.append(" ".join(words[start:start + size]))
        if start + size >= len(words):
            return chunks
        start += size - overlap


text = "You can cancel a paid plan at any time from Settings, Billing. Monthly plans are not refunded."
for chunk in chunk_words(text, size=8, overlap=2):
    print(chunk)
print("---")
for chunk in chunk_words(text, size=8, overlap=0):
    print(chunk)`,
  annotations: [],
  expectedOutput: `You can cancel a paid plan at any
at any time from Settings, Billing. Monthly plans
Monthly plans are not refunded.
---
You can cancel a paid plan at any
time from Settings, Billing. Monthly plans are not
refunded.`,
};
