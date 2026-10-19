import type { ExperimentDef } from '../types';
import { pyList, pyStr } from './pythonRepr';
import { encode, wordPiece, type Encoding, type Vocab, type WordPieces } from './wordpiece';

export interface TokenizerState {
  text: string;
  /** Index of the selected token in the encoding. */
  selected: number;
}

export interface TokenizerResult {
  encoding: Encoding;
  /** The WordPiece search for the selected token's word, or undefined for [CLS] and [SEP]. */
  search?: { word: string; pieces: WordPieces };
  characters: number;
}

export const MAX_TEXT_LENGTH = 200;

/** Clamps the selection into the encoding, so a shorter text never points past its last token. */
export const selectedToken = (s: TokenizerState, r: TokenizerResult) =>
  r.encoding.tokens[Math.min(s.selected, r.encoding.tokens.length - 1)]!;

export function computeTokenizer(s: TokenizerState, vocab: Vocab): TokenizerResult {
  const encoding = encode(s.text, vocab);
  const token = encoding.tokens[Math.min(s.selected, encoding.tokens.length - 1)]!;
  const word = token.word >= 0 ? encoding.words[token.word]! : undefined;
  return {
    encoding,
    search: word === undefined ? undefined : { word, pieces: wordPiece(word, vocab) },
    characters: [...s.text].length,
  };
}

/**
 * The tokenizer playground: the learner's text is tokenized live with the model's real vocabulary.
 * The token list, the Python code's string literal and the printed output all come from this state.
 */
export function tokenizerExperiment(id: string, text: string, selected: number, vocab: Vocab): ExperimentDef<TokenizerState, TokenizerResult> {
  return {
    id,
    initial: { text, selected },
    controls: [
      {
        kind: 'text',
        id: 'text',
        label: 'Text to tokenize',
        maxLength: MAX_TEXT_LENGTH,
        get: (s) => s.text,
        set: (s, v) => ({ ...s, text: v }),
      },
    ],
    compute: (s) => computeTokenizer(s, vocab),
    readout: (_, r) => {
      const tokens = r.encoding.tokens;
      return [
        { label: 'print(enc.tokens)', value: pyList(tokens.map((t) => t.text)) },
        { label: 'print(enc.ids)', value: pyList(tokens.map((t) => t.id)) },
        {
          label: 'Counts',
          value: `${r.characters} characters · ${r.encoding.words.length} words and punctuation marks · ${tokens.length} tokens (incl. [CLS], [SEP])`,
        },
      ];
    },
  };
}

/** The text as a Python string literal, for the code's `{{text}}` slot. */
export const textSlot = (s: unknown) => pyStr((s as TokenizerState).text);
