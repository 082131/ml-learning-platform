import type { ExperimentDef } from '../types';
import { cosine } from '../math/vector';
import { bm25Scores } from './bm25';
import { CHUNK_OVERLAPS, CHUNK_SIZES, chunkDocs, type Chunk, type Doc } from './chunking';
import { encode, type Vocab } from './wordpiece';

export interface RagQuery {
  id: string;
  text: string;
  /** A phrase that only a passage answering the question contains. */
  answer: string;
  /** The scripted reply when that passage is in the prompt; `{cite}` becomes its source number. */
  grounded: string;
  /** The scripted reply when it is not. */
  missing: string;
}

export interface RagState {
  query: string;
  size: number;
  overlap: number;
  k: number;
  /** Share of the rerank score that comes from keywords (BM25); 0 keeps the cosine order. */
  keywordWeight: number;
}

export interface ScoredChunk {
  chunk: Chunk;
  cosine: number;
  /** Rank among all chunks by cosine similarity, from 1. */
  cosineRank: number;
  bm25: number;
  /** bm25 divided by the largest bm25 among the candidates, so 0 to 1 like the cosine. */
  keyword: number;
  score: number;
  /** Rank after reranking, from 1. */
  rank: number;
  hasAnswer: boolean;
}

export interface RagResult {
  query: RagQuery;
  chunks: Chunk[];
  /** The CANDIDATES best chunks by cosine, in reranked order. */
  candidates: ScoredChunk[];
  /** The top k after reranking: these go into the prompt, as sources [1] to [k]. */
  selected: ScoredChunk[];
  prompt: string;
  promptTokens: number;
  /** Where the answer-bearing chunk sits among all chunks by cosine, or undefined if no chunk holds the whole phrase. */
  answerCosineRank?: number;
  response: { grounded: boolean; text: string };
}

/** How many chunks the first, cosine-only stage passes to the reranker. */
export const CANDIDATES = 8;
export const MAX_K = 5;

export const SYSTEM_PROMPT =
  'You are the support assistant for Lumen Notes. Answer the question using only the context below. ' +
  'Cite the sources you use as [1], [2] and so on. If the context does not contain the answer, say so.';

export function assemblePrompt(question: string, sources: readonly Chunk[]): string {
  const context = sources.map((c, i) => `[${i + 1}] (${c.title}) ${c.text}`).join('\n\n');
  return `${SYSTEM_PROMPT}\n\nContext:\n${context}\n\nQuestion: ${question}\nAnswer:`;
}

export interface RagData {
  docs: Doc[];
  queries: RagQuery[];
  /** Embedding of every chunk text and query text, keyed by the text itself. */
  vectors: ReadonlyMap<string, number[]>;
  vocab: Vocab;
}

