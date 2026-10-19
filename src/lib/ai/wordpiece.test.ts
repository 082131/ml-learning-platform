import { describe, expect, it } from 'vitest';
import fixtures from './data/wordpiece-fixtures.json';
import vocabText from './data/vocab.txt?raw';
import { encode, normalize, parseVocab, preTokenize, wordPiece } from './wordpiece';

const vocab = parseVocab(vocabText);

describe('WordPiece', () => {
  it('reads the 30,522-token vocabulary with IDs equal to line numbers', () => {
    expect(vocab.size).toBe(30522);
    expect(vocab.get('[PAD]')).toBe(0);
    expect(vocab.get('[UNK]')).toBe(100);
    expect(vocab.get('[CLS]')).toBe(101);
    expect(vocab.get('[SEP]')).toBe(102);
  });

  it('normalizes like BertNormalizer: lowercase, accents stripped, Chinese characters spaced out', () => {
    expect(normalize('Café Déjà')).toBe('cafe deja');
    expect(normalize('日本')).toBe(' 日  本 ');
    expect(normalize('a\tb\u0000c')).toBe('a bc');
  });

  it('splits on whitespace and makes each punctuation character a word', () => {
    expect(preTokenize("don't stop...")).toEqual(['don', "'", 't', 'stop', '.', '.', '.']);
    expect(preTokenize('e-402: $5')).toEqual(['e', '-', '402', ':', '$', '5']);
  });

  it('finds the longest known prefix first (hand-checked against vocab.txt)', () => {
    const r = wordPiece('unbelievably', vocab);
    expect(r.pieces).toEqual(['un', '##bel', '##ie', '##va', '##bly']);
    // The first attempt is the whole word; it is not in the vocabulary.
    expect(r.attempts[0]).toEqual({ start: 0, candidate: 'unbelievably', found: false });
    expect(r.attempts.filter((a) => a.found).map((a) => a.candidate)).toEqual(r.pieces);
  });

  it('turns a word with no known pieces, or over 100 characters, into [UNK]', () => {
    expect(wordPiece('🙂', vocab)).toMatchObject({ pieces: ['[UNK]'], unknown: true });
    expect(wordPiece('a'.repeat(101), vocab)).toMatchObject({ pieces: ['[UNK]'], unknown: true });
  });

  it.each(fixtures.cases)('matches the tokenizers library on "$text"', ({ text, tokens, ids }) => {
    const enc = encode(text, vocab);
    expect(enc.tokens.map((t) => t.text)).toEqual(tokens);
    expect(enc.tokens.map((t) => t.id)).toEqual(ids);
  });

  it('records which word each token came from', () => {
    const enc = encode('Tokenizers work', vocab);
    expect(enc.words).toEqual(['tokenizers', 'work']);
    expect(enc.tokens.map((t) => [t.text, t.word])).toEqual([
      ['[CLS]', -1],
      ['token', 0],
      ['##izer', 0],
      ['##s', 0],
      ['work', 1],
      ['[SEP]', -1],
    ]);
  });
});
