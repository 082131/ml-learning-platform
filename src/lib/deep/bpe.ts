/**
 * A toy byte-pair encoding (BPE) tokenizer, written to match the Python program the tokenization
 * lesson shows (BPE_SOURCE in bpeTrace.ts) step for step, including how ties are broken:
 *
 * - The corpus is split on whitespace into words; each word starts as a list of its characters.
 * - Each merge counts every adjacent pair of symbols, weighted by how often its word occurs, and
 *   joins the most frequent pair everywhere. Ties go to the pair seen first (words in order of
 *   first appearance, pairs left to right), which is what Python's `max(pairs, key=pairs.get)` does.
 * - Token IDs: 0 is [UNK], then the base characters sorted by code point, then each new token in
 *   the order it was learned (a token is added once, even if two different merges produce it).
 * - Encoding splits on whitespace, turns characters outside the base vocabulary into [UNK], and
 *   applies the learned merges in training order.
 */

export const UNK = '[UNK]';

export type Pair = readonly [string, string];

export interface PairCount {
  pair: Pair;
  count: number;
}

export interface WordState {
  word: string;
  count: number;
  symbols: string[];
}

export interface BpeMerge {
  /** 1-based, as the Python program prints it. */
  step: number;
  pair: Pair;
  count: number;
  token: string;
  /** The ID of `token` in the final vocabulary. */
  id: number;
  /** Every pair counted in this iteration, in first-seen order (the order Python's dict keeps). */
  pairCounts: PairCount[];
  before: WordState[];
  after: WordState[];
}

export interface BpeModel {
  words: WordState[];
  base: string[];
  vocab: string[];
  merges: BpeMerge[];
  /** True when training ran out of pairs before reaching the requested number of merges. */
  stoppedEarly: boolean;
}

export interface EncodedToken {
  token: string;
  id: number;
  /** The characters of the input that became this token (differs from `token` for [UNK]). */
  source: string;
  unknown: boolean;
}

/** Splits like Python's str.split() with no argument: runs of whitespace, no empty strings. */
export const splitWords = (text: string) => text.split(/\s+/u).filter((w) => w.length > 0);

/** Characters as Python iterates a string: by code point, not by UTF-16 unit. */
export const chars = (s: string) => Array.from(s);

const byCodePoint = (a: string, b: string) => a.codePointAt(0)! - b.codePointAt(0)!;

/** Replaces every non-overlapping occurrence of `pair`, scanning left to right. */
export function mergePair(symbols: readonly string[], pair: Pair): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < symbols.length) {
    if (i + 1 < symbols.length && symbols[i] === pair[0] && symbols[i + 1] === pair[1]) {
      out.push(symbols[i]! + symbols[i + 1]!);
      i += 2;
    } else {
      out.push(symbols[i]!);
      i += 1;
    }
  }
  return out;
}

/** Word counts in order of first appearance. */
export function countWords(corpus: string): WordState[] {
  const counts = new Map<string, number>();
  for (const w of splitWords(corpus)) counts.set(w, (counts.get(w) ?? 0) + 1);
  return [...counts].map(([word, count]) => ({ word, count, symbols: chars(word) }));
}

/** Adjacent pair counts weighted by word frequency, in first-seen order. */
export function countPairs(words: readonly WordState[]): PairCount[] {
  const counts = new Map<string, PairCount>();
  for (const w of words)
    for (let i = 0; i + 1 < w.symbols.length; i++) {
      const pair: Pair = [w.symbols[i]!, w.symbols[i + 1]!];
      const key = `${pair[0]}\u0000${pair[1]}`;
      const found = counts.get(key);
      if (found) found.count += w.count;
      else counts.set(key, { pair, count: w.count });
    }
  return [...counts.values()];
}

/** The most frequent pair; the first one seen wins a tie. Undefined when there are no pairs. */
export function bestPair(pairs: readonly PairCount[]): PairCount | undefined {
  let best: PairCount | undefined;
  for (const p of pairs) if (!best || p.count > best.count) best = p;
  return best;
}

/** Trains on `corpus` for up to `numMerges` merges. */
export function trainBpe(corpus: string, numMerges: number): BpeModel {
  let words = countWords(corpus);
  const initial = words;
  const base = [...new Set(words.flatMap((w) => w.symbols))].sort(byCodePoint);
  const vocab = [UNK, ...base];
  const learned: Omit<BpeMerge, 'id'>[] = [];
  let stoppedEarly = false;
  for (let step = 0; step < numMerges; step++) {
    const pairCounts = countPairs(words);
    const best = bestPair(pairCounts);
    if (!best) {
      stoppedEarly = true;
      break;
    }
    const token = best.pair[0] + best.pair[1];
    if (!vocab.includes(token)) vocab.push(token);
    const after = words.map((w) => ({ ...w, symbols: mergePair(w.symbols, best.pair) }));
    learned.push({
      step: step + 1,
      pair: best.pair,
      count: best.count,
      token,
      pairCounts,
      before: words,
      after,
    });
    words = after;
  }
  const merges = learned.map((m) => ({ ...m, id: vocab.indexOf(m.token) }));
  return { words: initial, base, vocab, merges, stoppedEarly };
}

/** Tokenizes `text` with a trained model. */
export function encode(model: BpeModel, text: string): EncodedToken[] {
  const known = new Set(model.base);
  const out: EncodedToken[] = [];
  for (const word of splitWords(text)) {
    // Track which input characters each symbol covers, so [UNK] can show what it replaced.
    let symbols = chars(word).map((ch) => ({ s: known.has(ch) ? ch : UNK, src: ch }));
    for (const m of model.merges) {
      const next: typeof symbols = [];
      for (let i = 0; i < symbols.length; i++) {
        const a = symbols[i]!;
        const b = symbols[i + 1];
        if (b && a.s === m.pair[0] && b.s === m.pair[1]) {
          next.push({ s: a.s + b.s, src: a.src + b.src });
          i++;
        } else next.push(a);
      }
      symbols = next;
    }
    for (const { s, src } of symbols)
      out.push({ token: s, id: model.vocab.indexOf(s), source: src, unknown: s === UNK });
  }
  return out;
}

/** Exactly what the lesson's Python program prints for these inputs (checked against CPython 3.13). */
export function bpeProgramOutput(model: BpeModel, tokens: readonly EncodedToken[]): string {
  const lines = model.merges.map((m) => `merge ${m.step}: ${m.pair[0]} + ${m.pair[1]} (count ${m.count})`);
  lines.push(`${model.vocab.length} tokens in the vocabulary`);
  lines.push(`[${tokens.map((t) => t.id).join(', ')}]`);
  lines.push(tokens.map((t) => t.token).join(' | '));
  return lines.join('\n');
}

/** A Python string literal in double quotes, for filling code slots. */
export const pyString = (s: string) => `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
