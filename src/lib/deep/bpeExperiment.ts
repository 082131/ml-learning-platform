import { array, scalar, text } from '../trace/values';
import type { ExperimentDef, Trace, TraceStep } from '../types';
import {
  bpeProgramOutput,
  encode,
  pyString,
  trainBpe,
  UNK,
  type BpeModel,
  type EncodedToken,
  type WordState,
} from './bpe';

/**
 * The Python program the tokenization lesson shows, steps through and runs. Its output for any
 * inputs is reproduced by bpeProgramOutput (checked against CPython 3.13 in bpe.test.ts).
 */
export const BPE_SOURCE = `corpus = {{corpus}}
num_merges = {{num_merges}}
text = {{text}}

def merge_pair(symbols, pair):
    out, i = [], 0
    while i < len(symbols):
        if i + 1 < len(symbols) and (symbols[i], symbols[i + 1]) == pair:
            out.append(symbols[i] + symbols[i + 1])
            i += 2
        else:
            out.append(symbols[i])
            i += 1
    return out

# Training: count the words, then start from single characters.
counts = {}
for word in corpus.split():
    counts[word] = counts.get(word, 0) + 1
words = {w: list(w) for w in counts}
vocab = ["[UNK]"] + sorted(set("".join(counts)))
merges = []

for step in range(num_merges):
    pairs = {}
    for w, symbols in words.items():
        for pair in zip(symbols, symbols[1:]):
            pairs[pair] = pairs.get(pair, 0) + counts[w]
    if not pairs:
        break
    best = max(pairs, key=pairs.get)
    print(f"merge {step + 1}: {best[0]} + {best[1]} (count {pairs[best]})")
    merges.append(best)
    if best[0] + best[1] not in vocab:
        vocab.append(best[0] + best[1])
    words = {w: merge_pair(s, best) for w, s in words.items()}

# Encoding: unknown characters become [UNK], then the merges apply in order.
def encode(text):
    ids = []
    for word in text.split():
        symbols = [ch if ch in vocab else "[UNK]" for ch in word]
        for pair in merges:
            symbols = merge_pair(symbols, pair)
        ids += [vocab.index(s) for s in symbols]
    return ids

ids = encode(text)
print(len(vocab), "tokens in the vocabulary")
print(ids)
print(" | ".join(vocab[i] for i in ids))`;

/** 1-based line numbers in BPE_SOURCE that the trace visits. */
const LINE = {
  corpus: 1,
  merges: 2,
  text: 3,
  counts: 19,
  words: 20,
  vocab: 21,
  loop: 24,
  pairs: 28,
  stop: 30,
  best: 31,
  merge: 36,
  ids: 48,
  print: 51,
} as const;

export interface BpeState {
  corpus: string;
  text: string;
  numMerges: number;
  /** Index into the learned merges of the merge being inspected. */
  selected: number;
}

export interface BpeResult {
  model: BpeModel;
  tokens: EncodedToken[];
  output: string;
}

export const MAX_MERGES = 30;
export const CORPUS_MAX_LENGTH = 240;
export const TEXT_MAX_LENGTH = 60;
/** How many pair counts the trace and the visual list before summarizing the rest. */
export const TOP_PAIRS = 6;

export const bpeSlots = (s: BpeState): Record<string, string> => ({
  corpus: pyString(s.corpus),
  num_merges: String(s.numMerges),
  text: pyString(s.text),
});

export function computeBpe(s: BpeState): BpeResult {
  const model = trainBpe(s.corpus, s.numMerges);
  const tokens = encode(model, s.text);
  return { model, tokens, output: bpeProgramOutput(model, tokens) };
}

/** Words as `low ×5: l o w`, one per entry. */
export const describeWords = (words: readonly WordState[]) =>
  words.map((w) => `${w.word} ×${w.count}: ${w.symbols.join(' ')}`).join(' · ');

const pairText = (p: readonly [string, string]) => `(${p[0]}, ${p[1]})`;

/** The highest pair counts, highest first (stable, so ties keep first-seen order). */
export function topPairs(m: { pairCounts: { pair: readonly [string, string]; count: number }[] }, n = TOP_PAIRS) {
  return [...m.pairCounts].sort((a, b) => b.count - a.count).slice(0, n);
}

/**
 * A computed trace of BPE_SOURCE: the inputs, the word counts, one group of steps per merge
 * (pairs counted, best pair picked, words rewritten) and the encoding of `text`.
 */
