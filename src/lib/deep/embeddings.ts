import { pyFixed, pyListLiteral } from '../linalg/pyFormat';
import { numpyVector } from '../linalg/pyFormat';
import { cosine, dot, norm } from '../math/vector';
import { formatNumber } from '../trace/values';
import { array, scalar, text } from '../trace/values';
import type { ExperimentDef, Trace, TraceStep } from '../types';

/**
 * A toy embedding table for the embeddings lesson. The 2-D vectors are written by hand to make the
 * geometry visible; they are not learned, and real embeddings have hundreds of dimensions.
 */
export type Vec2 = [number, number];

export interface EmbeddingState {
  tokens: string[];
  /** The embedding table E, shape (vocab, 2): row i is the vector of token ID i. */
  E: Vec2[];
  /** Token IDs of the query (a) and the token compared with it (b). */
  a: number;
  b: number;
}

export interface Neighbour {
  id: number;
  cos: number;
}

export interface EmbeddingResult {
  oneHot: number[];
  /** one_hot @ E, which equals E[a]. */
  lookup: number[];
  dot: number;
  normA: number;
  normB: number;
  cos: number;
  /** Every other token, most similar to a first (ties keep ID order). */
  neighbours: Neighbour[];
}

/** The map spans −RANGE..RANGE on both axes; points move in steps of STEP. */
export const RANGE = 5;
export const STEP = 0.5;

export const oneHot = (id: number, size: number) =>
  Array.from({ length: size }, (_, i) => (i === id ? 1 : 0));

/** Row-vector times matrix: Σ_k v_k · E[k][j] for every column j. */
export function vecMat(v: readonly number[], E: readonly (readonly number[])[]): number[] {
  const cols = E[0]?.length ?? 0;
  return Array.from({ length: cols }, (_, j) => v.reduce((sum, x, k) => sum + x * E[k]![j]!, 0) + 0);
}

/** Every other token ranked by cosine similarity to token `a`. */
export function neighbours(E: readonly Vec2[], a: number): Neighbour[] {
  return E.map((v, id) => ({ id, cos: cosine(E[a]!, v) }))
    .filter((n) => n.id !== a)
    .sort((x, y) => y.cos - x.cos || x.id - y.id);
}

export function computeEmbeddings(s: EmbeddingState): EmbeddingResult {
  const A = s.E[s.a]!;
  const B = s.E[s.b]!;
  const hot = oneHot(s.a, s.E.length);
  return {
    oneHot: hot,
    lookup: vecMat(hot, s.E),
    dot: dot(A, B),
    normA: norm(A),
    normB: norm(B),
    cos: cosine(A, B),
    neighbours: neighbours(s.E, s.a),
  };
}

/**
 * Moves token `id` to (x, y), snapped to the grid and kept inside the map. The origin is skipped:
 * a zero vector has no direction, so its cosine similarity is undefined.
 */
export function moveToken(s: EmbeddingState, id: number, x: number, y: number): EmbeddingState {
  const snap = (v: number) => Math.min(RANGE, Math.max(-RANGE, Math.round(v / STEP) * STEP)) + 0;
  const p: Vec2 = [snap(x), snap(y)];
  if (p[0] === 0 && p[1] === 0) return s;
  return { ...s, E: s.E.map((v, i) => (i === id ? p : v)) };
}

const paren = (x: number) => (x < 0 ? `(${formatNumber(x)})` : formatNumber(x));

/** The cosine arithmetic, result first: "0.9899 = 7 / (3.1623 × 2.2361)" and its parts. */
export function describeCosine(A: readonly number[], B: readonly number[]) {
  const d = dot(A, B);
  return {
    dot: `${A.map((x, i) => `${paren(x)}·${paren(B[i]!)}`).join(' + ')} = ${formatNumber(d + 0)}`,
    normA: `√(${A.map((x) => `${paren(x)}²`).join(' + ')}) = √${formatNumber(dot(A, A))} = ${formatNumber(norm(A))}`,
    normB: `√(${B.map((x) => `${paren(x)}²`).join(' + ')}) = √${formatNumber(dot(B, B))} = ${formatNumber(norm(B))}`,
    cos: `${formatNumber(d + 0)} / (${formatNumber(norm(A))} × ${formatNumber(norm(B))}) = ${formatNumber(cosine(A, B))}`,
  };
}

