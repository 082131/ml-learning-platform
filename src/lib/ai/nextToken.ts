import type { ExperimentDef } from '../types';
import { seededRandom } from '../classical/random';

/**
 * A word-level bigram language model trained on the Lumen help center, used to show next-token
 * prediction, temperature and top-p sampling with real numbers. A transformer conditions on the whole
 * context instead of one previous word, but it samples its next token the same way.
 */

export type Bigram = ReadonlyMap<string, ReadonlyMap<string, number>>;

/** Lowercase words, with . , : ; ? as their own tokens. */
export function wordTokens(text: string): string[] {
  return text.toLowerCase().match(/[a-z0-9$%'’-]+|[.,:;?]/g) ?? [];
}

export function trainBigram(texts: readonly string[]): Bigram {
  const counts = new Map<string, Map<string, number>>();
  for (const text of texts) {
    const toks = wordTokens(text);
    for (let i = 0; i + 1 < toks.length; i++) {
      const row = counts.get(toks[i]!) ?? new Map<string, number>();
      row.set(toks[i + 1]!, (row.get(toks[i + 1]!) ?? 0) + 1);
      counts.set(toks[i]!, row);
    }
  }
  return counts;
}

export interface Candidate {
  token: string;
  count: number;
  /** log(count): the model's score before softmax. */
  logit: number;
  /** softmax(logit / T) over all candidates. */
  prob: number;
  /** Inside the top-p set. */
  kept: boolean;
  /** Probability after top-p renormalization (0 if cut). */
  sampleProb: number;
}

/** softmax(logits / T). T = 0 means greedy: all probability on the largest logit (first one on ties). */
export function softmaxT(logits: readonly number[], temperature: number): number[] {
  if (logits.length === 0) return [];
  if (temperature === 0) {
    const best = logits.indexOf(Math.max(...logits));
    return logits.map((_, i) => (i === best ? 1 : 0));
  }
  const scaled = logits.map((l) => l / temperature);
  const m = Math.max(...scaled);
  const e = scaled.map((x) => Math.exp(x - m));
  const z = e.reduce((a, b) => a + b, 0);
  return e.map((x) => x / z);
}

/**
 * The smallest set of the most likely tokens whose probabilities add up to at least p (nucleus sampling).
 * Returns a keep flag per index. Ties keep their input order.
 */
export function topPMask(probs: readonly number[], p: number): boolean[] {
  const order = probs.map((pr, i) => ({ pr, i })).sort((a, b) => b.pr - a.pr || a.i - b.i);
  const keep = probs.map(() => false);
  let total = 0;
  for (const { pr, i } of order) {
    keep[i] = true;
    total += pr;
    if (total >= p - 1e-12) break;
  }
  return keep;
}

/** The next-token distribution after `prev`, sorted by count (ties alphabetically). */
export function candidates(model: Bigram, prev: string, temperature: number, topP: number): Candidate[] {
  const row = [...(model.get(prev) ?? new Map<string, number>())].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  );
  const logits = row.map(([, c]) => Math.log(c));
  const probs = softmaxT(logits, temperature);
  const keep = topPMask(probs, topP);
  const keptMass = probs.reduce((a, p, i) => a + (keep[i] ? p : 0), 0);
  return row.map(([token, count], i) => ({
    token,
    count,
    logit: logits[i]!,
    prob: probs[i]!,
    kept: keep[i]!,
    sampleProb: keep[i] ? probs[i]! / keptMass : 0,
  }));
}

/** Picks an index with probability proportional to `probs`, using one uniform draw r in [0, 1). */
export function sampleIndex(probs: readonly number[], r: number): number {
  let acc = 0;
  for (let i = 0; i < probs.length; i++) {
    acc += probs[i]!;
    if (r < acc) return i;
  }
  return probs.findLastIndex((p) => p > 0);
}

export interface GenStep {
  prev: string;
  token: string;
  /** Probability of the chosen token after temperature and top-p. */
  prob: number;
  /** How many tokens were allowed by top-p at this step. */
  choices: number;
}

export function generate(
  model: Bigram,
  start: string,
  steps: number,
  temperature: number,
  topP: number,
  seed: number,
): GenStep[] {
  const rand = seededRandom(seed);
  const out: GenStep[] = [];
  let prev = start;
  for (let i = 0; i < steps; i++) {
    const c = candidates(model, prev, temperature, topP);
    if (c.length === 0) break;
    const r = rand();
    const k = sampleIndex(
      c.map((x) => x.sampleProb),
      r,
    );
    out.push({ prev, token: c[k]!.token, prob: c[k]!.sampleProb, choices: c.filter((x) => x.kept).length });
    prev = c[k]!.token;
  }
  return out;
}

/** Joins word tokens back into text, without a space before punctuation. */
export function detokenize(tokens: readonly string[]): string {
  return tokens.reduce((s, t) => (s === '' ? t : /^[.,:;?]$/.test(t) ? s + t : `${s} ${t}`), '');
}

export interface NextTokenState {
  start: string;
  temperature: number;
  topP: number;
  seed: number;
}

export interface NextTokenResult {
  /** The distribution for the first generated token. */
  first: Candidate[];
  steps: GenStep[];
  text: string;
}

export const GEN_STEPS = 14;
export const START_WORDS = ['error', 'your', 'the', 'notes'] as const;

export function nextTokenExperiment(
  id: string,
  model: Bigram,
  initial: NextTokenState,
): ExperimentDef<NextTokenState, NextTokenResult> {
  return {
    id,
    initial,
    controls: [
      {
        kind: 'select',
        id: 'start',
        label: 'First word',
        options: START_WORDS.map((w) => ({ value: w, label: w })),
        get: (s) => s.start,
        set: (s, v) => ({ ...s, start: v }),
      },
      {
        kind: 'slider',
        id: 'temperature',
        label: 'Temperature',
        min: 0,
        max: 2,
        step: 0.1,
        format: (v) => (v === 0 ? '0 (greedy)' : v.toFixed(1)),
        get: (s) => s.temperature,
        set: (s, v) => ({ ...s, temperature: Math.round(v * 10) / 10 }),
      },
      {
        kind: 'slider',
        id: 'topP',
        label: 'Top-p',
        min: 0.1,
        max: 1,
        step: 0.05,
        format: (v) => v.toFixed(2),
        get: (s) => s.topP,
        set: (s, v) => ({ ...s, topP: Math.round(v * 100) / 100 }),
      },
      {
        kind: 'number',
        id: 'seed',
        label: 'Random seed',
        min: 1,
        max: 99,
        get: (s) => s.seed,
        set: (s, v) => ({ ...s, seed: Math.min(99, Math.max(1, Math.round(v))) }),
      },
    ],
    compute: (s) => {
      const steps = generate(model, s.start, GEN_STEPS, s.temperature, s.topP, s.seed);
      return {
        first: candidates(model, s.start, s.temperature, s.topP),
        steps,
        text: detokenize([s.start, ...steps.map((x) => x.token)]),
      };
    },
    readout: (s, r) => {
      const kept = r.first.filter((c) => c.kept);
      return [
        { label: `Words seen after “${s.start}”`, value: String(r.first.length) },
        { label: 'Allowed by top-p', value: `${kept.length} of ${r.first.length}` },
        {
          label: 'Most likely next word',
          value: `“${r.first[0]?.token}” (${((r.first[0]?.prob ?? 0) * 100).toFixed(1)}%)`,
        },
        { label: 'Generated', value: r.text },
      ];
    },
  };
}