export function buildBpeTrace(s: BpeState, r: BpeResult = computeBpe(s)): Trace {
  const { model } = r;
  const steps: TraceStep[] = [];
  const inputs = {
    corpus: text(pyString(s.corpus)),
    num_merges: scalar(s.numMerges),
    text: text(pyString(s.text)),
  };
  steps.push({
    range: { line: LINE.corpus },
    vars: { corpus: inputs.corpus },
    note: `The training corpus: ${model.words.reduce((a, w) => a + w.count, 0)} words, ${model.words.length} of them different.`,
  });
  steps.push({
    range: { line: LINE.merges },
    vars: { corpus: inputs.corpus, num_merges: inputs.num_merges },
    note: `Learn up to ${s.numMerges} merges. Each merge adds at most one token to the vocabulary.`,
  });
  steps.push({
    range: { line: LINE.text },
    vars: inputs,
    note: 'The text to tokenize once training is done.',
  });
  const counts = text(model.words.map((w) => `${w.word}: ${w.count}`).join(', '));
  steps.push({
    range: { line: LINE.counts },
    vars: { ...inputs, counts },
    note: `counts maps each word to how often it occurs: ${model.words.map((w) => `${w.word} ×${w.count}`).join(', ')}.`,
  });
  let words = text(describeWords(model.words));
  steps.push({
    range: { line: LINE.words },
    vars: { ...inputs, counts, words },
    note: 'Every word starts as a list of single characters.',
  });
  let vocabSize = 1 + model.base.length;
  const vocabVar = (n: number) => text(model.vocab.slice(0, n).join(' '));
  steps.push({
    range: { line: LINE.vocab },
    vars: { ...inputs, counts, words, vocab: vocabVar(vocabSize) },
    note: `The base vocabulary: ${UNK} (ID 0) and the ${model.base.length} distinct characters, sorted, with IDs 1 to ${model.base.length}.`,
  });
  const base = () => ({ ...inputs, counts, words, vocab: vocabVar(vocabSize) });
  for (const m of model.merges) {
    const step = scalar(m.step - 1);
    const top = topPairs(m);
    const pairsVar = text(
      top.map((p) => `${pairText(p.pair)}: ${p.count}`).join(', ') +
        (m.pairCounts.length > top.length ? `, … ${m.pairCounts.length - top.length} more` : ''),
    );
    steps.push({
      range: { line: LINE.pairs },
      vars: { ...base(), step, pairs: pairsVar },
      note: `Merge ${m.step}: count every adjacent pair, adding the word's count each time it appears. ${m.pairCounts.length} different pairs.`,
    });
    const tied = m.pairCounts.filter((p) => p.count === m.count).length;
    steps.push({
      range: { line: LINE.best },
      vars: { ...base(), step, pairs: pairsVar, best: text(pairText(m.pair)) },
      note:
        `The most frequent pair is ${pairText(m.pair)} with count ${m.count}.` +
        (tied > 1 ? ` ${tied} pairs tie at ${m.count}; max keeps the one counted first.` : ''),
    });
    vocabSize = Math.max(vocabSize, m.id + 1);
    words = text(describeWords(m.after));
    steps.push({
      range: { line: LINE.merge },
      vars: { ...base(), step, pairs: pairsVar, best: text(pairText(m.pair)) },
      note: `Join ${m.pair[0]} + ${m.pair[1]} into the token "${m.token}" (ID ${m.id}) in every word.`,
    });
  }
  if (model.stoppedEarly)
    steps.push({
      range: { line: LINE.stop },
      vars: base(),
      note: `No adjacent pairs are left (every word is one token), so training stops after ${model.merges.length} merges.`,
    });
  const ids = r.tokens.map((t) => t.id);
  const unknown = r.tokens.filter((t) => t.unknown).map((t) => t.source);
  steps.push({
    range: { line: LINE.ids },
    vars: { ...base(), ids: array(ids) },
    note:
      `encode splits "${s.text}" into ${r.tokens.length} tokens.` +
      (unknown.length ? ` ${unknown.join(', ')} never appeared in the corpus, so it becomes ${UNK} (ID 0).` : ''),
  });
  steps.push({
    range: { line: LINE.print },
    vars: { ...base(), ids: array(ids), output: text(r.tokens.map((t) => t.token).join(' | ')) },
    note: `Printed: ${model.vocab.length} tokens in the vocabulary, the IDs, and the tokens they stand for.`,
  });
  return { source: 'computed', steps };
}

/** The tokenizer playground: corpus, text and merge count, with the trace for `traceExample`. */
export function bpeExperiment(
  id: string,
  initial: Omit<BpeState, 'selected'>,
  traceExample?: string,
): ExperimentDef<BpeState, BpeResult> {
  return {
    id,
    initial: { ...initial, selected: 0 },
    controls: [
      {
        kind: 'text',
        id: 'corpus',
        label: 'Training corpus',
        maxLength: CORPUS_MAX_LENGTH,
        get: (s) => s.corpus,
        set: (s, v) => ({ ...s, corpus: v }),
      },
      {
        kind: 'slider',
        id: 'merges',
        label: 'Number of merges',
        min: 0,
        max: MAX_MERGES,
        get: (s) => s.numMerges,
        set: (s, v) => ({ ...s, numMerges: v }),
      },
      {
        kind: 'text',
        id: 'text',
        label: 'Text to tokenize',
        maxLength: TEXT_MAX_LENGTH,
        get: (s) => s.text,
        set: (s, v) => ({ ...s, text: v }),
      },
    ],
    compute: computeBpe,
    trace: (s) => buildBpeTrace(s),
    traceExample,
    readout: (s, r) => [
      { label: 'Merges learned', value: `${r.model.merges.length} of ${s.numMerges} requested` },
      { label: 'Vocabulary size', value: `1 [UNK] + ${r.model.base.length} characters + ${r.model.vocab.length - 1 - r.model.base.length} merged = ${r.model.vocab.length}` },
      { label: 'Characters in the text → tokens', value: `${[...s.text.replace(/\s+/gu, '')].length} → ${r.tokens.length}` },
      { label: 'What the program prints', value: r.output },
    ],
  };
}