export const tableLiteral = (E: readonly Vec2[]) => `[${E.map((v) => pyListLiteral(v)).join(', ')}]`;

/** True when NumPy would make E a float array (any entry is not a whole number). */
const isFloat = (E: readonly Vec2[]) => E.some((v) => v.some((x) => !Number.isInteger(x)));

/** What the lesson's NumPy program prints (format checked against NumPy 2.5.3 in embeddings.test.ts). */
export function embeddingProgramOutput(s: EmbeddingState, r: EmbeddingResult): string {
  // np.eye(n) is float64, so one_hot @ E is a float array whatever E's dtype.
  return [numpyVector(r.lookup, true), numpyVector(s.E[s.a]!, isFloat(s.E)), pyFixed(r.cos, 4)].join('\n');
}

/** The NumPy program shown, stepped through and printed. */
export const EMBEDDING_SOURCE = `import numpy as np

tokens = {{tokens}}
E = np.array({{E}})
a_id, b_id = {{a}}, {{b}}

one_hot = np.eye(len(tokens))[a_id]
print(one_hot @ E)
print(E[a_id])

a, b = E[a_id], E[b_id]
cos = a @ b / (np.linalg.norm(a) * np.linalg.norm(b))
print(f"{cos:.4f}")`;

const LINE = {
  tokens: 3,
  E: 4,
  ids: 5,
  oneHot: 7,
  matmul: 8,
  lookup: 9,
  ab: 11,
  cos: 12,
  print: 13,
} as const;

export const embeddingSlots = (s: EmbeddingState): Record<string, string> => ({
  tokens: `[${s.tokens.map((t) => `"${t}"`).join(', ')}]`,
  E: tableLiteral(s.E),
  a: String(s.a),
  b: String(s.b),
});

/** A computed trace of EMBEDDING_SOURCE: shapes and values after every line. */
export function buildEmbeddingTrace(s: EmbeddingState, r: EmbeddingResult = computeEmbeddings(s)): Trace {
  const n = s.tokens.length;
  const [ta, tb] = [s.tokens[s.a]!, s.tokens[s.b]!];
  const tokens = text(s.tokens.join(', '));
  const E = array(s.E.map((v) => [...v]));
  const ids = { a_id: scalar(s.a), b_id: scalar(s.b) };
  const A = s.E[s.a]!;
  const B = s.E[s.b]!;
  const c = describeCosine(A, B);
  const steps: TraceStep[] = [
    {
      range: { line: LINE.tokens },
      vars: { tokens },
      note: `The vocabulary: ${n} tokens, IDs 0 to ${n - 1}.`,
    },
    {
      range: { line: LINE.E },
      vars: { tokens, E },
      note: `The embedding table E has one row per token and one column per dimension: shape (${n}, 2).`,
    },
    {
      range: { line: LINE.ids },
      vars: { tokens, E, ...ids },
      note: `a_id = ${s.a} is "${ta}" and b_id = ${s.b} is "${tb}".`,
    },
    {
      range: { line: LINE.oneHot },
      vars: { tokens, E, ...ids, one_hot: array(r.oneHot) },
      note: `np.eye(${n}) is the ${n}×${n} identity matrix; row ${s.a} is the one-hot vector for "${ta}": a 1 at position ${s.a}, zeros elsewhere. Shape (${n},).`,
      highlight: { one_hot: [[s.a]] },
    },
    {
      range: { line: LINE.matmul },
      vars: { tokens, E, ...ids, one_hot: array(r.oneHot), output: text(numpyVector(r.lookup, true)) },
      note: `(${n},) @ (${n}, 2) → (2,). Every product with a 0 vanishes, so the result is row ${s.a} of E: (${r.lookup.map(formatNumber).join(', ')}).`,
      highlight: {
        E: [
          [s.a, 0],
          [s.a, 1],
        ],
      },
    },
    {
      range: { line: LINE.lookup },
      vars: { tokens, E, ...ids, one_hot: array(r.oneHot), output: text(numpyVector(A, isFloat(s.E))) },
      note: 'Indexing the row directly gives the same numbers without multiplying by zeros. This is what an embedding layer does.',
      highlight: {
        E: [
          [s.a, 0],
          [s.a, 1],
        ],
      },
    },
    {
      range: { line: LINE.ab },
      vars: { tokens, E, ...ids, a: array([...A]), b: array([...B]) },
      note: `a = E[${s.a}] = (${A.map(formatNumber).join(', ')}) and b = E[${s.b}] = (${B.map(formatNumber).join(', ')}), shape (2,) each.`,
    },
    {
      range: { line: LINE.cos },
      vars: { tokens, E, ...ids, a: array([...A]), b: array([...B]), cos: scalar(r.cos) },
      note: `a @ b = ${c.dot}; ‖a‖ = ${c.normA}; ‖b‖ = ${c.normB}; cos = ${c.cos}.`,
    },
    {
      range: { line: LINE.print },
      vars: {
        tokens,
        E,
        ...ids,
        a: array([...A]),
        b: array([...B]),
        cos: scalar(r.cos),
        output: text(pyFixed(r.cos, 4)),
      },
      note: `Printed with 4 decimals: ${pyFixed(r.cos, 4)}.`,
    },
  ];
  return { source: 'computed', steps };
}

