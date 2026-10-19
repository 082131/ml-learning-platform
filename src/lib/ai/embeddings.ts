import { cosine } from '../math/vector';
import { decodeFloat16Rows } from './float16';

/** How the bundled vectors were made (written by scripts/ai/generate_embeddings.py). */
export interface EmbeddingModelInfo {
  name: string;
  revision: string;
  format: string;
  license: string;
  dimensions: number;
  pooling: string;
  runtime: string;
  storage: string;
}

export interface EmbeddedText {
  id: string;
  text: string;
  vector: number[];
}

/** Turns a generated table (texts plus float16 vectors) into texts with their vectors. */
export function readTable<T extends { text: string }>(items: T[], vectorsBase64: string): (T & { vector: number[] })[] {
  const vectors = decodeFloat16Rows(vectorsBase64, items.length);
  return items.map((item, i) => ({ ...item, vector: vectors[i]! }));
}

export interface Ranked<T> {
  item: T;
  score: number;
  rank: number;
}

/** Scores every candidate by cosine similarity to the query vector, best first (ties keep input order). */
export function rankByCosine<T extends { vector: number[] }>(query: number[], candidates: T[]): Ranked<T>[] {
  return candidates
    .map((item, i) => ({ item, score: cosine(query, item.vector), i }))
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .map(({ item, score }, rank) => ({ item, score, rank: rank + 1 }));
}
