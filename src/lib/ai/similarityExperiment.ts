import type { ExperimentDef } from '../types';
import { rankByCosine, type Ranked } from './embeddings';
import { pca2d, type Projection } from './pca';
import { pyStr } from './pythonRepr';

export interface SimilarityItem {
  id: string;
  text: string;
  kind: 'sentence' | 'query';
  vector: number[];
}

export interface SimilarityState {
  /** ID of the text used as the query: one of the queries or one of the sentences. */
  query: string;
}

export interface SimilarityResult {
  query: SimilarityItem;
  /** Every sentence (including the query itself, if it is one), best match first. */
  ranked: Ranked<SimilarityItem>[];
  /** 2-D PCA coordinates of all items; `ids[i]` names `points[i]`. */
  map: Projection & { ids: string[] };
}

export const TOP_K = 3;

/**
 * Similarity search over the bundled sentence embeddings. Choosing a query re-ranks the sentences by
 * cosine similarity; the ranking, the map, the code's query literal and the readout share this state.
 */
export function similarityExperiment(id: string, items: SimilarityItem[], query: string): ExperimentDef<SimilarityState, SimilarityResult> {
  const sentences = items.filter((i) => i.kind === 'sentence');
  const map = { ...pca2d(items.map((i) => i.vector)), ids: items.map((i) => i.id) };
  const find = (qid: string) => {
    const q = items.find((i) => i.id === qid);
    if (!q) throw new Error(`unknown query "${qid}"`);
    return q;
  };
  return {
    id,
    initial: { query },
    controls: [
      {
        kind: 'select',
        id: 'query',
        label: 'Query',
        options: [
          ...items.filter((i) => i.kind === 'query').map((i) => ({ value: i.id, label: `Query: ${i.text}` })),
          ...sentences.map((i) => ({ value: i.id, label: `Sentence: ${i.text}` })),
        ],
        get: (s) => s.query,
        set: (s, v) => ({ ...s, query: v }),
      },
    ],
    compute: (s) => {
      const q = find(s.query);
      return { query: q, ranked: rankByCosine(q.vector, sentences), map };
    },
    readout: (_, r) =>
      r.ranked.slice(0, TOP_K).map((x) => ({ label: `#${x.rank} · cosine ${x.score.toFixed(3)}`, value: x.item.text })),
  };
}

export const querySlot = (s: unknown, items: SimilarityItem[]) =>
  pyStr(items.find((i) => i.id === (s as SimilarityState).query)?.text ?? '');
