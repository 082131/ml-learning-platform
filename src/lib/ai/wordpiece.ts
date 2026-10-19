// A BERT WordPiece tokenizer, matching the `tokenizers` library's BertNormalizer, BertPreTokenizer
// and WordPiece model as configured for all-MiniLM-L6-v2 (lowercase, accents stripped, Chinese
// characters split, "##" continuation prefix, words over 100 characters become [UNK]).
// Checked against the library's own output in wordpiece.test.ts.

export const SPECIAL = { cls: '[CLS]', sep: '[SEP]', unk: '[UNK]', pad: '[PAD]' } as const;
export const CONTINUATION = '##';
export const MAX_WORD_CHARS = 100;

export type Vocab = ReadonlyMap<string, number>;

/** vocab.txt has one token per line; the line number (from 0) is the token ID. */
export function parseVocab(text: string): Vocab {
  const lines = text.split('\n');
  if (lines.at(-1) === '') lines.pop();
  return new Map(lines.map((token, id) => [token, id]));
}

const isWhitespace = (c: string) => /^[\s]$/u.test(c);
const isControl = (c: string) => !['\t', '\n', '\r'].includes(c) && /^[\p{Cc}\p{Cf}]$/u.test(c);
// BERT treats all ASCII symbols as punctuation, plus every Unicode punctuation character.
const isPunctuation = (c: string) => {
  const cp = c.codePointAt(0)!;
  const asciiSymbol = (cp >= 33 && cp <= 47) || (cp >= 58 && cp <= 64) || (cp >= 91 && cp <= 96) || (cp >= 123 && cp <= 126);
  return asciiSymbol || /^\p{P}$/u.test(c);
};
const CJK_RANGES: [number, number][] = [
  [0x4e00, 0x9fff],
  [0x3400, 0x4dbf],
  [0x20000, 0x2a6df],
  [0x2a700, 0x2b73f],
  [0x2b740, 0x2b81f],
  [0x2b820, 0x2ceaf],
  [0xf900, 0xfaff],
  [0x2f800, 0x2fa1f],
];
const isCjk = (c: string) => {
  const cp = c.codePointAt(0)!;
  return CJK_RANGES.some(([lo, hi]) => cp >= lo && cp <= hi);
};

/** Cleans, lowercases and strips accents, as BertNormalizer does: "Café" → "cafe". */
export function normalize(text: string): string {
  let out = '';
  for (const c of text) {
    const cp = c.codePointAt(0)!;
    if (cp === 0 || cp === 0xfffd || isControl(c)) continue;
    if (isWhitespace(c)) out += ' ';
    else if (isCjk(c)) out += ` ${c} `;
    else out += c;
  }
  return out
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')
    .toLowerCase();
}

/** Splits normalized text on whitespace, and makes every punctuation character its own word. */
export function preTokenize(normalized: string): string[] {
  const words: string[] = [];
  let current = '';
  const flush = () => {
    if (current) words.push(current);
    current = '';
  };
  for (const c of normalized) {
    if (isWhitespace(c)) flush();
    else if (isPunctuation(c)) {
      flush();
      words.push(c);
    } else current += c;
  }
  flush();
  return words;
}

/** One attempt of the greedy longest-match search, for the step-through. */
export interface PieceAttempt {
  /** Where the remaining part of the word starts (in characters). */
  start: number;
  candidate: string;
  found: boolean;
}

export interface WordPieces {
  pieces: string[];
  attempts: PieceAttempt[];
  /** True when the word could not be split into known pieces (or was too long) and became [UNK]. */
  unknown: boolean;
}

/**
 * Greedy longest-match-first: from the current position, try the longest remaining substring, then
 * shorter ones, until one is in the vocabulary. Pieces after the first carry the "##" prefix. If no
 * prefix of the remainder is known, the whole word becomes [UNK].
 */
export function wordPiece(word: string, vocab: Vocab): WordPieces {
  const chars = [...word];
  const attempts: PieceAttempt[] = [];
  if (chars.length > MAX_WORD_CHARS) return { pieces: [SPECIAL.unk], attempts, unknown: true };
  const pieces: string[] = [];
  let start = 0;
  while (start < chars.length) {
    let end = chars.length;
    let piece: string | undefined;
    while (end > start) {
      const candidate = (start > 0 ? CONTINUATION : '') + chars.slice(start, end).join('');
      const found = vocab.has(candidate);
      attempts.push({ start, candidate, found });
      if (found) {
        piece = candidate;
        break;
      }
      end--;
    }
    if (piece === undefined) return { pieces: [SPECIAL.unk], attempts, unknown: true };
    pieces.push(piece);
    start = end;
  }
  return { pieces, attempts, unknown: false };
}

export interface Token {
  text: string;
  id: number;
  /** Index of the word (after pre-tokenization) this token came from; -1 for [CLS] and [SEP]. */
  word: number;
  special: boolean;
}

export interface Encoding {
  words: string[];
  tokens: Token[];
}

/** The full pipeline: normalize, split into words, split words into pieces, add [CLS] and [SEP]. */
export function encode(text: string, vocab: Vocab): Encoding {
  const id = (t: string) => {
    const v = vocab.get(t);
    if (v === undefined) throw new Error(`"${t}" is not in the vocabulary`);
    return v;
  };
  const words = preTokenize(normalize(text));
  const tokens: Token[] = [{ text: SPECIAL.cls, id: id(SPECIAL.cls), word: -1, special: true }];
  words.forEach((w, word) => {
    for (const piece of wordPiece(w, vocab).pieces)
      tokens.push({ text: piece, id: id(piece), word, special: piece === SPECIAL.unk });
  });
  tokens.push({ text: SPECIAL.sep, id: id(SPECIAL.sep), word: -1, special: true });
  return { words, tokens };
}
