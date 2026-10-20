import { describe, expect, it } from 'vitest';
import { validateTrace } from '../code/validate';
import { fillSlots } from '../code/slots';
import { validateExperiment } from '../experiment';
import { bestPair, countPairs, countWords, encode, mergePair, pyString, trainBpe, UNK } from './bpe';
import { BPE_SOURCE, bpeExperiment, bpeSlots, buildBpeTrace, computeBpe } from './bpeExperiment';

const SENNRICH =
  'low low low low low lower lower newest newest newest newest newest newest widest widest widest';

/**
 * Real output of BPE_SOURCE with these inputs, run with CPython 3.13.16 (python3 -I, slots filled
 * with pyString). Each case is the printout copied exactly.
 */
const PYTHON_RUNS = [
  {
    corpus: SENNRICH,
    n: 10,
    text: 'lowest newer wider!',
    output:
      'merge 1: e + s (count 9)\nmerge 2: es + t (count 9)\nmerge 3: l + o (count 7)\nmerge 4: lo + w (count 7)\nmerge 5: n + e (count 6)\nmerge 6: ne + w (count 6)\nmerge 7: new + est (count 6)\nmerge 8: w + i (count 3)\nmerge 9: wi + d (count 3)\nmerge 10: wid + est (count 3)\n21 tokens in the vocabulary\n[14, 12, 16, 2, 7, 19, 2, 7, 0]\nlow | est | new | e | r | wid | e | r | [UNK]',
  },
  { corpus: SENNRICH, n: 0, text: 'low', output: '11 tokens in the vocabulary\n[4, 6, 10]\nl | o | w' },
  {
    corpus: 'aaa abab ba "q" a\\b',
    n: 30,
    text: 'abba zz "q"',
    output:
      'merge 1: a + a (count 2)\nmerge 2: a + b (count 2)\nmerge 3: aa + a (count 1)\nmerge 4: ab + ab (count 1)\nmerge 5: b + a (count 1)\nmerge 6: " + q (count 1)\nmerge 7: "q + " (count 1)\nmerge 8: a + \\ (count 1)\nmerge 9: a\\ + b (count 1)\n15 tokens in the vocabulary\n[7, 10, 0, 0, 12]\nab | ba | [UNK] | [UNK] | "q"',
  },
  {
    corpus: 'the cat sat on the mat the cat ate',
    n: 6,
    text: 'the hat sat',
    output:
      'merge 1: a + t (count 5)\nmerge 2: t + h (count 3)\nmerge 3: th + e (count 3)\nmerge 4: c + at (count 2)\nmerge 5: s + at (count 1)\nmerge 6: o + n (count 1)\n16 tokens in the vocabulary\n[12, 4, 10, 14]\nthe | h | at | sat',
  },
];

describe('BPE building blocks', () => {
  it('merges non-overlapping pairs left to right', () => {
    expect(mergePair(['a', 'a', 'a'], ['a', 'a'])).toEqual(['aa', 'a']);
    expect(mergePair(['l', 'o', 'w'], ['o', 'w'])).toEqual(['l', 'ow']);
    expect(mergePair(['x'], ['x', 'x'])).toEqual(['x']);
  });

  it('counts pairs weighted by word frequency, in first-seen order', () => {
    // low ×2, lot ×1: (l, o) = 2 + 1 = 3, (o, w) = 2, (o, t) = 1.
    const words = countWords('low lot low');
    expect(words.map((w) => [w.word, w.count])).toEqual([
      ['low', 2],
      ['lot', 1],
    ]);
    expect(countPairs(words)).toEqual([
      { pair: ['l', 'o'], count: 3 },
      { pair: ['o', 'w'], count: 2 },
      { pair: ['o', 't'], count: 1 },
    ]);
  });

  it('breaks ties in favour of the pair seen first, like Python max over a dict', () => {
    expect(
      bestPair([
        { pair: ['b', 'c'], count: 2 },
        { pair: ['a', 'b'], count: 2 },
      ])?.pair,
    ).toEqual(['b', 'c']);
    expect(bestPair([])).toBeUndefined();
  });
});

describe('trainBpe and encode', () => {
  it('learns the hand-worked first merges of the classic example', () => {
    // e+s appears in newest (6) and widest (3): 9. s+t also 9 but is counted after e+s.
    const model = trainBpe(SENNRICH, 3);
    expect(model.base).toEqual(['d', 'e', 'i', 'l', 'n', 'o', 'r', 's', 't', 'w']);
    expect(model.merges.map((m) => [m.token, m.count, m.id])).toEqual([
      ['es', 9, 11],
      ['est', 9, 12],
      ['lo', 7, 13],
    ]);
    expect(model.merges[0]!.after.find((w) => w.word === 'widest')!.symbols).toEqual(['w', 'i', 'd', 'es', 't']);
  });

  it('maps unseen characters to [UNK] and remembers what they replaced', () => {
    const model = trainBpe('ab ab', 1);
    expect(encode(model, 'abc')).toEqual([
      { token: 'ab', id: 3, source: 'ab', unknown: false },
      { token: UNK, id: 0, source: 'c', unknown: true },
    ]);
  });

  it('stops early when every word is a single token', () => {
    const model = trainBpe('ab', 5);
    expect(model.merges).toHaveLength(1);
    expect(model.stoppedEarly).toBe(true);
  });

  it('counts characters by code point, as Python does', () => {
    expect(trainBpe('😀😀', 1).base).toEqual(['😀']);
  });

  it.each(PYTHON_RUNS)('prints exactly what CPython printed for $text', ({ corpus, n, text, output }) => {
    expect(computeBpe({ corpus, numMerges: n, text, selected: 0 }).output).toBe(output);
  });

  it('writes Python string literals with escaped quotes and backslashes', () => {
    expect(pyString('a"b\\c')).toBe('"a\\"b\\\\c"');
  });
});

describe('bpeExperiment', () => {
  const def = bpeExperiment('bpe', { corpus: SENNRICH, text: 'lowest newer wider!', numMerges: 10 }, 'bpe-train');

  it('is valid, and its trace fits the filled source', () => {
    expect(validateExperiment(def)).toEqual([]);
    const { source } = fillSlots(BPE_SOURCE, [], bpeSlots(def.initial));
    expect(validateTrace(def.trace!(def.initial), source)).toEqual([]);
    expect(source.split('\n')[0]).toBe(`corpus = "${SENNRICH}"`);
  });

  it('steps through setup, three steps per merge, then encoding', () => {
    const trace = buildBpeTrace(def.initial);
    expect(trace.steps).toHaveLength(6 + 3 * 10 + 2);
    expect(trace.steps[7]!.note).toBe(
      'The most frequent pair is (e, s) with count 9. 2 pairs tie at 9; max keeps the one counted first.',
    );
    expect(trace.steps.at(-2)!.note).toContain('! never appeared in the corpus');
  });

  it('reads out the vocabulary arithmetic', () => {
    const items = def.readout!(def.initial, def.compute(def.initial));
    expect(items[1]!.value).toBe('1 [UNK] + 10 characters + 10 merged = 21');
    expect(items[2]!.value).toBe('17 → 9');
  });
});
