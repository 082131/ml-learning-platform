import corpus from './data/corpus.json';
import rag from './data/rag-embeddings.json';
import type { Doc } from './chunking';
import { decodeFloat16Rows } from './float16';
import type { RagQuery } from './ragExperiment';

/** The fictional Lumen Notes help center used by the RAG and agent lessons. */
export const lumenDocs: Doc[] = corpus.docs;
export const lumenQueries: RagQuery[] = corpus.ragQueries;
export const ragModel = rag.model;

/** The bundled embedding of every chunk text (all sizes and overlaps) and every question. */
export function lumenVectors(): Map<string, number[]> {
  const rows = decodeFloat16Rows(rag.vectors, rag.texts.length);
  return new Map(rag.texts.map((t, i) => [t, rows[i]!]));
}
