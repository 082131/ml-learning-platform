import { describe, expect, it } from 'vitest';
import { validateExperiment } from '../experiment';
import fixtures from './data/wordpiece-fixtures.json';
import vocabText from './data/vocab.txt?raw';
import { pyList, pyStr } from './pythonRepr';
import { tokenizerExperiment } from './tokenizerExperiment';
import { parseVocab } from './wordpiece';

const vocab = parseVocab(vocabText);

describe('Python repr', () => {
  it('quotes strings the way Python does', () => {
    expect(pyStr('hi')).toBe("'hi'");
    expect(pyStr("it's")).toBe('"it\'s"');
    expect(pyStr(`it's "x"`)).toBe(`'it\\'s "x"'`);
    expect(pyStr('a\\b\tc')).toBe("'a\\\\b\\tc'");
    expect(pyList([101, 102])).toBe('[101, 102]');
  });

  it.each(fixtures.cases)('prints enc.tokens like Python for "$text"', ({ tokens, printed }) => {
    expect(pyList(tokens)).toBe(printed);
  });
});

describe('tokenizerExperiment', () => {
  const def = tokenizerExperiment('t', 'Tokenizers split unbelievably long words into pieces.', 5, vocab);

  it('is valid and starts on the selected token', () => {
    expect(validateExperiment(def)).toEqual([]);
    const r = def.compute(def.initial);
    expect(r.encoding.tokens[5]!.text).toBe('un');
    expect(r.search?.word).toBe('unbelievably');
    expect(r.search?.pieces.pieces).toEqual(['un', '##bel', '##ie', '##va', '##bly']);
  });

  it('reads out what the Python code prints, and the counts', () => {
    const out = def.readout!(def.initial, def.compute(def.initial));
    expect(out[0]!.value).toBe(fixtures.cases[0]!.printed);
    expect(out[1]!.value).toBe(`[${fixtures.cases[0]!.ids.join(', ')}]`);
    expect(out[2]!.value).toBe('53 characters · 8 words and punctuation marks · 16 tokens (incl. [CLS], [SEP])');
  });

  it('keeps the selection inside a shorter text and has no word search for [SEP]', () => {
    const r = def.compute({ text: 'hi', selected: 9 });
    expect(r.encoding.tokens.map((t) => t.text)).toEqual(['[CLS]', 'hi', '[SEP]']);
    expect(r.search).toBeUndefined();
  });

  it('handles empty text as just [CLS] and [SEP]', () => {
    expect(def.compute({ text: '', selected: 0 }).encoding.tokens.map((t) => t.id)).toEqual([101, 102]);
  });
});
