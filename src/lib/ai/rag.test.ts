import { describe, expect, it } from 'vitest';
import { validateExperiment } from '../experiment';
import { bm25Scores, searchTerms } from './bm25';
import { CHUNK_OVERLAPS, CHUNK_SIZES, chunkDocs, chunkWords } from './chunking';
import vocabText from './data/vocab.txt?raw';
import { lumenDocs, lumenQueries, lumenVectors } from './lumen';
import { assemblePrompt, computeRag, ragExperiment, type RagState } from './ragExperiment';
import { parseVocab } from './wordpiece';

const data = {
  docs: lumenDocs,
  queries: lumenQueries,
  vectors: lumenVectors(),
  vocab: parseVocab(vocabText),
};
const base: RagState = { query: 'e402', size: 40, overlap: 10, k: 3, keywordWeight: 0.5 };

describe('chunkWords', () => {
  it('makes windows that share the overlap, with a shorter last window', () => {
    // 7 words, size 3, overlap 1 → stride 2: [0..2], [2..4], [4..6]
    expect(chunkWords('a b c d e f g', 3, 1)).toEqual(['a b c', 'c d e', 'e f g']);
    expect(chunkWords('a b c d e', 2, 0)).toEqual(['a b', 'c d', 'e']);
    expect(chunkWords('a b', 5, 0)).toEqual(['a b']);
  });

  it('rejects an overlap as large as the chunk', () => {
    expect(() => chunkWords('a b c', 2, 2)).toThrow('Overlap must be');
  });

  it('never mixes documents and numbers chunks per document', () => {
    const chunks = chunkDocs(lumenDocs, 80, 10);
    expect(chunks[0]!.id).toBe('plans#0');
    expect(new Set(chunks.map((c) => c.doc))).toEqual(new Set(lumenDocs.map((d) => d.id)));
  });

  it('has a bundled embedding for every chunk of every size and overlap, and every question', () => {
    for (const size of CHUNK_SIZES)
      for (const overlap of CHUNK_OVERLAPS)
        for (const c of chunkDocs(lumenDocs, size, overlap))
          expect(data.vectors.has(c.text), c.text).toBe(true);
    for (const q of lumenQueries) expect(data.vectors.has(q.text)).toBe(true);
  });
});

describe('bm25', () => {
  it('keeps hyphenated codes as one term', () => {
    expect(searchTerms('What does error E-402 mean?')).toEqual(['what', 'does', 'error', 'e-402', 'mean']);
  });

  it('matches a hand-worked score', () => {
    // N = 2, avg length 2. "cat" appears in doc 0 only: idf = ln((2 − 1 + 0.5)/(1 + 0.5) + 1) = ln 2.
    // Doc 0 has length 2 = avg, f = 1: tf part = 1 · 2.2 / (1 + 1.2) = 1. Score = ln 2.
    const [a, b] = bm25Scores('cat', ['cat sat', 'dog ran']);
    expect(a).toBeCloseTo(Math.LN2, 10);
    expect(b).toBe(0);
  });
});

describe('ragExperiment', () => {
  const def = ragExperiment('rag', data, base);

  it('is valid', () => {
    expect(validateExperiment(def)).toEqual([]);
  });

  it('cosine alone ranks the B-402 payment chunk above the E-402 answer (the lesson’s example)', () => {
    const r = computeRag({ ...base, keywordWeight: 0, k: 1 }, data);
    expect(r.answerCosineRank).toBe(2);
    expect(r.selected[0]!.chunk.doc).toBe('payments');
    expect(r.response.grounded).toBe(false);
  });

  it('keyword reranking puts the E-402 chunk first and the response cites it', () => {
    const r = computeRag({ ...base, k: 1 }, data);
    expect(r.selected[0]!.chunk.doc).toBe('sync');
    expect(r.selected[0]!.hasAnswer).toBe(true);
    expect(r.response).toEqual({
      grounded: true,
      text: 'Error E-402 means your storage quota is full [1]. Delete notes or attachments, or upgrade your plan, and sync will resume.',
    });
  });

  it('weights the rerank score as (1 − w)·cosine + w·keyword', () => {
    const r = computeRag(base, data);
    for (const c of r.candidates) expect(c.score).toBeCloseTo(0.5 * c.cosine + 0.5 * c.keyword, 12);
    expect(r.candidates).toHaveLength(8);
    expect(Math.max(...r.candidates.map((c) => c.keyword))).toBe(1);
  });

  it('puts the selected chunks into the prompt verbatim, numbered from 1', () => {
    const r = computeRag(base, data);
    expect(r.prompt).toBe(
      assemblePrompt(
        r.query.text,
        r.selected.map((c) => c.chunk),
      ),
    );
    expect(r.prompt).toContain(`[1] (${r.selected[0]!.chunk.title}) ${r.selected[0]!.chunk.text}`);
    expect(r.prompt.endsWith('Question: What does error E-402 mean?\nAnswer:')).toBe(true);
    expect(r.promptTokens).toBeGreaterThan(100);
  });

  it('answers "not in the context" for a question the help center does not cover', () => {
    const r = computeRag({ ...base, query: 'handwriting', k: 5 }, data);
    expect(r.answerCosineRank).toBeUndefined();
    expect(r.response.grounded).toBe(false);
  });
});