export function computeRag(s: RagState, data: RagData): RagResult {
  const query = data.queries.find((q) => q.id === s.query);
  if (!query) throw new Error(`unknown query "${s.query}"`);
  const vectorOf = (text: string) => {
    const v = data.vectors.get(text);
    if (!v) throw new Error(`no bundled embedding for "${text.slice(0, 40)}…"`);
    return v;
  };
  const q = vectorOf(query.text);
  const chunks = chunkDocs(data.docs, s.size, s.overlap);
  const byCosine = chunks
    .map((chunk, i) => ({ chunk, cosine: cosine(q, vectorOf(chunk.text)), i }))
    .sort((a, b) => b.cosine - a.cosine || a.i - b.i);
  const bm25 = bm25Scores(
    query.text,
    chunks.map((c) => c.text),
  );
  const top = byCosine.slice(0, CANDIDATES);
  const maxBm25 = Math.max(...top.map((t) => bm25[t.i]!));
  const w = s.keywordWeight;
  const candidates = top
    .map((t, r) => {
      const keyword = maxBm25 > 0 ? bm25[t.i]! / maxBm25 : 0;
      return {
        chunk: t.chunk,
        cosine: t.cosine,
        cosineRank: r + 1,
        bm25: bm25[t.i]!,
        keyword,
        score: (1 - w) * t.cosine + w * keyword,
        rank: 0,
        hasAnswer: t.chunk.text.includes(query.answer),
      };
    })
    .sort((a, b) => b.score - a.score || a.cosineRank - b.cosineRank)
    .map((c, r) => ({ ...c, rank: r + 1 }));
  const selected = candidates.slice(0, s.k);
  const prompt = assemblePrompt(
    query.text,
    selected.map((c) => c.chunk),
  );
  const cite = selected.findIndex((c) => c.hasAnswer);
  const answerIndex = byCosine.findIndex((c) => c.chunk.text.includes(query.answer));
  return {
    query,
    chunks,
    candidates,
    selected,
    prompt,
    // [CLS] and [SEP] are added by this tokenizer only; leave them out of a prompt length.
    promptTokens: encode(prompt, data.vocab).tokens.length - 2,
    answerCosineRank: answerIndex >= 0 ? answerIndex + 1 : undefined,
    response:
      cite >= 0
        ? { grounded: true, text: query.grounded.replace('{cite}', `[${cite + 1}]`) }
        : { grounded: false, text: query.missing },
  };
}

const options = (values: readonly number[], unit: string) =>
  values.map((v) => ({ value: String(v), label: `${v} ${unit}` }));

/**
 * The RAG pipeline: chunk the help center, retrieve by cosine similarity over the bundled embeddings,
 * rerank with a keyword score, and assemble the prompt. One state drives the diagram, the tables, the
 * prompt text, the Python code and the readout.
 */
export function ragExperiment(
  id: string,
  data: RagData,
  initial: RagState,
): ExperimentDef<RagState, RagResult> {
  return {
    id,
    initial,
    controls: [
      {
        kind: 'select',
        id: 'query',
        label: 'Question',
        options: data.queries.map((q) => ({ value: q.id, label: q.text })),
        get: (s) => s.query,
        set: (s, v) => ({ ...s, query: v }),
      },
      {
        kind: 'select',
        id: 'size',
        label: 'Chunk size',
        options: options(CHUNK_SIZES, 'words'),
        get: (s) => String(s.size),
        set: (s, v) => ({ ...s, size: Number(v) }),
      },
      {
        kind: 'select',
        id: 'overlap',
        label: 'Overlap',
        options: options(CHUNK_OVERLAPS, 'words'),
        get: (s) => String(s.overlap),
        set: (s, v) => ({ ...s, overlap: Number(v) }),
      },
      {
        kind: 'slider',
        id: 'k',
        label: 'Chunks in the prompt (k)',
        min: 1,
        max: MAX_K,
        get: (s) => s.k,
        set: (s, v) => ({ ...s, k: v }),
      },
      {
        kind: 'slider',
        id: 'keywordWeight',
        label: 'Keyword weight in reranking',
        min: 0,
        max: 1,
        step: 0.1,
        format: (v) => (v === 0 ? '0 (off)' : v.toFixed(1)),
        get: (s) => s.keywordWeight,
        set: (s, v) => ({ ...s, keywordWeight: Math.round(v * 10) / 10 }),
      },
    ],
    compute: (s) => computeRag(s, data),
    readout: (s, r) => [
      { label: 'Chunks', value: `${r.chunks.length} (${s.size} words, ${s.overlap} overlap)` },
      {
        label: 'Answer passage',
        value:
          r.answerCosineRank === undefined
            ? 'no chunk contains it'
            : `cosine rank ${r.answerCosineRank}${r.selected.some((c) => c.hasAnswer) ? ', in the prompt' : ', not in the prompt'}`,
      },
      { label: 'Prompt length', value: `${r.promptTokens} tokens (all-MiniLM-L6-v2 tokenizer)` },
    ],
  };
}
