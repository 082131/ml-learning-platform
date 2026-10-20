/** Chunk sizes and overlaps (in words) that the bundled RAG embeddings cover. Must match generate_embeddings.py. */
export const CHUNK_SIZES = [20, 40, 80] as const;
export const CHUNK_OVERLAPS = [0, 10] as const;

/**
 * Splits text into windows of `size` words; consecutive windows share `overlap` words. The last
 * window may be shorter. Same rule as chunk_words in scripts/ai/generate_embeddings.py.
 */
export function chunkWords(text: string, size: number, overlap: number): string[] {
  if (!Number.isInteger(size) || size < 1)
    throw new Error('Chunk size must be a whole number of at least 1 word.');
  if (!Number.isInteger(overlap) || overlap < 0 || overlap >= size)
    throw new Error('Overlap must be a whole number from 0 to one less than the chunk size.');
  const words = text.split(/\s+/).filter(Boolean);
  const stride = size - overlap;
  const chunks: string[] = [];
  for (let start = 0; ; start += stride) {
    chunks.push(words.slice(start, start + size).join(' '));
    if (start + size >= words.length) return chunks;
  }
}

export interface Doc {
  id: string;
  title: string;
  text: string;
}

export interface Chunk {
  /** `doc#index`, for example `security#2`. */
  id: string;
  doc: string;
  title: string;
  index: number;
  text: string;
}

/** Chunks every document separately, so no chunk mixes two documents. */
export function chunkDocs(docs: readonly Doc[], size: number, overlap: number): Chunk[] {
  return docs.flatMap((d) =>
    chunkWords(d.text, size, overlap).map((text, index) => ({
      id: `${d.id}#${index}`,
      doc: d.id,
      title: d.title,
      index,
      text,
    })),
  );
}