export function embeddingExperiment(
  id: string,
  initial: EmbeddingState,
  traceExample?: string,
): ExperimentDef<EmbeddingState, EmbeddingResult> {
  const options = (s: EmbeddingState) => s.tokens.map((t, i) => ({ value: String(i), label: `${i}: ${t}` }));
  const opts = options(initial);
  return {
    id,
    initial,
    controls: [
      {
        kind: 'select',
        id: 'a',
        label: 'Query token (a)',
        options: opts,
        get: (s) => String(s.a),
        set: (s, v) => ({ ...s, a: Number(v) }),
      },
      {
        kind: 'select',
        id: 'b',
        label: 'Compare with (b)',
        options: opts,
        get: (s) => String(s.b),
        set: (s, v) => ({ ...s, b: Number(v) }),
      },
    ],
    compute: computeEmbeddings,
    trace: (s) => buildEmbeddingTrace(s),
    traceExample,
    readout: (s, r) => {
      const c = describeCosine(s.E[s.a]!, s.E[s.b]!);
      const top = r.neighbours.slice(0, 3);
      return [
        { label: 'a · b', value: c.dot },
        {
          label: '‖a‖ × ‖b‖',
          value: `${formatNumber(r.normA)} × ${formatNumber(r.normB)} = ${formatNumber(r.normA * r.normB)}`,
        },
        { label: 'cos(a, b)', value: c.cos },
        {
          label: `Nearest to "${s.tokens[s.a]}" by cosine`,
          value: top.map((nb) => `${s.tokens[nb.id]} ${formatNumber(nb.cos)}`).join(', '),
        },
        { label: 'What the program prints', value: embeddingProgramOutput(s, r) },
      ];
    },
  };
}

export type LabelSide = 'ne' | 'nw' | 'se' | 'sw';
const SIDES: LabelSide[] = ['ne', 'nw', 'se', 'sw'];

/**
 * Picks a corner for each point's label (in screen pixels) so that labels avoid the other points and
 * the labels placed before them. Falls back to 'ne' when every corner collides.
 */
export function placeLabels(
  points: readonly (readonly [number, number])[],
  widths: readonly number[],
  height = 14,
  gap = 8,
  dot = 7,
): LabelSide[] {
  type Box = [number, number, number, number];
  const boxOf = ([x, y]: readonly [number, number], w: number, side: LabelSide): Box => {
    const left = side.endsWith('e') ? x + gap : x - gap - w;
    const top = side.startsWith('n') ? y - gap - height : y + gap;
    return [left, top, left + w, top + height];
  };
  const hit = (a: Box, b: Box) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
  const dots: Box[] = points.map(([x, y]) => [x - dot, y - dot, x + dot, y + dot]);
  const placed: Box[] = [];
  return points.map((p, i) => {
    const side =
      SIDES.find((sd) => {
        const box = boxOf(p, widths[i]!, sd);
        return !dots.some((d, j) => j !== i && hit(box, d)) && !placed.some((b) => hit(box, b));
      }) ?? 'ne';
    placed.push(boxOf(p, widths[i]!, side));
    return side;
  });
}
