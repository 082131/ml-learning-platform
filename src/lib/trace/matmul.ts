import { matmulShape, shapeOf, type Matrix } from '../math/matrix';
import type { Trace, TraceStep, TraceValue } from '../types';
import { array, scalar, text } from './values';

/**
 * The triple loop the step-through walks. Slots are filled from the same A and B the trace is built
 * from (see matmulLoopSlots), so the code shown is the code being traced.
 */
export const MATMUL_LOOP_SOURCE = `A = {{A}}
B = {{B}}
C = [[0] * {{p}} for _ in range({{m}})]
for i in range({{m}}):
    for j in range({{p}}):
        for k in range({{n}}):
            C[i][j] += A[i][k] * B[k][j]
print(C)`;

const LINE = { A: 1, B: 2, C: 3, i: 4, j: 5, k: 6, add: 7, print: 8 } as const;

const pyList = (m: Matrix) => `[${m.map((r) => `[${r.join(', ')}]`).join(', ')}]`;

/** Slot values for MATMUL_LOOP_SOURCE: the matrices as Python lists and the sizes m, n, p. */
export function matmulLoopSlots(A: Matrix, B: Matrix): Record<string, string> {
  const [m, n] = shapeOf(A);
  const [, p] = matmulShape(A, B);
  return { A: pyList(A), B: pyList(B), m: String(m), n: String(n), p: String(p) };
}

/**
 * The sum that produces one entry, with the numbers used: for the lesson's example,
 * C[0][1] = 1·8 + 2·10 + 3·12 = 8 + 20 + 36 = 64.
 */
export function describeEntry(A: Matrix, B: Matrix, i: number, j: number) {
  matmulShape(A, B);
  const n = A[0]!.length;
  const terms = Array.from({ length: n }, (_, k) => ({ a: A[i]![k]!, b: B[k]![j]!, k }));
  const products = terms.map((t) => t.a * t.b);
  const sum = products.reduce((s, x) => s + x, 0);
  const paren = (x: number) => (x < 0 ? `(${x})` : String(x));
  return {
    symbolic: terms.map((t) => `A[${i}][${t.k}]·B[${t.k}][${j}]`).join(' + '),
    numbers: terms.map((t) => `${paren(t.a)}·${paren(t.b)}`).join(' + '),
    products: products.map(paren).join(' + '),
    sum,
  };
}

/**
 * A computed trace of the triple loop for these A and B: the setup lines, each entry of the i and
 * j loops, and every multiply-add (one step per k). The k loop header is shown once per entry.
 */
export function buildMatMulTrace(A: Matrix, B: Matrix): Trace {
  const [m, p] = matmulShape(A, B);
  const n = A[0]!.length;
  const C = Array.from({ length: m }, () => Array<number>(p).fill(0));
  // Python keeps loop variables after their loop ends, so once set, i, j and k stay in scope.
  const loopVars: Record<string, TraceValue> = {};
  const base = () => ({ A: array(A as number[][]), B: array(B as number[][]), C: array(C), ...loopVars });
  const steps: TraceStep[] = [
    {
      range: { line: LINE.A },
      vars: { A: array(A as number[][]) },
      note: `A is a list of ${m} rows with ${n} numbers each: shape (${m}, ${n}).`,
    },
    {
      range: { line: LINE.B },
      vars: { A: array(A as number[][]), B: array(B as number[][]) },
      note: `B has ${n} rows with ${p} numbers each: shape (${n}, ${p}). A's column count (${n}) equals B's row count, so A·B is defined.`,
    },
    {
      range: { line: LINE.C },
      vars: base(),
      note: `C starts as ${m} rows of ${p} zeros: the result has A's rows and B's columns.`,
    },
  ];
  for (let i = 0; i < m; i++) {
    loopVars.i = scalar(i);
    steps.push({
      range: { line: LINE.i },
      vars: base(),
      note: `i = ${i}: fill row ${i} of C. Every entry in it uses row ${i} of A.`,
      highlight: { A: Array.from({ length: n }, (_, k) => [i, k]) },
    });
    for (let j = 0; j < p; j++) {
      loopVars.j = scalar(j);
      steps.push({
        range: { line: LINE.j },
        vars: base(),
        note: `j = ${j}: C[${i}][${j}] will be row ${i} of A times column ${j} of B.`,
        highlight: {
          A: Array.from({ length: n }, (_, k) => [i, k]),
          B: Array.from({ length: n }, (_, k) => [k, j]),
          C: [[i, j]],
        },
      });
      steps.push({
        range: { line: LINE.k },
        vars: base(),
        note: `k runs over the ${n} shared positions (0 to ${n - 1}), one multiply-add each.`,
        highlight: { C: [[i, j]] },
      });
      for (let k = 0; k < n; k++) {
        const a = A[i]![k]!;
        const b = B[k]![j]!;
        const before = C[i]![j]!;
        C[i]![j] = before + a * b;
        loopVars.k = scalar(k);
        steps.push({
          range: { line: LINE.add, startCol: 12, endCol: 40 },
          vars: base(),
          note: `k = ${k}: A[${i}][${k}] · B[${k}][${j}] = ${a} · ${b} = ${a * b}, so C[${i}][${j}] = ${before} + ${a * b} = ${C[i]![j]}.`,
          highlight: { A: [[i, k]], B: [[k, j]], C: [[i, j]] },
        });
      }
    }
  }
  steps.push({
    range: { line: LINE.print },
    vars: { ...base(), output: text(pyList(C)) },
    note: `Done: ${m * p} entries, each a sum of ${n} products, ${m * n * p} multiply-adds in total. print shows C as a list of rows.`,
  });
  return { source: 'computed', steps };
}
