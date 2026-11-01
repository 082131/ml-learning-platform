import type { ExperimentDef } from '../types';
import { CHUNK_OVERLAPS, CHUNK_SIZES } from './chunking';
import { CANDIDATES, computeRag, type RagData } from './ragExperiment';

/**
 * Retrieval evaluation on the Lumen questions that have an answer passage: where does the chunk holding
 * the answer land after retrieval and reranking? Computed with the RAG lesson's real pipeline.
 */

export interface EvalRow {
  query: string;
  text: string;
  /** Final rank of the first chunk containing the answer, or undefined if it isn't among the candidates. */
  rank?: number;
}

export const EVAL_KS = [1, 3, 5] as const;

/** recall@k: share of questions whose answer chunk is ranked k or better. */
export function recallAt(ranks: readonly (number | undefined)[], k: number): number {
  return ranks.filter((r) => r !== undefined && r <= k).length / ranks.length;
}

/** Mean reciprocal rank: the average of 1/rank, counting a miss as 0. */
export function meanReciprocalRank(ranks: readonly (number | undefined)[]): number {
  return ranks.reduce<number>((a, r) => a + (r ? 1 / r : 0), 0) / ranks.length;
}

export interface RetrievalEvalState {
  size: number;
  overlap: number;
  keywordWeight: number;
}

export interface RetrievalEvalResult {
  rows: EvalRow[];
  recall: Record<number, number>;
  mrr: number;
  /** The same metrics with reranking off, for comparison. */
  baseline: { recall: Record<number, number>; mrr: number };
}

function evaluate(data: RagData, s: RetrievalEvalState): { rows: EvalRow[]; recall: Record<number, number>; mrr: number } {
  const answerable = data.queries.filter((q) => data.docs.some((d) => d.text.includes(q.answer)));
  const rows = answerable.map((q) => {
    const r = computeRag({ query: q.id, size: s.size, overlap: s.overlap, k: 1, keywordWeight: s.keywordWeight }, data);
    return { query: q.id, text: q.text, rank: r.candidates.find((c) => c.hasAnswer)?.rank };
  });
  const ranks = rows.map((r) => r.rank);
  return {
    rows,
    recall: Object.fromEntries(EVAL_KS.map((k) => [k, recallAt(ranks, k)])),
    mrr: meanReciprocalRank(ranks),
  };
}

export function retrievalEvalExperiment(
  id: string,
  data: RagData,
  initial: RetrievalEvalState,
): ExperimentDef<RetrievalEvalState, RetrievalEvalResult> {
  const words = (values: readonly number[]) => values.map((v) => ({ value: String(v), label: `${v} words` }));
  return {
    id,
    initial,
    controls: [
      {
        kind: 'select',
        id: 'size',
        label: 'Chunk size',
        options: words(CHUNK_SIZES),
        get: (s) => String(s.size),
        set: (s, v) => ({ ...s, size: Number(v) }),
      },
      {
        kind: 'select',
        id: 'overlap',
        label: 'Overlap',
        options: words(CHUNK_OVERLAPS),
        get: (s) => String(s.overlap),
        set: (s, v) => ({ ...s, overlap: Number(v) }),
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
    compute: (s) => {
      const r = evaluate(data, s);
      const b = evaluate(data, { ...s, keywordWeight: 0 });
      return { ...r, baseline: { recall: b.recall, mrr: b.mrr } };
    },
    readout: (_s, r) => [
      ...EVAL_KS.map((k) => ({ label: `recall@${k}`, value: r.recall[k]!.toFixed(2) })),
      { label: 'MRR', value: r.mrr.toFixed(2) },
      { label: 'Questions', value: `${r.rows.length} (misses: answer not in the top ${CANDIDATES})` },
    ],
  };
}
