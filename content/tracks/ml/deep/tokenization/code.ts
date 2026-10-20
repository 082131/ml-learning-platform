// Code for the tokenization lesson. The BPE program's printout was produced by running it with
// CPython 3.13.16; bpe.test.ts checks that the TypeScript port prints the same for several inputs.
import { pyString } from '@/lib/deep/bpe';
import { BPE_SOURCE, bpeExperiment, bpeSlots, computeBpe, type BpeState } from '@/lib/deep/bpeExperiment';
import type { CodeExample } from '@/lib/types';

/** Sennrich et al.'s (2016) example corpus: low ×5, lower ×2, newest ×6, widest ×3. */
export const CORPUS =
  'low low low low low lower lower newest newest newest newest newest newest widest widest widest';
export const TEXT = 'lowest newer wider!';
export const MERGES = 10;

const TRAIN_ID = 'bpe-train';

/** One state for the lesson: the merge view, the token view, the code, the trace and the readout. */
export const experiment = bpeExperiment('bpe', { corpus: CORPUS, text: TEXT, numMerges: MERGES }, TRAIN_ID);

const st = (s: unknown) => s as BpeState;

export const bpeTrain: CodeExample = {
  id: TRAIN_ID,
  language: 'python',
  source: BPE_SOURCE,
  slots: {
    corpus: (s) => bpeSlots(st(s)).corpus!,
    num_merges: (s) => bpeSlots(st(s)).num_merges!,
    text: (s) => bpeSlots(st(s)).text!,
  },
  annotations: [
    {
      id: 'corpus',
      range: { line: 1, startCol: 9, endCol: 19 },
      match: '{{corpus}}',
      kind: 'parameter',
      title: 'The training corpus',
      what: 'The text the tokenizer learns its vocabulary from, filled from the experiment.',
      why: 'Merges come only from pairs that are frequent in this text, so a different corpus gives a different vocabulary.',
    },
    {
      id: 'num-merges',
      range: { line: 2, startCol: 13, endCol: 27 },
      match: '{{num_merges}}',
      kind: 'parameter',
      title: 'num_merges',
      what: 'How many merge steps to run. Each step adds at most one token.',
      why: 'This is the knob that sets the vocabulary size: base characters + merges (+ the [UNK] fallback here).',
    },
    {
      id: 'merge-pair',
      range: { line: 5, startCol: 4, endCol: 14 },
      match: 'merge_pair',
      kind: 'function',
      title: 'merge_pair(symbols, pair)',
      what: 'Walks a list of symbols left to right and joins every occurrence of the pair into one symbol.',
      why: 'Both training (rewriting the words) and encoding (applying the merges to new text) need exactly this step.',
      inputs: "symbols: a list of strings such as ['l', 'o', 'w']; pair: a tuple such as ('l', 'o')",
      output: "A new list, for example ['lo', 'w']",
    },
    {
      id: 'split',
      range: { line: 18, startCol: 12, endCol: 26 },
      match: 'corpus.split()',
      kind: 'function',
      title: 'corpus.split()',
      what: 'Splits the text at runs of whitespace into a list of words.',
      why: 'This is the pre-tokenization step: merges never cross a word boundary. The spaces themselves are thrown away (see the simplification note).',
    },
    {
      id: 'list-w',
      range: { line: 20, startCol: 12, endCol: 19 },
      match: 'list(w)',
      kind: 'function',
      title: 'list(w)',
      what: 'Turns a word into a list of its characters: list("low") is [\'l\', \'o\', \'w\'].',
      why: 'BPE starts from the smallest units and builds bigger tokens from them.',
    },
    {
      id: 'base-vocab',
      range: { line: 21, startCol: 20, endCol: 48 },
      match: 'sorted(set("".join(counts)))',
      kind: 'syntax',
      title: 'The base vocabulary',
      what: 'Joins all distinct words, keeps each character once (set) and sorts them.',
      why: 'Every character of the corpus gets an ID, so any word made only of these characters can be tokenized. "[UNK]" goes first, with ID 0.',
      output: 'A list such as [\'[UNK]\', \'d\', \'e\', …]',
    },
    {
      id: 'zip',
      range: { line: 27, startCol: 20, endCol: 45 },
      match: 'zip(symbols, symbols[1:])',
      kind: 'function',
      title: 'zip(symbols, symbols[1:])',
      what: 'Pairs each symbol with the one after it: for [l, o, w] it gives (l, o) and (o, w).',
      why: 'These adjacent pairs are the merge candidates.',
    },
    {
      id: 'weight',
      range: { line: 28, startCol: 47, endCol: 56 },
      match: 'counts[w]',
      kind: 'variable',
      title: 'counts[w]',
      what: 'How many times this word occurs in the corpus.',
      why: 'Each word is stored once, so a pair inside a word that occurs 6 times counts 6, not 1.',
    },
    {
      id: 'no-pairs',
      range: { line: 29, startCol: 7, endCol: 16 },
      match: 'not pairs',
      kind: 'syntax',
      title: 'if not pairs: break',
      what: 'An empty dict is false, so this stops when no word has two symbols left.',
      why: 'At that point every word is a single token and there is nothing left to merge.',
    },
    {
      id: 'max',
      range: { line: 31, startCol: 11, endCol: 36 },
      match: 'max(pairs, key=pairs.get)',
      kind: 'function',
      title: 'max(pairs, key=pairs.get)',
      what: 'Returns the pair with the highest count.',
      why: 'Merging the most frequent pair saves the most tokens. When counts tie, max returns the first pair it meets, and dicts keep insertion order, so ties go to the pair counted first.',
    },
    {
      id: 'rewrite',
      range: { line: 36, startCol: 16, endCol: 35 },
      match: 'merge_pair(s, best)',
      kind: 'function',
      title: 'Rewrite every word',
      what: 'Applies the new merge to every word.',
      why: 'The next iteration counts pairs over the merged symbols, so a merged token can merge again (es + t → est).',
    },
    {
      id: 'unk',
      range: { line: 42, startCol: 42, endCol: 49 },
      match: '"[UNK]"',
      kind: 'syntax',
      title: 'The unknown-character fallback',
      what: 'A character that is not in the vocabulary is replaced by the special token [UNK].',
      why: 'Without a fallback, vocab.index would fail on a character the corpus never contained. Byte-level tokenizers avoid this case entirely (see below).',
    },
    {
      id: 'apply-merges',
      range: { line: 43, startCol: 8, endCol: 26 },
      match: 'for pair in merges',
      kind: 'syntax',
      title: 'Apply the merges in training order',
      what: 'Replays every learned merge, first to last, on the new word.',
      why: 'The order matters: est can only form after es has formed. Using the same order as training makes encoding deterministic.',
    },
    {
      id: 'index',
      range: { line: 45, startCol: 16, endCol: 30 },
      match: 'vocab.index(s)',
      kind: 'function',
      title: 'vocab.index(s)',
      what: 'Finds the position of a token in the vocabulary list: its token ID.',
      why: 'Models take integers, not strings. (A real tokenizer uses a dict for this lookup, which is faster than searching a list.)',
    },
  ],
};

const initial = experiment.initial;
const filledDefault = BPE_SOURCE.replace('{{corpus}}', pyString(CORPUS))
  .replace('{{num_merges}}', String(MERGES))
  .replace('{{text}}', pyString(TEXT));

/** The same program with the starting inputs, to run in the browser with Pyodide (pure Python). */
export const bpeRunner: CodeExample = {
  id: 'bpe-runner',
  language: 'python',
  run: 'pyodide',
  source: filledDefault,
  annotations: [],
  expectedOutput: computeBpe(initial).output,
};
